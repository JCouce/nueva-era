// El golpe desarmado (toda la Pelea) con la armadura puesta (2026-10-24, docs/fuente/equipamiento.md):
//   - Armadura Ligera e Intermedia: +1 al daño; Pesada: +2. Las tres "permiten usar acciones de
//     bloqueo estando desarmado contra armas melee sin penalizador" (sin el −3 de Bloqueo).
//   - Refuerzo de Combate, instalado en esa armadura: +1 más (nivel 1) o +2 más (nivel 2; los
//     niveles no se suman), el daño pasa a letal y el aturdimiento del crítico sube a 7 (8).
//     Al ser letal, bloquear desarmado tampoco lleva el −3 ("si el ataque desarmado de quien
//     bloquea causa daño letal no se considera desarmado", Bloqueo).
// Cuenta la armadura que cuenta para el blindaje: la primera de la ficha.
import { equipoPorId, type Armadura } from "../catalog/equipo";
import { nivelesHasta, ultimoQueDefine, type PiezaEquipada } from "./equipo";
import type { Sheet } from "./sheet";

export type GolpeDesarmadoConArmadura = {
  bonoDanio: number;
  // "Armadura Pesada +2 · Refuerzo de Combate 1 +1", para la nota de la fila.
  fuentes: string[];
  // La fuente que hace letal el golpe (Refuerzo de Combate), o null.
  letal: string | null;
  aturdimiento: { dificultad: number; fuente: string } | null;
  // Quién quita el −3 al bloquear desarmado, o null.
  bloqueoSinPenalizador: string | null;
};

function armaduraQueCuenta(sheet: Pick<Sheet, "equipo">): { pieza: PiezaEquipada; cat: Armadura } | null {
  for (const pieza of sheet.equipo) {
    const cat = equipoPorId(pieza.catalogoId);
    if (cat?.familia === "armadura") return { pieza, cat };
  }
  return null;
}

export function golpeDesarmadoConArmadura(sheet: Pick<Sheet, "equipo">): GolpeDesarmadoConArmadura | null {
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
  if (pieza?.nivel !== undefined && cat?.familia === "mejoraEstandar") {
    const refuerzo = ultimoQueDefine(nivelesHasta(cat.niveles, pieza.nivel), "refuerzoDesarmado")?.refuerzoDesarmado;
    if (refuerzo) {
      const fuente = `${cat.label} ${pieza.nivel}`;
      bonoDanio += refuerzo.bonoDanio;
      fuentes.push(`${fuente} +${refuerzo.bonoDanio}`);
      letal = fuente;
      aturdimiento = { dificultad: refuerzo.aturdimiento, fuente };
      bloqueoSinPenalizador ??= fuente;
    }
  }
  if (bonoDanio === 0 && !letal && !bloqueoSinPenalizador) return null;
  return { bonoDanio, fuentes, letal, aturdimiento, bloqueoSinPenalizador };
}

// El crítico del golpe con el aturdimiento del Refuerzo ("Aturdimiento (6)" → "(7)").
export function criticoDesarmado(critico: string | null | undefined, golpe: GolpeDesarmadoConArmadura | null): string | undefined {
  if (!golpe?.aturdimiento) return critico ?? undefined;
  const nuevo = `Aturdimiento (${golpe.aturdimiento.dificultad}, ${golpe.aturdimiento.fuente})`;
  if (!critico) return nuevo;
  return /Aturdimiento \(\d+\)/.test(critico) ? critico.replace(/Aturdimiento \(\d+\)/, nuevo) : `${critico} · ${nuevo}`;
}
