// La especie de una ficha, sin UI (docs/sistema.md §14, propuesta-especies §2.2 y §3).
//
//   especieDeFicha  elección guardada (especie + casta + linaje) → efectos resueltos
//   elegirEspecie   cambiar la elección: valida, bloquea si está aprobada y aplica
//                   el reset de §14.3. La pantalla y el servidor solo aplican lo
//                   que devuelve.
//   hayQuePerder    decide si hay que avisar antes de cambiar
//   hayQueAvisar    lo mismo con el contexto: solo avisa si el cambio resetearía
//   elegirAtributoLibre / bloqueoDeAtributoLibre / faltaAtributoLibre
//                   el +1 de libre elección (Humanos): aparte de la especie, sin reset
//   eleccionCompleta / faltaEnEleccion / eleccionDeFicha / eleccionesIguales
//                   el borrador del selector: no se llama a la action a medias
//   rangoReferencia peso y altura de referencia con la Fuerza con especie (§14.5)
//   ajustesDeCoste  los rasgos de coste (§14.6) → el AjusteCoste que reciben
//                   creacion.ts, psionica.ts y progresion.ts
//   bolsaDeAumentos los créditos aparte para aumentos (Humanos), o null
//   excepcionesRareza las piezas que la especie compra sin tope de rareza (kerzul)
//   formulaMovimientoDeEspecie / multiplicadorCargaDeEspecie / armaduraNaturalDeEspecie
//                   los derivados que cambian de fórmula con la especie (§14.7),
//                   con la fuente de cada cambio para las notas de Estado
//   casillasDeEspecie / textosDeEspecie / ajusteUmbralesDeEspecie
//                   lo que la especie pone en las tiradas (§14.8, E4): casillas al
//                   mismo índice que las del equipo, notas fijas y el tramo menos de
//                   penalizador por umbral
//   peajeNeurologicoDeEspecie / notasFarmacosDeEspecie / accionesSinDadoDeEspecie
//                   otras áreas (§14.9, E5): el peaje al usar un poder (lo lee
//                   usarPoder), la nota fija de los fármacos y las acciones sin dado
//
// Mismo patrón que usoPoder.ts: entrada explícita, nada se lee de fuera salvo el
// catálogo, y el resultado se aplica tal cual.
import {
  especiePorId,
  normalizarOpciones,
  rasgoDeAtributos,
  type Especie,
  type EspecieOpciones,
  type ExcepcionRareza,
  type OpcionEspecie,
  type ReferenciaFisica,
  type Rasgo,
} from "../catalog/especies";
import type { ModificadorConFuente } from "./modificadores";
import { creditosDeLaLetra } from "./prioridad";
import { AJUSTE_NEUTRO, type AjusteCoste } from "./progresion";
import { defaultSheet, type Sheet } from "./sheet";
import { FORMULA_MOVIMIENTO_GENERAL, type FormulaMovimiento } from "./formulaMovimiento";
import { SIN_ARMADURA_NATURAL, type ArmaduraNatural } from "./blindaje";
import type { HabilidadId } from "./habilidades";
import type { CondicionTirada } from "./condiciones";
import { SIN_AJUSTE_UMBRALES, type AjusteUmbral, type AjusteUmbrales } from "./estados";
import type { DestinoTexto } from "../catalog/especies";
import type { AccionDirecta } from "./acciones";
import { ATRIBUTOS, type AtributoId } from "./atributos";

export type RasgoConFuente = Rasgo & { fuente: string };

export type EspecieResuelta = {
  especie: Especie;
  casta: OpcionEspecie | null;
  linaje: OpcionEspecie | null;
  // Especie, casta, linaje y atributo libre, en ese orden, cada uno con su fuente
  // para el desglose.
  modificadores: ModificadorConFuente[];
  rasgos: RasgoConFuente[];
  referencia: ReferenciaFisica | null; // la de la casta si la hay
};

export function especieDeFicha(sheet: Pick<Sheet, "especieId" | "especieOpciones">): EspecieResuelta | null {
  const especie = especiePorId(sheet.especieId);
  if (!especie) return null;
  const opciones = normalizarOpciones(especie.id, sheet.especieOpciones);
  const casta = especie.castas?.find((c) => c.id === opciones.casta) ?? null;
  const linaje = especie.linajes?.opciones.find((l) => l.id === opciones.linaje) ?? null;

  const capas: { fuente: string; rasgos: Rasgo[] }[] = [
    { fuente: especie.label, rasgos: especie.rasgos },
    ...(casta ? [{ fuente: casta.fuente, rasgos: casta.rasgos }] : []),
    ...(linaje ? [{ fuente: linaje.fuente, rasgos: linaje.rasgos }] : []),
    ...(especie.atributoLibre && opciones.atributo
      ? [{ fuente: `${especie.label} · libre elección`, rasgos: [rasgoDeAtributos({ [opciones.atributo]: especie.atributoLibre })] }]
      : []),
  ];
  const rasgos = capas.flatMap(({ fuente, rasgos }) => rasgos.map((r) => ({ ...r, fuente })));
  const modificadores: ModificadorConFuente[] = rasgos.flatMap((r) =>
    (r.modificadores ?? []).map((m) => ({ ...m, origen: "especie" as const, fuente: r.fuente })),
  );
  return {
    especie,
    casta,
    linaje,
    modificadores,
    rasgos,
    referencia: casta?.referencia ?? especie.referencia,
  };
}

export type EleccionEspecie = {
  especieId: string | null;
  casta?: string | null;
  linaje?: string | null;
};

export type ContextoEleccion = {
  aprobada: boolean;
  esMaster: boolean;
  // Editor de NPC del máster: sin reset y sin bloqueo por aprobación (§14.3).
  libre: boolean;
};

export type ResultadoEleccion = { sheet: Sheet; reseteada: boolean } | { error: string };

function validarEleccion(eleccion: EleccionEspecie): { especieId: string | null; opciones: EspecieOpciones } | { error: string } {
  const casta = eleccion.casta ?? null;
  const linaje = eleccion.linaje ?? null;
  if (eleccion.especieId === null) {
    if (casta || linaje) return { error: "Sin especie no hay casta ni linaje" };
    return { especieId: null, opciones: {} };
  }
  const especie = especiePorId(eleccion.especieId);
  if (!especie) return { error: "Especie desconocida" };

  if (!especie.castas) {
    if (casta || linaje) return { error: `${especie.label} no tiene casta ni linaje` };
    return { especieId: especie.id, opciones: {} };
  }
  if (!casta) return { error: `${especie.label}: elige casta` };
  const opcionCasta = especie.castas.find((c) => c.id === casta);
  if (!opcionCasta) return { error: "Casta desconocida" };

  const linajes = especie.linajes;
  if (!linajes || linajes.casta !== opcionCasta.id) {
    if (linaje) return { error: `La casta ${opcionCasta.label} no tiene linaje` };
    return { especieId: especie.id, opciones: { casta: opcionCasta.id } };
  }
  if (!linaje) return { error: `${opcionCasta.label}: elige linaje` };
  const opcionLinaje = linajes.opciones.find((l) => l.id === linaje);
  if (!opcionLinaje) return { error: "Linaje desconocido" };
  return { especieId: especie.id, opciones: { casta: opcionCasta.id, linaje: opcionLinaje.id } };
}

const mismaEleccion = (sheet: Sheet, especieId: string | null, opciones: EspecieOpciones) =>
  sheet.especieId === especieId &&
  sheet.especieOpciones.casta === opciones.casta &&
  sheet.especieOpciones.linaje === opciones.linaje;

// Lo que sobrevive al reset (§14.3): la pestaña Personaje. El nombre vive en
// Character.name, fuera de la ficha. Lo demás vuelve a defaultSheet(), con vida
// y fatiga actuales en el centinela de máximo (parseSheet lo recorta).
function resetear(sheet: Sheet, especieId: string | null, opciones: EspecieOpciones): Sheet {
  return {
    ...defaultSheet(),
    edad: sheet.edad,
    altura: sheet.altura,
    peso: sheet.peso,
    trasfondo: sheet.trasfondo,
    motivacion: sheet.motivacion,
    prioridades: { ...sheet.prioridades },
    especieId,
    especieOpciones: opciones,
  };
}

// Reset general de las fichas de producción al desplegar especies (§14.3): el mismo
// reset que al cambiar de especie, conservando la elección que ya tenga la ficha.
export function resetearFicha(sheet: Sheet): Sheet {
  return resetear(sheet, sheet.especieId, sheet.especieOpciones);
}

// Por qué no se puede cambiar la especie, o null si se puede. La pantalla lo pinta
// junto al selector deshabilitado; elegirEspecie devuelve el mismo texto.
export function bloqueoDeEspecie(ctx: ContextoEleccion): string | null {
  if (ctx.libre || !ctx.aprobada || ctx.esMaster) return null;
  return "La ficha está aprobada: la especie ya no se puede cambiar";
}

export function elegirEspecie(sheet: Sheet, eleccion: EleccionEspecie, ctx: ContextoEleccion): ResultadoEleccion {
  const valida = validarEleccion(eleccion);
  if ("error" in valida) return valida;
  const { especieId, opciones } = valida;

  if (mismaEleccion(sheet, especieId, opciones)) return { sheet, reseteada: false };
  if (ctx.libre) return { sheet: { ...sheet, especieId, especieOpciones: opciones }, reseteada: false };
  const bloqueo = bloqueoDeEspecie(ctx);
  if (bloqueo) return { error: bloqueo };
  // §14.3: el reset es solo "en borrador". El máster cambiando
  // la especie de una ficha aprobada se queda sin reset (lo reversible): conserva
  // todo lo comprado (validado por el usuario, 2026-10-09).
  if (ctx.aprobada) return { sheet: { ...sheet, especieId, especieOpciones: opciones }, reseteada: false };
  return { sheet: resetear(sheet, especieId, opciones), reseteada: true };
}

function iguales(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => iguales((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
}

// ¿Cambiar de especie borraría algo? Compara la ficha con su propio reset. Vida y
// fatiga actuales no cuentan: volver al máximo no es perder nada.
export function hayQuePerder(sheet: Sheet, creditos: number, creditosDeLaLetra: number): boolean {
  if (creditos !== creditosDeLaLetra) return true;
  const sinVida = (s: Sheet) => ({ ...s, vidaActual: 0, fatigaActual: 0, schemaVersion: 0 });
  return !iguales(sinVida(resetear(sheet, sheet.especieId, sheet.especieOpciones)), sinVida(sheet));
}

// hayQuePerder, pero solo cuando el cambio de verdad resetea (en borrador y fuera
// del modo libre): el máster con la ficha aprobada cambia sin reset, y el NPC nunca
// resetea. Créditos de la letra: los de RECURSOS_POR_LETRA, como al elegir la letra.
export function hayQueAvisar(sheet: Sheet, creditos: number, ctx: ContextoEleccion): boolean {
  if (ctx.libre || ctx.aprobada) return false;
  return hayQuePerder(sheet, creditos, creditosDeLaLetra(sheet.prioridades));
}

// --- Borrador del selector -------------------------------------------------

export function eleccionDeFicha(sheet: Pick<Sheet, "especieId" | "especieOpciones">): EleccionEspecie {
  return {
    especieId: sheet.especieId,
    casta: sheet.especieOpciones.casta ?? null,
    linaje: sheet.especieOpciones.linaje ?? null,
  };
}

// ¿Se puede mandar ya? Las mismas reglas que elegirEspecie: casta obligatoria si la
// especie tiene castas, linaje obligatorio con la casta que lo admite.
export function eleccionCompleta(eleccion: EleccionEspecie): boolean {
  return !("error" in validarEleccion(eleccion));
}

// Qué le falta a una elección para poder mandarse, o null si está completa ("casa"
// es como ve el jugador el linaje). Mismo orden que validarEleccion; con una
// especie, casta o linaje desconocidos devuelve null y lo rechaza elegirEspecie
// (aquí solo se guía al jugador).
export function faltaEnEleccion(eleccion: EleccionEspecie): "Elige especie" | "Elige casta" | "Elige casa" | null {
  const especie = especiePorId(eleccion.especieId);
  if (!especie) return eleccion.especieId === null ? "Elige especie" : null;
  if (!especie.castas) return null;
  if (!eleccion.casta) return "Elige casta";
  if (especie.linajes?.casta === eleccion.casta && !eleccion.linaje) return "Elige casa";
  return null;
}

export function eleccionesIguales(a: EleccionEspecie, b: EleccionEspecie): boolean {
  return (
    a.especieId === b.especieId &&
    (a.casta ?? null) === (b.casta ?? null) &&
    (a.linaje ?? null) === (b.linaje ?? null)
  );
}

// --- Peso y altura de referencia (§14.5) -----------------------------------

export type RangoReferencia = {
  fuente: string; // de quién es la referencia: la casta si la trae, si no la especie
  pesoKg: { min: number; max: number };
  alturaCm: { min: number; max: number };
};

// Peso = min-max + porFuerza × Fuerza con especie (M21): la comprada más lo que
// suma la especie, sin equipo ni estados. Solo referencia, no se valida. El peso no
// baja de 0 (un Riux con Fuerza −2 restaría 20 kg al mínimo, no más).
export function rangoReferencia(especie: EspecieResuelta | null, fuerzaComprada: number): RangoReferencia | null {
  if (!especie?.referencia) return null;
  const { pesoKg, alturaCm } = especie.referencia;
  const fuerza =
    fuerzaComprada +
    especie.modificadores.reduce((t, m) => (m.tipo === "atributo" && m.id === "fuerza" ? t + m.valor : t), 0);
  const extra = pesoKg.porFuerza * fuerza;
  return {
    fuente: especie.casta?.referencia ? especie.casta.fuente : especie.especie.label,
    pesoKg: { min: Math.max(0, pesoKg.min + extra), max: Math.max(0, pesoKg.max + extra) },
    alturaCm: { min: alturaCm.min, max: alturaCm.max },
  };
}

// --- Creación y progresión (§14.6) ------------------------------------------

// Junta los `costes` de los rasgos de especie, casta y linaje. La especie no se
// guarda en el ajuste: las funciones de coste lo reciben ya resuelto y no miran el
// catálogo. Sin especie, o con una sin rasgos de coste, AJUSTE_NEUTRO.
export function ajustesDeCoste(especie: EspecieResuelta | null): AjusteCoste {
  if (!especie) return AJUSTE_NEUTRO;
  const ajuste: AjusteCoste = { habilidades: {}, psionicaNivel1: null, psionicaPorNivel: null };
  let tocado = false;
  for (const { costes } of especie.rasgos) {
    if (!costes) continue;
    tocado = true;
    const { etiqueta } = costes;
    for (const [id, delta] of Object.entries(costes.habilidades ?? {}) as [HabilidadId, -1 | 1][]) {
      ajuste.habilidades[id] = { delta, etiqueta };
    }
    if (costes.psionicaNivel1 !== undefined) ajuste.psionicaNivel1 = { coste: costes.psionicaNivel1, etiqueta };
    if (costes.psionicaPorNivel !== undefined) ajuste.psionicaPorNivel = { delta: costes.psionicaPorNivel, etiqueta };
  }
  return tocado ? ajuste : AJUSTE_NEUTRO;
}

// Bolsa de aumentos (M3): el total de la especie. Lo gastado vive en
// sheet.bolsaAumentosGastada y el saldo lo da saldoBolsaAumentos (aumentos.ts).
export function bolsaDeAumentos(especie: EspecieResuelta | null): number | null {
  const bolsas = (especie?.rasgos ?? []).flatMap((r) => (r.bolsaAumentos === undefined ? [] : [r.bolsaAumentos]));
  return bolsas.length ? bolsas.reduce((a, b) => a + b, 0) : null;
}

// Acceso al Kerzul (M9): la excepción de rareza que trae la especie. La aplica
// puedeEquiparSinRareza (equipo.ts), que recibe esto ya resuelto.
export function excepcionesRareza(especie: EspecieResuelta | null): ExcepcionRareza[] {
  return (especie?.rasgos ?? []).flatMap((r) => (r.excepcionRareza ? [r.excepcionRareza] : []));
}

// --- Derivados (§14.7) --------------------------------------------------------

export type FormulaMovimientoResuelta = {
  formula: FormulaMovimiento;
  // Quién cambió cada constante respecto a la general (la fuente del rasgo).
  fuentes: Partial<Record<keyof FormulaMovimiento, string>>;
};
export const FORMULA_MOVIMIENTO_NEUTRA: FormulaMovimientoResuelta = { formula: FORMULA_MOVIMIENTO_GENERAL, fuentes: {} };

export type MultiplicadorCarga = { valor: number; fuente: string | null };
export const MULTIPLICADOR_CARGA_NEUTRO: MultiplicadorCarga = { valor: 1, fuente: null };

// Las constantes de movimiento que trae la especie sustituyen a las generales; si
// dos capas tocaran la misma, gana la última (especie → casta → linaje).
export function formulaMovimientoDeEspecie(especie: EspecieResuelta | null): FormulaMovimientoResuelta {
  const conFormula = (especie?.rasgos ?? []).filter((r) => r.formulaMovimiento);
  if (!conFormula.length) return FORMULA_MOVIMIENTO_NEUTRA;
  const formula = { ...FORMULA_MOVIMIENTO_GENERAL };
  const fuentes: FormulaMovimientoResuelta["fuentes"] = {};
  for (const r of conFormula) {
    for (const [k, v] of Object.entries(r.formulaMovimiento!) as [keyof FormulaMovimiento, number | undefined][]) {
      if (v === undefined) continue;
      formula[k] = v;
      fuentes[k] = r.fuente;
    }
  }
  return { formula, fuentes };
}

// Arköru × 1,2. Si llegaran dos, se multiplican.
export function multiplicadorCargaDeEspecie(especie: EspecieResuelta | null): MultiplicadorCarga {
  const con = (especie?.rasgos ?? []).filter((r) => r.multiplicadorCarga !== undefined);
  if (!con.length) return MULTIPLICADOR_CARGA_NEUTRO;
  return {
    valor: con.reduce((t, r) => t * r.multiplicadorCarga!, 1),
    fuente: [...new Set(con.map((r) => r.fuente))].join(", "),
  };
}

// Arköru 1 (Matriz Biometálica). Si llegaran dos, se suman.
export function armaduraNaturalDeEspecie(especie: EspecieResuelta | null): ArmaduraNatural {
  const con = (especie?.rasgos ?? []).filter((r) => r.armaduraNatural !== undefined);
  if (!con.length) return SIN_ARMADURA_NATURAL;
  return {
    valor: con.reduce((t, r) => t + r.armaduraNatural!, 0),
    fuente: [...new Set(con.map((r) => r.fuente))].join(", "),
  };
}

// --- Tiradas (§14.8) -------------------------------------------------------------

// Las casillas de los rasgos, una por tirada fija con alcance tiradaId: entran en el
// mismo índice que las del equipo (indiceDeCondiciones), así que montarTirada las suma
// sin saber de dónde vienen. El id lleva el rasgo delante para no chocar con otra
// casilla de la misma tirada; la etiqueta, el rasgo detrás para el desglose.
export function casillasDeEspecie(especie: EspecieResuelta | null): CondicionTirada[] {
  return (especie?.rasgos ?? []).flatMap((r) =>
    (r.casillas ?? []).flatMap(({ acciones, condicion }) =>
      acciones.map((id) => ({
        ...condicion,
        id: `especie_${r.id}_${condicion.id}`,
        etiqueta: `${condicion.etiqueta} (${r.label})`,
        alcance: { tipo: "tiradaId" as const, id },
      })),
    ),
  );
}

// `soloEnCriticoNatural` (con soloEnCritico): solo con crítico natural, sin la conversión éxito →
// crítico (Gran Puntería en Apuntar); va a Accion.efectoCriticoNatural.
export type TextoEnTirada = { en: DestinoTexto; texto: string; fuente: string; soloEnCritico: boolean; soloEnCriticoNatural?: true };

// Los textos sin mecanizar (§14.10), uno por destino, con "rasgo · capa" de fuente.
export function textosDeEspecie(especie: EspecieResuelta | null): TextoEnTirada[] {
  return (especie?.rasgos ?? []).flatMap((r) =>
    (r.textos ?? []).flatMap((t) =>
      t.en.map((en) => ({ en, texto: t.texto, fuente: `${r.label} · ${r.fuente}`, soloEnCritico: t.soloEnCritico ?? false })),
    ),
  );
}

// Guerrero (heridas) y Siervo (fatiga): puntos menos en cada tramo. Si dos capas
// tocaran el mismo recurso, se suman.
export function ajusteUmbralesDeEspecie(especie: EspecieResuelta | null): AjusteUmbrales {
  const ajuste = (recurso: "salud" | "fatiga"): AjusteUmbral | null => {
    const con = (especie?.rasgos ?? []).filter((r) => r.ajusteUmbrales?.[recurso] !== undefined);
    if (!con.length) return null;
    return {
      valor: con.reduce((t, r) => t + r.ajusteUmbrales![recurso]!, 0),
      fuente: [...new Set(con.map((r) => r.fuente))].join(", "),
    };
  };
  const salud = ajuste("salud");
  const fatiga = ajuste("fatiga");
  return salud || fatiga ? { salud, fatiga } : SIN_AJUSTE_UMBRALES;
}

// --- Otras áreas (§14.9, E5) -----------------------------------------------------

// Peaje neurológico (Maolher): salvación de Fortaleza, dificultad base + nivel
// empleado, al pagar fatiga por un poder. Lo calcula usarPoder; null sin el rasgo.
export type PeajeNeurologico = { dificultadBase: number; fuente: string };

export function peajeNeurologicoDeEspecie(especie: EspecieResuelta | null): PeajeNeurologico | null {
  const r = (especie?.rasgos ?? []).find((x) => x.peajeNeurologico);
  return r ? { dificultadBase: r.peajeNeurologico!.dificultadBase, fuente: r.fuente } : null;
}

// Notas fijas en las filas de fármaco (Irota, efectos a la mitad): la app no
// mecaniza los efectos de los fármacos, así que la regla va como texto.
export function notasFarmacosDeEspecie(especie: EspecieResuelta | null): string[] {
  return (especie?.rasgos ?? []).flatMap((r) => (r.notaFarmacos ? [r.notaFarmacos] : []));
}

// Acciones sin dado del rasgo (activar la visión), en el grupo "Acciones".
export function accionesSinDadoDeEspecie(especie: EspecieResuelta | null): AccionDirecta[] {
  return (especie?.rasgos ?? []).flatMap((r): AccionDirecta[] =>
    r.accionSinDado
      ? [
          {
            id: `especie_${r.id}`,
            label: r.accionSinDado.label,
            grupo: "Acciones",
            nota: r.accionSinDado.nota,
            confirmarLabel: "Activar",
            ...(r.accionSinDado.costeFatiga !== undefined && { costeFatiga: r.accionSinDado.costeFatiga }),
          },
        ]
      : [],
  );
}

// --- Atributo libre (Humanos) ------------------------------------------------
//
// Va aparte de elegirEspecie: no resetea la ficha (no deshace ninguna compra) y el
// jugador lo puede elegir una vez en una ficha aprobada que aún no lo tenga (decisión
// del usuario, 2026-10-23). Cambiar de especie lo pierde (resetear y normalizarOpciones).

export function bloqueoDeAtributoLibre(sheet: Pick<Sheet, "especieOpciones">, ctx: ContextoEleccion): string | null {
  if (ctx.libre || ctx.esMaster || !ctx.aprobada || !sheet.especieOpciones.atributo) return null;
  return "La ficha está aprobada: el atributo ya está elegido";
}

export function elegirAtributoLibre(
  sheet: Sheet,
  atributo: AtributoId,
  ctx: ContextoEleccion,
): { sheet: Sheet } | { error: string } {
  const especie = especiePorId(sheet.especieId);
  if (!especie?.atributoLibre) return { error: "Tu especie no elige atributo" };
  if (!ATRIBUTOS.some((a) => a.id === atributo)) return { error: "Atributo desconocido" };
  if (sheet.especieOpciones.atributo === atributo) return { sheet };
  const bloqueo = bloqueoDeAtributoLibre(sheet, ctx);
  if (bloqueo) return { error: bloqueo };
  return { sheet: { ...sheet, especieOpciones: { ...sheet.especieOpciones, atributo } } };
}

// Falta para enviar a revisión (pasosPersonaje, paso Origen).
export function faltaAtributoLibre(sheet: Pick<Sheet, "especieId" | "especieOpciones">): string | null {
  const especie = especiePorId(sheet.especieId);
  if (!especie?.atributoLibre || sheet.especieOpciones.atributo) return null;
  return `Elige el atributo +${especie.atributoLibre}`;
}
