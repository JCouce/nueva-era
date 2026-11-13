// Atajos para escribir los efectos de arma del catálogo (rules/efectosArma.ts) sin repetir la
// forma entera en cada fila. Son datos: cada atajo devuelve un `EfectoArma` tal cual.
//
// Gramática de la fuente (docs/fuente/equipamiento.md):
//   «Efecto X (N)» / «X (N)» en la columna de efectos → al acertar, salvación contra X a N.
//   «Crítico de X (N)» / «Crítico: X (N)»           → lo mismo, solo en crítico.
//   «Acción Compleja: X (N)»                          → solo con el modo Compleja.
//   «Hemorragia (1dN turnos)» / «Hemorragia 1 turno» → estado sin salvación, con duración.
//   «Hemorragia Exanguinante»                         → sin duración: solo la quita la medicina.
import type { EfectoArma } from "../rules/efectosArma";

export function salva(estadoId: string, dificultad: number): Extract<EfectoArma, { tipo: "salvacion" }> {
  return { tipo: "salvacion", estadoId, dificultad, cuando: "acierto" };
}

export function enCritico(e: EfectoArma): EfectoArma {
  return { ...e, cuando: "critico" };
}

// «Acción Compleja: Derribo (8)»: solo con ese modo de la tabla del arma (por su etiqueta).
export function enModo(modos: string[], e: EfectoArma): EfectoArma {
  return { ...e, soloEn: { ...e.soloEn, modo: modos } };
}

// Derribo de escopetas y ametralladoras: «en Corta Distancia y a Bocajarro» (regla de familia).
export function derriboCercano(dificultad: number): EfectoArma {
  return { ...salva("derribado", dificultad), soloEn: { tramo: ["corta", "bocajarro"] } };
}

// «Shock y Llamarada (N)»: dos salvaciones con el mismo número (cuestionario eq-06).
export function shockYLlamarada(dificultad: number): EfectoArma[] {
  return [salva("shock", dificultad), salva("llamarada", dificultad)];
}

export function hemorragiaDado(caras: number): EfectoArma {
  return { tipo: "estado", estadoId: "hemorragia", duracion: { tipo: "dado", caras }, cuando: "acierto" };
}

export function hemorragiaTurnos(turnos: number): EfectoArma {
  return { tipo: "estado", estadoId: "hemorragia", duracion: { tipo: "turnos", turnos }, cuando: "acierto" };
}

// «Aquella hemorragia que no cesa hasta que el usuario recibe sanación» (cuestionario eq-08).
export const HEMORRAGIA_EXANGUINANTE: EfectoArma = {
  tipo: "estado",
  estadoId: "hemorragia",
  etiqueta: "Hemorragia Exanguinante",
  duracion: { tipo: "sinDuracion", motivo: "no cesa hasta recibir sanación (solo la quita la medicina)" },
  cuando: "acierto",
};

export function texto(t: string): EfectoArma {
  return { tipo: "texto", texto: t, cuando: "acierto" };
}

// «Impacto Estructural» de Kerzul: «reduce de forma permanente el valor de blindaje del
// objetivo en 1 punto. En armas a dos manos la reducción del blindaje es de 2 puntos».
// TODO(revisar): la fuente no dice qué es el número entre paréntesis («Impacto Estructural
// (10)»); se enseña tal cual.
export function impactoEstructural(dificultad: number, empleo: "una mano" | "dos manos"): EfectoArma {
  const puntos = empleo === "dos manos" ? 2 : 1;
  return enCritico(
    texto(`Impacto Estructural (${dificultad}): reduce de forma permanente el blindaje del objetivo en ${puntos} punto${puntos > 1 ? "s" : ""}`),
  );
}

// «Derribado o Entorpecido (N)» de Látigo y Cadena Armada: lo decide el máster según la escena
// (cuestionario eq-11, usuario 2026-11-13).
export function derribadoOEntorpecido(dificultad: number): EfectoArma {
  return enCritico(
    texto(
      `Derribado o Entorpecido, dificultad ${dificultad}: el máster elige cuál según la escena ` +
        "(Derribado se salva con Saltar, levantarse; Entorpecido, con Reflejos + Atletismo)",
    ),
  );
}
