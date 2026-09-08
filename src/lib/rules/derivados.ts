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
  type ModificadorConFuente,
} from "./modificadores";
import { especiePorId } from "../catalog/especies";
import { equipoPorId } from "../catalog/equipo";
import { modificadoresDeEquipo } from "./equipo";
import type { Sheet } from "./sheet";

// Los modificadores activos de una ficha: especie y equipo por ahora; cuando
// existan dotes, aumentos y estados, se añaden aquí y todo lo demás sigue
// funcionando sin tocarse.
export function modificadoresActivos(sheet: Sheet): ModificadorConFuente[] {
  const especie = especiePorId(sheet.especieId);
  const deEspecie: ModificadorConFuente[] = especie
    ? especie.modificadores.map((m) => ({
        ...m,
        origen: "especie" as const,
        fuente: especie.label,
      }))
    : [];
  return [...deEspecie, ...modificadoresDeEquipo(sheet)];
}

// Una línea de un desglose: de dónde sale parte de un número, y cuánto aporta.
export type Fuente = { etiqueta: string; valor: number };

// Atributo tal y como se usa en juego: lo comprado más lo que aporten las
// fuentes externas. OJO: el point-buy de creación trabaja siempre con los
// valores COMPRADOS (sheet.atributos), nunca con estos.
export function atributoEfectivo(
  sheet: Sheet,
  id: AtributoId,
  mods = modificadoresActivos(sheet),
): number {
  return sheet.atributos[id] + bonoAtributo(mods, id);
}

export function atributosEfectivos(
  sheet: Sheet,
  mods = modificadoresActivos(sheet),
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
  mods = modificadoresActivos(sheet),
): { total: number; fuentes: Fuente[] } {
  const fuentes: Fuente[] = [
    { etiqueta: "Base", valor: sheet.atributos[id] },
    ...mods
      .filter((m) => m.tipo === "atributo" && m.id === id)
      .map((m) => ({ etiqueta: m.fuente, valor: m.valor })),
  ];
  return { total: fuentes.reduce((t, f) => t + f.valor, 0), fuentes };
}

export function aplicado(
  sheet: Sheet,
  id: AplicadoId,
  mods = modificadoresActivos(sheet),
): number {
  const def = APLICADOS.find((a) => a.id === id)!;
  return (
    atributoEfectivo(sheet, def.de[0], mods) + atributoEfectivo(sheet, def.de[1], mods)
  );
}

// Desglose de un aplicado: los dos básicos que lo alimentan, ya con sus
// propios modificadores incluidos (no se repiten aquí, cada básico se
// desglosa a su vez con desgloseAtributo si hace falta bajar un nivel más).
export function desgloseAplicado(
  sheet: Sheet,
  id: AplicadoId,
  mods = modificadoresActivos(sheet),
): { total: number; fuentes: Fuente[] } {
  const def = APLICADOS.find((a) => a.id === id)!;
  const fuentes: Fuente[] = def.de.map((atrId) => ({
    etiqueta: ATRIBUTOS.find((a) => a.id === atrId)!.label,
    valor: atributoEfectivo(sheet, atrId, mods),
  }));
  return { total: fuentes[0].valor + fuentes[1].valor, fuentes };
}

export function aplicados(
  sheet: Sheet,
  mods = modificadoresActivos(sheet),
): Record<AplicadoId, number> {
  const efectivos = atributosEfectivos(sheet, mods);
  return Object.fromEntries(
    APLICADOS.map((a) => [a.id, efectivos[a.de[0]] + efectivos[a.de[1]]]),
  ) as Record<AplicadoId, number>;
}

export function salud(
  sheet: Sheet,
  mods = modificadoresActivos(sheet),
): { vida: number; fatiga: number } {
  return {
    vida: 8 + aplicado(sheet, "fortaleza", mods) + bonoDerivado(mods, "vida"),
    fatiga: 8 + aplicado(sheet, "voluntad", mods) + bonoDerivado(mods, "fatiga"),
  };
}

// El exoesqueleto "duplica el bonificador al calcular la carga transportable
// y realizar proezas de fuerza" (docs/equipamiento.md), pero no toca Fuerza
// en general ni Fortaleza/Vida (ver catalog/equipo.ts). Supuesto S10 de
// docs/sistema.md: las 5 fórmulas de movimiento cuentan como "proezas de
// fuerza", pendiente de confirmar con Murillo — por eso vive aquí, aparte
// del sistema de modificadores normal, y no contamina Potencia en ningún
// otro sitio (combate, ficha de atributos).
function bonoExoesqueletoParaMovimiento(sheet: Sheet): number {
  for (const pieza of sheet.equipo) {
    const cat = equipoPorId(pieza.catalogoId);
    if (cat?.familia === "movimiento" && cat.tope === "exoesqueleto" && pieza.nivel) {
      return pieza.nivel * 2; // nivel N da +N a la Fuerza; aquí cuenta doble
    }
  }
  return 0;
}

// Movimiento: todas las fórmulas cuelgan de Potencia + Atletismo.
// Con Potencia 0 y Atletismo sin entrenar (−1) la base es negativa y el salto
// vertical saldría en negativo, así que se corta en 0. Supuesto S6 de
// docs/sistema.md: el documento no dice qué pasa por debajo de cero.
export function movimiento(sheet: Sheet, mods = modificadoresActivos(sheet)) {
  const bonoExoesqueleto = bonoExoesqueletoParaMovimiento(sheet);
  const base =
    aplicado(sheet, "potencia", mods) +
    bonoExoesqueleto +
    sheet.habilidades.atletismo.valor +
    bonoHabilidad(mods, "atletismo");
  const noNegativo = (n: number) => Math.max(0, n);
  return {
    // >0 si un exoesqueleto está afectando a las cinco fórmulas de abajo —
    // la ficha lo usa para señalarlo (ver ResumenTab).
    bonoExoesqueleto,
    carrera: noNegativo(15 + base + bonoDerivado(mods, "carrera")), // metros
    saltoVertical: noNegativo(10 * base), // centímetros
    saltoHorizontal: noNegativo(150 + base * 60), // centímetros
    escalada: noNegativo(5 + Math.floor(base / 2)), // metros
    nado: noNegativo(5 + Math.floor(base / 2)), // metros
  };
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
export function valorEfectivo(
  sheet: Sheet,
  id: HabilidadId,
  enEspecialidad: boolean,
  mods = modificadoresActivos(sheet),
): number {
  const { valor } = sheet.habilidades[id];
  const bono = bonoHabilidad(mods, id);
  if (valor < HABILIDAD_MIN_ENTRENADA) return HABILIDAD_NO_ENTRENADA + bono;
  return (enEspecialidad ? valor : Math.ceil(valor / 2)) + bono;
}
