// Envío a revisión (docs/tareas.md, "Envío a revisión"): En creación → En revisión →
// En juego, sin UI.
//
//   transicionRevision   quién puede mover la ficha de un estado a otro
//   fichaSoloLectura     si quien mira la ficha en revisión puede editarla
//   faltaParaEnviar      lo que bloquea el envío (los `falta` de pasosPersonaje)
//   avisosParaEnviar     lo que se avisa pero no bloquea (puntos sin gastar)
import { puntosAtributosDisponibles, puntosHabilidadesDisponibles } from "./creacion";
import { puntosPsionicaDisponibles } from "./psionica";
import type { PasoPersonaje } from "./personaje";
import type { AjusteCoste } from "./progresion";
import type { Sheet } from "./sheet";

// Mismos valores que el enum CharacterStatus de prisma/schema.prisma.
export const ESTADOS_FICHA = ["DRAFT", "IN_REVIEW", "APPROVED"] as const;
export type EstadoFicha = (typeof ESTADOS_FICHA)[number];

export type AccionRevision = "enviar" | "retirar" | "aprobar" | "devolver" | "revertir";

const TEXTO_ESTADO: Record<EstadoFicha, string> = {
  DRAFT: "en creación",
  IN_REVIEW: "en revisión",
  APPROVED: "en juego",
};

type Regla = { desde: EstadoFicha[]; hasta: EstadoFicha; quien: "dueno" | "master" };

// El máster que es dueño de la ficha cuenta como dueño para enviar y retirar.
// Aprobar desde DRAFT (sin pasar por revisión) sigue valiendo, como antes de esto.
const REGLAS: Record<AccionRevision, Regla> = {
  enviar: { desde: ["DRAFT"], hasta: "IN_REVIEW", quien: "dueno" },
  retirar: { desde: ["IN_REVIEW"], hasta: "DRAFT", quien: "dueno" },
  aprobar: { desde: ["DRAFT", "IN_REVIEW"], hasta: "APPROVED", quien: "master" },
  devolver: { desde: ["IN_REVIEW"], hasta: "DRAFT", quien: "master" },
  revertir: { desde: ["APPROVED"], hasta: "DRAFT", quien: "master" },
};

export function transicionRevision({
  estado,
  accion,
  esMaster,
  esDueno,
}: {
  estado: EstadoFicha;
  accion: AccionRevision;
  esMaster: boolean;
  esDueno: boolean;
}): { estado: EstadoFicha } | { error: string } {
  const regla = REGLAS[accion];
  if (regla.quien === "master" && !esMaster) return { error: "Solo el máster puede hacer eso" };
  if (regla.quien === "dueno" && !esDueno) return { error: "Solo el dueño de la ficha puede hacer eso" };
  if (!regla.desde.includes(estado)) {
    return { error: `No se puede ${accion} una ficha ${TEXTO_ESTADO[estado]}` };
  }
  return { estado: regla.hasta };
}

// Decisión del usuario (2026-10-13): en revisión la ficha es de solo lectura para el
// jugador, pero el máster SÍ puede editarla (lo más barato). Único sitio donde se
// decide: lo usan loadEditable (servidor) y CharacterSheet (fieldset disabled).
// Para que el máster tampoco edite, quitar `&& !esMaster`.
export function fichaSoloLectura({ estado, esMaster }: { estado: EstadoFicha; esMaster: boolean }): boolean {
  return estado === "IN_REVIEW" && !esMaster;
}

export function faltaParaEnviar(pasos: PasoPersonaje[]): string[] {
  return pasos.flatMap((p) => p.falta);
}

const quedan = (n: number) => (n === 1 ? "Te queda 1 punto" : `Te quedan ${n} puntos`);

// Puntos de creación sin gastar: se avisa, pero se puede enviar igual (decisión del
// usuario). Con S+ (pruebas, presupuesto infinito) no hay nada que avisar.
export function avisosParaEnviar(sheet: Sheet, ajuste: AjusteCoste): string[] {
  const pools: [string, number][] = [
    ["atributos", puntosAtributosDisponibles(sheet)],
    ["habilidades", puntosHabilidadesDisponibles(sheet, ajuste)],
    ["psiónica", puntosPsionicaDisponibles(sheet, ajuste)],
  ];
  return pools.flatMap(([nombre, n]) =>
    Number.isFinite(n) && n > 0 ? [`${quedan(n)} de ${nombre} sin gastar`] : [],
  );
}
