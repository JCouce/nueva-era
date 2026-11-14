// El Shock sobre las piezas (S73, pl-01…pl-03, usuario 2026-11-14; docs/sistema.md §7).
//
// Dos estados (catalog/estados.ts): «Shock» toca las piezas del cuerpo (implantes) y «Shock en el
// equipo», todo el equipo tecnológico a la vez. Cada pieza (o nivel) declara cómo le afecta con
// `shock`; sin declararlo, el valor por defecto de su familia (shockDePieza, criterio en §7 de
// sistema.md). Lo que hace el grado puesto:
//   - `apagadas` (fracaso crítico): la pieza no funciona. Va a FichaResuelta.piezasInutilizadas, sus
//     aportes no llegan a ninguna tirada y sus acciones propias salen bloqueadas.
//   - `penaliza` (fracaso −2, éxito −1): se aplica a mano (decisión del usuario, pl-02); las
//     tiradas donde aporta la pieza, o que la usan, lo avisan.
// «Apagón» (Soporte Vital) es lo mismo que estar afectado por el Shock (pl-03, eq-28).
import { equipoPorId, type Equipo } from "../catalog/equipo";
import { estadoPorId } from "../catalog/estados";
import { nivelesHasta, ultimoQueDefine } from "./equipo";
import { estadosConEfecto, type EstadoActivo } from "./estados";
import { inmunidadesDe } from "./inmunidades";
import type { OrigenAporte } from "./origen";
import type { Sheet } from "./sheet";

// `cuerpo`: la toca el Shock (Fortaleza); `equipo`: el Shock en el equipo (Estructura); `inmune`:
// ninguno (no es electrónica, o lo dice la pieza).
export type AfectaShock = "cuerpo" | "equipo" | "inmune";

// Munición de las armas de energía (láser, rayo de partículas, plasma): el arma es electrónica.
const MUNICION_DE_ENERGIA: ReadonlySet<string> = new Set(["bateria_laser", "celula_particulas", "bateria_plasma", "bateria_plasma_canon"]);

function porDefecto(cat: Equipo): AfectaShock {
  switch (cat.familia) {
    case "implante":
      return "cuerpo";
    case "mejoraEstandar":
    case "subsistema":
    case "movimiento":
    case "herramienta":
      return "equipo";
    case "arma":
    case "armaPesada":
      return cat.tipoMunicion && MUNICION_DE_ENERGIA.has(cat.tipoMunicion) ? "equipo" : "inmune";
    // Operaciones genéticas (nunca, §11.3), armaduras (sus placas; lo electrónico son sus mejoras y
    // subsistemas), mejoras de arma mecánicas, melee, munición, granadas y consumibles.
    // TODO(revisar): las armas mecánicas («hoja motorizada», pistones), el Lanzamisiles AT (misil
    // guiado), las modificaciones Electrificante y Térmica de las Armas Modificadas y la Ropa
    // Inteligente no dicen si son electrónicas: quedan inmunes hasta que se aclare.
    default:
      return "inmune";
  }
}

// Lo que declara el nivel más alto instalado que lo diga (S9), o la pieza, o el de su familia.
export function shockDePieza(cat: Equipo, nivel?: number): AfectaShock {
  if ("niveles" in cat) {
    const define = ultimoQueDefine(nivelesHasta(cat.niveles, nivel ?? cat.niveles[0]?.nivel ?? 1), "shock");
    if (define?.shock) return define.shock;
  }
  if (cat.familia === "implante") return cat.shock;
  return porDefecto(cat);
}

// Una pieza tocada por un estado que la penaliza (fracaso, éxito): el aviso de sus tiradas.
// `estado`: el estado que la penaliza, de origen del aviso.
export type PiezaPenalizada = { origen: OrigenAporte; valor: number; fuente: string; estado: OrigenAporte };

export type AfectacionDePiezas = {
  // instanciaId → el estado que la apaga («Shock», «Shock en el equipo»).
  inutilizadas: ReadonlyMap<string, string>;
  // instanciaId → −N a mano.
  penalizadas: ReadonlyMap<string, PiezaPenalizada>;
};

export const SIN_AFECTACION: AfectacionDePiezas = { inutilizadas: new Map(), penalizadas: new Map() };

// Con los estados que hacen efecto (sin los que anula una inmunidad, A7). Si dos estados tocan la
// misma pieza (no pasa hoy: cada pieza es de cuerpo o de equipo), apagar gana a penalizar.
export function afectacionDePiezas(sheet: Pick<Sheet, "equipo">, estados: readonly EstadoActivo[]): AfectacionDePiezas {
  const conEfecto = estadosConEfecto([...estados], inmunidadesDe(sheet));
  const tocan = conEfecto.flatMap((e) => {
    const estado = estadoPorId(e.estadoId);
    const grado = estado?.grados.find((g) => g.id === e.gradoId);
    return estado?.afectaPiezas && grado?.piezas ? [{ estado, grado: grado.label, afecta: estado.afectaPiezas, piezas: grado.piezas }] : [];
  });
  if (tocan.length === 0) return SIN_AFECTACION;
  const inutilizadas = new Map<string, string>();
  const penalizadas = new Map<string, PiezaPenalizada>();
  for (const pieza of sheet.equipo) {
    const cat = equipoPorId(pieza.catalogoId);
    if (!cat) continue;
    const afecta = shockDePieza(cat, pieza.nivel);
    for (const t of tocan) {
      if (t.afecta !== afecta) continue;
      if ("apagadas" in t.piezas) {
        inutilizadas.set(pieza.instanciaId, t.estado.label);
        penalizadas.delete(pieza.instanciaId);
      } else if (!inutilizadas.has(pieza.instanciaId)) {
        penalizadas.set(pieza.instanciaId, {
          origen: { tipo: cat.familia === "implante" || cat.familia === "operacionGenetica" ? "aumento" : "equipo", id: cat.id, label: cat.label, instanciaId: pieza.instanciaId },
          valor: t.piezas.penaliza,
          fuente: `${t.estado.label} (${t.grado.toLowerCase()})`,
          estado: { tipo: "estado", id: t.estado.id, label: t.estado.label },
        });
      }
    }
  }
  return { inutilizadas, penalizadas };
}

// La ficha sin las piezas apagadas: con ella se calcula todo lo que esas piezas aportan sin pasar
// por un aporte con origen (vuelo, exoesqueleto, absorción, activables, inmunidades…).
export function sinPiezasInutilizadas<S extends Pick<Sheet, "equipo">>(sheet: S, inutilizadas: ReadonlyMap<string, string>): S {
  if (inutilizadas.size === 0) return sheet;
  return { ...sheet, equipo: sheet.equipo.filter((p) => !inutilizadas.has(p.instanciaId)) };
}

// «Apagada por Shock.»: el `bloqueada` de las acciones propias de una pieza apagada.
export const motivoApagada = (motivo: string) => `Apagada por ${motivo}.`;

// «Shock (fracaso): −2 al bono de Neuroprótesis Simpática y a usarla, a mano.»
export const avisoPenalizada = (p: PiezaPenalizada) => `−${p.valor} al bono de ${p.origen.label} y a usarla, a mano`;
