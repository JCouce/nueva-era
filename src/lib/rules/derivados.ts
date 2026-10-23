// Todo lo que se calcula y nunca se guarda: atributos efectivos, aplicados,
// salud, movimiento y el valor efectivo de una habilidad.
// Fuente: docs/sistema.md §2, §4 y §5.
import { APLICADOS, ATRIBUTOS, type AplicadoId, type AtributoId } from "./atributos";
import {
  HABILIDAD_MIN_ENTRENADA,
  HABILIDAD_NO_ENTRENADA,
  type HabilidadId,
} from "./habilidades";
import {
  bonoAtributo,
  bonoDerivado,
  bonoHabilidad,
  factorVida,
  type ModificadorConFuente,
} from "./modificadores";
import { especieDeFicha } from "./especie";
import type { FormulaMovimiento } from "./formulaMovimiento";
import { equipoPorId } from "../catalog/equipo";
import { modificadoresDeEquipo } from "./equipo";
import { modificadoresDeAumentos } from "./aumentos";
import type { Sheet } from "./sheet";
import { admiteEspecialidades } from "../catalog/especialidades";

// Los modificadores activos de una ficha: especie (con casta y linaje), equipo y aumentos
// (A1: sus efectos permanentes). Las dotes las suma resolverFicha. Las pantallas no lo llaman: leen FichaResuelta.modificadores
// (fichaResuelta.ts), que además lleva los estados de combate. Los derivados de abajo
// reciben `mods` siempre explícito: sin valor por defecto, ningún recálculo escondido.
export function modificadoresActivos(sheet: Sheet): ModificadorConFuente[] {
  const deEspecie = especieDeFicha(sheet)?.modificadores ?? [];
  return [...deEspecie, ...modificadoresDeEquipo(sheet), ...modificadoresDeAumentos(sheet)];
}

// Una línea de un desglose: de dónde sale parte de un número, y cuánto aporta.
export type Fuente = { etiqueta: string; valor: number };

// Atributo tal y como se usa en juego: lo comprado más lo que aporten las
// fuentes externas. OJO: el point-buy de creación trabaja siempre con los
// valores COMPRADOS (sheet.atributos), nunca con estos.
export function atributoEfectivo(
  sheet: Sheet,
  id: AtributoId,
  mods: ModificadorConFuente[],
): number {
  return sheet.atributos[id] + bonoAtributo(mods, id);
}

export function atributosEfectivos(
  sheet: Sheet,
  mods: ModificadorConFuente[],
): Record<AtributoId, number> {
  return Object.fromEntries(
    ATRIBUTOS.map((a) => [a.id, sheet.atributos[a.id] + bonoAtributo(mods, a.id)]),
  ) as Record<AtributoId, number>;
}

// Desglose de un atributo básico: la base comprada más cada modificador
// activo que le toque, con su procedencia. Pensado para que la ficha explique
// de dónde sale un número en vez de mostrar un total opaco — pieza central,
// porque fatiga, estados, dotes y equipo irán apareciendo aquí igual que hoy
// lo hace la especie.
export function desgloseAtributo(
  sheet: Sheet,
  id: AtributoId,
  mods: ModificadorConFuente[],
): { total: number; fuentes: Fuente[] } {
  const fuentes: Fuente[] = [
    { etiqueta: "Base", valor: sheet.atributos[id] },
    ...mods
      .filter((m) => m.tipo === "atributo" && m.id === id)
      .map((m) => ({ etiqueta: m.fuente, valor: m.valor })),
  ];
  return { total: fuentes.reduce((t, f) => t + f.valor, 0), fuentes };
}

// HOJA2: un Aplicado es la media de sus dos básicos, no la suma — redondeo
// hacia arriba (S11, decisión del usuario: mismo criterio que ya usaba el
// motor para habilidades fuera de especialidad).
function media(a: number, b: number): number {
  // `|| 0` normaliza el -0 que da Math.ceil(-0.5): mismo valor, pero
  // Object.is(-0, 0) es false y eso confunde a assert.strict más adelante.
  return Math.ceil((a + b) / 2) || 0;
}

export function aplicado(
  sheet: Sheet,
  id: AplicadoId,
  mods: ModificadorConFuente[],
): number {
  const def = APLICADOS.find((a) => a.id === id)!;
  return media(
    atributoEfectivo(sheet, def.de[0], mods),
    atributoEfectivo(sheet, def.de[1], mods),
  );
}

// Desglose de un aplicado: los dos básicos que lo alimentan, ya con sus
// propios modificadores incluidos (no se repiten aquí, cada básico se
// desglosa a su vez con desgloseAtributo si hace falta bajar un nivel más).
// OJO: `total` es la MEDIA de las dos fuentes, no su suma — el desglose lista
// los dos básicos tal cual para que se vea de dónde sale, no para que sumen.
export function desgloseAplicado(
  sheet: Sheet,
  id: AplicadoId,
  mods: ModificadorConFuente[],
): { total: number; fuentes: Fuente[] } {
  const def = APLICADOS.find((a) => a.id === id)!;
  const fuentes: Fuente[] = def.de.map((atrId) => ({
    etiqueta: ATRIBUTOS.find((a) => a.id === atrId)!.label,
    valor: atributoEfectivo(sheet, atrId, mods),
  }));
  return { total: media(fuentes[0].valor, fuentes[1].valor), fuentes };
}

export function aplicados(
  sheet: Sheet,
  mods: ModificadorConFuente[],
): Record<AplicadoId, number> {
  const efectivos = atributosEfectivos(sheet, mods);
  return Object.fromEntries(
    APLICADOS.map((a) => [a.id, media(efectivos[a.de[0]], efectivos[a.de[1]])]),
  ) as Record<AplicadoId, number>;
}

// Vida con Hipertrofia (A1, §11.3 tercera ronda): la Fortaleza positiva se multiplica
// por el factor y se redondea hacia abajo; con Fortaleza 0 o negativa no se multiplica.
function fortalezaParaVida(fortaleza: number, factor: number): number {
  return fortaleza > 0 ? Math.floor(fortaleza * factor) : fortaleza;
}

export function salud(
  sheet: Sheet,
  mods: ModificadorConFuente[],
): { vida: number; fatiga: number } {
  return {
    vida: 10 + fortalezaParaVida(aplicado(sheet, "fortaleza", mods), factorVida(mods)) + bonoDerivado(mods, "vida"),
    fatiga: 10 + aplicado(sheet, "voluntad", mods) + bonoDerivado(mods, "fatiga"),
  };
}

// Percepción pasiva: la dificultad contra la que tira el sigilo ajeno
// (docs/sistema.md §6, antes bloqueada por el conflicto C4 — Exploración no
// estaba entre las 10 habilidades hasta que sustituyó a Supervivencia).
// Se usa el valor entero de la habilidad, no la mitad fuera de especialidad:
// es tu estado de alerta permanente, no una tirada declarada en un contexto.
export function alerta(sheet: Sheet, mods: ModificadorConFuente[]): number {
  return (
    6 +
    aplicado(sheet, "perspicacia", mods) +
    valorEfectivo(sheet, "exploracion", true, mods) +
    bonoDerivado(mods, "alerta")
  );
}

// El exoesqueleto "duplica el bonificador al calcular la carga transportable
// y realizar proezas de fuerza" (docs/equipamiento.md) — cita completa: las
// dos cosas que menciona EQUIP. No toca Fuerza en general ni Fortaleza/Vida
// (ver catalog/equipo.ts). Supuesto S10 de docs/sistema.md: las 5 fórmulas de
// movimiento cuentan como "proezas de fuerza", pendiente de confirmar con
// Murillo. La usan movimiento() y cargaMaxima() — por eso vive aparte del
// sistema de modificadores normal, y no contamina Potencia/Fuerza en ningún
// otro sitio (combate, ficha de atributos).
function bonoFuerzaExoesqueleto(sheet: Sheet): number {
  for (const pieza of sheet.equipo) {
    const cat = equipoPorId(pieza.catalogoId);
    if (cat?.familia === "movimiento" && cat.tope === "exoesqueleto" && pieza.nivel) {
      return pieza.nivel * 2; // nivel N da +N a la Fuerza; aquí cuenta doble
    }
  }
  return 0;
}

// Movimiento: todas las fórmulas cuelgan de Potencia + Atletismo.
// Con Potencia 0 y Atletismo sin entrenar (−1) la base es negativa y las
// fórmulas saldrían en negativo, así que se cortan en 0 — salvo el salto
// vertical, que Murillo fija en un mínimo de 15 cm (resuelve la pregunta 6
// de docs/sistema.md, antes supuesto S6).
//
// `formula`: las constantes que cambia la especie (Arköru, Arianyi, §14.7), ya
// resueltas en la FichaResuelta; FORMULA_MOVIMIENTO_GENERAL sin especie. Los +N
// de especie (Zimethroni) llegan como Modificador "derivado" y se suman DESPUÉS
// del mínimo o del corte en 0 (decisión del usuario 2026-10-13: salto vertical
// con base 0 = 15 + 200). La carrera los suma dentro del corte, como antes de E3:
// con 16 + base no se llega a cortar en ninguna ficha posible.
export function movimiento(sheet: Sheet, mods: ModificadorConFuente[], formula: FormulaMovimiento) {
  const bonoExoesqueleto = bonoFuerzaExoesqueleto(sheet);
  const base =
    aplicado(sheet, "potencia", mods) +
    bonoExoesqueleto +
    sheet.habilidades.atletismo.valor +
    bonoHabilidad(mods, "atletismo");
  const noNegativo = (n: number) => Math.max(0, n);
  return {
    // >0 si un exoesqueleto está afectando a las cinco fórmulas de abajo —
    // la ficha lo usa para señalarlo (ver personaje/EstadoPanel).
    bonoExoesqueleto,
    carrera: noNegativo(16 + base + bonoDerivado(mods, "carrera")), // metros
    saltoVertical: Math.max(15, formula.saltoVerticalPorPunto * base) + bonoDerivado(mods, "saltoVertical"), // cm
    saltoHorizontal: noNegativo(100 + base * formula.saltoHorizontalPorPunto) + bonoDerivado(mods, "saltoHorizontal"), // cm
    escalada: noNegativo(formula.escaladaBase + Math.floor(base / 2)) + bonoDerivado(mods, "escalada"), // metros
    nado: noNegativo(formula.nadoBase + Math.floor(base / 2)) + bonoDerivado(mods, "nado"), // metros
  };
}

// Carga transportable (docs/sistema.md §5.5, HOJA2, resuelve la pregunta 26).
// Sale de Fuerza, no de Potencia — a diferencia del movimiento, no entra
// Atletismo. Tres tramos:
//   Fuerza > 0 → Fuerza × 20 kg
//   Fuerza = 0 → 15 kg (caso especial, no sigue el ×20)
//   Fuerza < 0 → 15 − 5 por cada punto por debajo de 0
// El bono duplicado del exoesqueleto (bonoFuerzaExoesqueleto) entra aquí
// también: EQUIP lo cita para "carga transportable Y proezas de fuerza", las
// dos cosas — hasta ahora solo se aplicaba a movimiento() (las proezas, por
// S10), cerrando el hueco.
// `multiplicador`: el de especie sobre el total (Arköru × 1,2, §14.7), ya resuelto
// en la FichaResuelta; 1 sin especie. Con × 1,2 todos los tramos dan entero
// (Fuerza × 24, 18, 12, 6, 0), así que no se redondea.
export function cargaMaxima(sheet: Sheet, mods: ModificadorConFuente[], multiplicador: number): number {
  const fuerza = atributoEfectivo(sheet, "fuerza", mods) + bonoFuerzaExoesqueleto(sheet);
  if (fuerza > 0) return fuerza * 20 * multiplicador;
  if (fuerza === 0) return 15 * multiplicador;
  // Suelo en 0, mismo criterio que S6 para el movimiento: el documento no
  // dice qué pasa si esta cuenta también se va a negativo.
  return Math.max(0, 15 + fuerza * 5) * multiplicador;
}

// Vuelo: solo existe si hay Movilidad Aérea equipada. A diferencia del resto
// de movimiento, no sale de una fórmula (Potencia + Atletismo): es un dato
// del catálogo, propio del nivel de propulsor instalado (ver
// docs/equipamiento.md, Movilidad Aérea).
export function vuelo(sheet: Sheet): { velocidadM: number; nivel: number } | null {
  for (const pieza of sheet.equipo) {
    const cat = equipoPorId(pieza.catalogoId);
    if (cat?.familia !== "movimiento" || cat.tope !== "movilidadAerea") continue;
    const nivelInfo = cat.niveles.find((n) => n.nivel === pieza.nivel);
    if (nivelInfo?.velocidadM === undefined) continue;
    return { velocidadM: nivelInfo.velocidadM, nivel: nivelInfo.nivel };
  }
  return null;
}

// Valor efectivo de una habilidad: total en su especialidad, la mitad hacia
// arriba fuera de ella. Sin entrenar es -1 siempre, aunque los modificadores
// externos sí se suman encima.
//
// Una habilidad sin especialidades en la fuente (Interpretación, Sigilo) va siempre
// entera: no hay "resto" fuera de especialidad (supuesto S39, docs/sistema.md).
// S39, confirmado por el usuario; si el diseñador quiere la mitad, fuera esta rama.
export function valorEfectivo(
  sheet: Sheet,
  id: HabilidadId,
  enEspecialidad: boolean,
  mods: ModificadorConFuente[],
): number {
  const { valor } = sheet.habilidades[id];
  const bono = bonoHabilidad(mods, id);
  if (valor < HABILIDAD_MIN_ENTRENADA) return HABILIDAD_NO_ENTRENADA + bono;
  const entera = enEspecialidad || !admiteEspecialidades(id);
  return (entera ? valor : Math.ceil(valor / 2)) + bono;
}
