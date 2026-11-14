// El golpe desarmado (toda la Pelea) con la armadura puesta (2026-10-24, docs/fuente/equipamiento.md):
//   - Armadura Ligera e Intermedia: +1 al daño; Pesada: +2. Las tres "permiten usar acciones de
//     bloqueo estando desarmado contra armas melee sin penalizador" (sin el −3 de Bloqueo).
//   - Refuerzo de Combate, instalado en esa armadura: +1 más (nivel 1) o +2 más (nivel 2; los
//     niveles no se suman), el daño pasa a letal y el aturdimiento del crítico sube a 7 (8).
//     Al ser letal, bloquear desarmado tampoco lleva el −3 ("si el ataque desarmado de quien
//     bloquea causa daño letal no se considera desarmado", Bloqueo).
// Cuenta la armadura que cuenta para el blindaje: la primera de la ficha.
// E5b (sync Drive 2026-11-14): el Chasis Osteomuscular hace letal el golpe desarmado y, desde el
// nivel 2, le suma +1/+2/+3, con armadura o sin ella (`NivelImplante.desarmado`). golpeDesarmado
// junta las dos cosas; golpeDesarmadoConArmadura sigue siendo solo lo de la armadura.
// El Shock (S73, §7): la fila se genera con la ficha entera, así que lo mira aquí con `afectacion`
// (FichaResuelta.piezasInutilizadas / piezasPenalizadas). Pieza apagada: no aporta nada, ni letal ni
// +N. Penalizada: su +N pierde el −N del grado sin bajar de 0 y el letal se queda (no es un bono
// numérico). El Refuerzo de Combate es inmune al Shock (catálogo), así que hoy solo toca al Chasis.
import { equipoPorId, type Armadura } from "../catalog/equipo";
import { aumentoPorId } from "./aumentos";
import { nivelesHasta, ultimoQueDefine, type PiezaEquipada } from "./equipo";
import type { Sheet } from "./sheet";
import type { EfectoEnTirada } from "./efectosArma";
import type { PiezaPenalizada } from "./shock";

export type AfectacionGolpe = {
  inutilizadas?: ReadonlyMap<string, string>;
  penalizadas?: ReadonlyMap<string, PiezaPenalizada>;
};

const apagada = (a: AfectacionGolpe | undefined, instanciaId: string) => Boolean(a?.inutilizadas?.has(instanciaId));
// El bono de la pieza con el −N del Shock (sin bajar de 0) y su fuente con la marca «(shock)».
function conShock(a: AfectacionGolpe | undefined, instanciaId: string, bono: number, fuente: string): { bono: number; fuente: string } {
  const p = a?.penalizadas?.get(instanciaId);
  return p ? { bono: Math.max(0, bono - p.valor), fuente: `${fuente} (shock)` } : { bono, fuente };
}

export type GolpeDesarmadoConArmadura = {
  bonoDanio: number;
  // "Armadura Pesada +2 · Refuerzo de Combate 1 +1", para la nota de la fila.
  fuentes: string[];
  // La fuente que hace letal el golpe (Refuerzo de Combate), o null.
  letal: string | null;
  aturdimiento: { dificultad: number; fuente: string } | null;
  // Quién quita el −3 al bloquear desarmado, o null.
  bloqueoSinPenalizador: string | null;
  // Lo que suman los aumentos (Chasis Osteomuscular 2: +1), aparte de `fuentes`, que es lo de la
  // armadura. Solo lo pone golpeDesarmado.
  deAumentos?: string[];
};

function armaduraQueCuenta(sheet: Pick<Sheet, "equipo">): { pieza: PiezaEquipada; cat: Armadura } | null {
  for (const pieza of sheet.equipo) {
    const cat = equipoPorId(pieza.catalogoId);
    if (cat?.familia === "armadura") return { pieza, cat };
  }
  return null;
}

export function golpeDesarmadoConArmadura(sheet: Pick<Sheet, "equipo">, afectacion?: AfectacionGolpe): GolpeDesarmadoConArmadura | null {
  const armadura = armaduraQueCuenta(sheet);
  if (!armadura) return null;
  const fuentes: string[] = [];
  let bonoDanio = 0;
  let bloqueoSinPenalizador: string | null = null;
  const propio = armadura.cat.desarmado;
  if (propio) {
    bonoDanio += propio.bonoDanio;
    fuentes.push(`${armadura.cat.label} +${propio.bonoDanio}`);
    bloqueoSinPenalizador = armadura.cat.label;
  }
  let letal: string | null = null;
  let aturdimiento: GolpeDesarmadoConArmadura["aturdimiento"] = null;
  const pieza = sheet.equipo.find((p) => p.catalogoId === "refuerzo_combate" && p.instaladoEnId === armadura.pieza.instanciaId);
  const cat = pieza ? equipoPorId(pieza.catalogoId) : null;
  if (pieza?.nivel !== undefined && cat?.familia === "mejoraEstandar" && !apagada(afectacion, pieza.instanciaId)) {
    const refuerzo = ultimoQueDefine(nivelesHasta(cat.niveles, pieza.nivel), "refuerzoDesarmado")?.refuerzoDesarmado;
    if (refuerzo) {
      const fuente = `${cat.label} ${pieza.nivel}`;
      const conElShock = conShock(afectacion, pieza.instanciaId, refuerzo.bonoDanio, fuente);
      bonoDanio += conElShock.bono;
      fuentes.push(`${conElShock.fuente} +${conElShock.bono}`);
      letal = fuente;
      aturdimiento = { dificultad: refuerzo.aturdimiento, fuente };
      bloqueoSinPenalizador ??= fuente;
    }
  }
  if (bonoDanio === 0 && !letal && !bloqueoSinPenalizador) return null;
  return { bonoDanio, fuentes, letal, aturdimiento, bloqueoSinPenalizador };
}

// Lo que los implantes hacen al golpe desarmado (Chasis Osteomuscular, E5b): letal y +N, el del nivel
// más alto que lo trae. Una línea por pieza.
export function golpeDesarmadoDeAumentos(
  sheet: Pick<Sheet, "equipo">,
  afectacion?: AfectacionGolpe,
): { bonoDanio: number; fuente: string; letal: boolean }[] {
  return sheet.equipo.flatMap((pieza) => {
    const cat = aumentoPorId(pieza.catalogoId);
    if (cat?.familia !== "implante" || pieza.nivel === undefined || apagada(afectacion, pieza.instanciaId)) return [];
    const d = ultimoQueDefine(nivelesHasta(cat.niveles, pieza.nivel), "desarmado")?.desarmado;
    if (!d) return [];
    const { bono, fuente } = conShock(afectacion, pieza.instanciaId, d.bonoDanio, `${cat.label} ${pieza.nivel}`);
    return [{ bonoDanio: bono, fuente, letal: d.letal }];
  });
}

// El golpe desarmado de la ficha: lo de la armadura (golpeDesarmadoConArmadura) y lo de los
// implantes. El letal de un implante también quita el −3 al bloquear desarmado (Bloqueo: «si el
// ataque desarmado de quien bloquea causa daño letal no se considera desarmado»).
export function golpeDesarmado(sheet: Pick<Sheet, "equipo">, afectacion?: AfectacionGolpe): GolpeDesarmadoConArmadura | null {
  const armadura = golpeDesarmadoConArmadura(sheet, afectacion);
  const aumentos = golpeDesarmadoDeAumentos(sheet, afectacion);
  if (aumentos.length === 0) return armadura;
  const letal = aumentos.find((a) => a.letal)?.fuente ?? null;
  const conBono = aumentos.filter((a) => a.bonoDanio > 0);
  return {
    bonoDanio: (armadura?.bonoDanio ?? 0) + conBono.reduce((t, a) => t + a.bonoDanio, 0),
    fuentes: armadura?.fuentes ?? [],
    letal: armadura?.letal ?? letal,
    aturdimiento: armadura?.aturdimiento ?? null,
    bloqueoSinPenalizador: armadura?.bloqueoSinPenalizador ?? letal,
    ...(conBono.length > 0 && { deAumentos: conBono.map((a) => `${a.fuente} +${a.bonoDanio}`) }),
  };
}

// El crítico del golpe con el aturdimiento del Refuerzo: la salvación contra Aturdido del
// crítico pasa de 6 a 7 (u 8), con la fuente en la nota; si el golpe no traía, se añade.
export function criticoDesarmado(efectos: readonly EfectoEnTirada[], golpe: GolpeDesarmadoConArmadura | null): EfectoEnTirada[] {
  if (!golpe?.aturdimiento) return [...efectos];
  const { dificultad, fuente } = golpe.aturdimiento;
  const esAturdimiento = (e: EfectoEnTirada) => e.cuando === "critico" && e.tipo === "salvacion" && e.estadoId === "aturdido";
  const nota = `Dificultad del ${fuente}.`;
  if (efectos.some(esAturdimiento))
    return efectos.map((e) => (esAturdimiento(e) && e.tipo === "salvacion" ? { ...e, dificultad, nota } : e));
  return [...efectos, { tipo: "salvacion", estadoId: "aturdido", dificultad, cuando: "critico", fuente, nota }];
}
