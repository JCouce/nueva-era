// Convierte los fármacos que el personaje lleva en el pool (sheet.farmacos)
// en su propia fila de Acciones — mismo patrón que herramientas.ts, pero
// sobre un pool con cantidad en vez de equipo instalado (docs/tareas.md,
// "Granadas → recurso con cantidad" es el mismo espíritu). Archivo aparte de
// herramientas.ts a propósito: herramientas son equipo con nivel, fármacos
// son consumibles de cantidad — conceptos distintos aunque el patrón de
// generación se parezca. Fuente: docs/prompt-gasto-recursos.md, Fase 2.
//
// Alcance a propósito (no lo amplíes sin revisar el documento): no mecaniza
// el efecto completo de cada fármaco (curación por niveles, penalizadores
// acumulados...) — solo genera la fila, tira si corresponde con la
// dificultad ya conocida (como texto en `nota`, nunca como ajustesFijos: ver
// comentario de CON_TIRADA) y gasta 1 dosis al confirmar. El resto sigue
// siendo comunicación de mesa, igual que hoy.
import { FARMACOS } from "../catalog/medicina";
import type { Sheet } from "./sheet";
import type { Accion, AccionDirecta } from "./acciones";
import type { AplicadoId } from "./atributos";
import type { HabilidadId } from "./habilidades";

// Los tres que no llevan tirada (docs/checklist-motor-vs-prosa-2026-09-24.md
// / prompt-gasto-recursos.md): el nota explica el efecto, "Usar" solo gasta
// la dosis, sin resolución de d12 de por medio.
const SIN_TIRADA = new Set(["farmaco_analgesico", "farmaco_antipatogeno", "farmaco_ultra_estimulante"]);

// El resto lleva tirada fija: Perspicacia + Biociencia (especialidad
// Medicina), dificultad ya conocida — puesta en `nota` como texto, NUNCA en
// `ajustesFijos`. Mismo criterio que la tirada fija "medicina" (ACCIONES,
// acciones.ts: "Gel sanador y estabilizar tienen dificultad 4"): ajustesFijos
// es un modificador que se SUMA al resultado (el -2 fijo de un modo de
// disparo), no el número objetivo que el jugador teclea a mano en el modal
// — confundir los dos infla el resultado, no fija la dificultad.
// `ajustesFijos` aquí es SOLO para el +5 real de Nano-Elixir (bono de la
// dosis a la propia tirada, no una dificultad).
// Por defecto Perspicacia + Biociencia; `habilidades` con dos = la más alta de la
// ficha ("Biociencia o Actitud").
const CON_TIRADA: Record<
  string,
  {
    nota: string;
    ajustesFijos?: { valor: number; fuente: string }[];
    aplicado?: AplicadoId;
    habilidades?: HabilidadId[];
    dificultad?: number;
  }
> = {
  // Su efecto sobre los poderes es la casilla "Bajo Xovromium" del modal del
  // poder (FUENTES_EXTERNAS_FATIGA, catalog/psionica.ts).
  farmaco_xovromium: {
    nota:
      "Voluntad + Biociencia o Actitud (la más alta), dificultad 6. Con éxito, 1 hora: marca «Bajo Xovromium» en tus poderes (+1 a la tirada y −1 de fatiga). " +
      "Si falla, pierdes la dosis, 1 de fatiga y −1 en tiradas mentales 15 minutos. Al acabar el efecto, 2 de fatiga y −2 mentales durante la hora siguiente (a mano).",
    aplicado: "voluntad",
    habilidades: ["biociencia", "actitud"],
    dificultad: 6,
  },
  farmaco_hemostaticos: {
    nota: "Perspicacia + Biociencia (Medicina). Dificultad 7 normal, 9 en hemorragia exanguinante.",
  },
  farmaco_estabilizadores_neurales: {
    nota: "Perspicacia + Biociencia (Medicina), dificultad 6 — purga el aturdimiento.",
  },
  farmaco_calmante: {
    nota: "Perspicacia + Medicina, dificultad 4 — fija la duración y reduce en 1 el penalizador por herida.",
  },
  farmaco_gel_sanador: {
    nota: "Perspicacia + Medicina, dificultad 4 — cada éxito sana un nivel no letal, cada 2 uno letal, cada 4 uno grave.",
  },
  farmaco_gel_sanador_avanzado: {
    nota: "Perspicacia + Medicina, dificultad 4 — igual que Gel Sanador, sin el peaje de fatiga.",
  },
  farmaco_nano_elixir: {
    nota: "Perspicacia + Medicina, dificultad 4 — igual que Gel Sanador Avanzado, con +5 ya sumado a esta tirada.",
    ajustesFijos: [{ valor: 5, fuente: "Nano-Elixir" }],
  },
};

export function accionesDeFarmacos(sheet: Sheet): Accion[] {
  const acciones: Accion[] = [];
  for (const f of FARMACOS) {
    const cantidad = sheet.farmacos[f.id] ?? 0;
    if (cantidad <= 0) continue;
    const con = CON_TIRADA[f.id];
    if (!con) continue;
    const habilidad = (con.habilidades ?? ["biociencia"]).reduce((mejor, h) =>
      sheet.habilidades[h].valor > sheet.habilidades[mejor].valor ? h : mejor,
    );
    acciones.push({
      id: `farmaco_${f.id}`,
      label: `Usar ${f.label}`,
      grupo: "Fármacos",
      aplicado: con.aplicado ?? "perspicacia",
      habilidad,
      nota: `${con.nota} Quedan ${cantidad}.`,
      ajustesFijos: con.ajustesFijos,
      ...(con.dificultad !== undefined && { dificultadSugerida: con.dificultad }),
      farmacoId: f.id,
    });
  }
  return acciones;
}

export function accionesDirectasDeFarmacos(sheet: Sheet): AccionDirecta[] {
  const acciones: AccionDirecta[] = [];
  for (const f of FARMACOS) {
    const cantidad = sheet.farmacos[f.id] ?? 0;
    if (cantidad <= 0) continue;
    if (!SIN_TIRADA.has(f.id)) continue;
    acciones.push({
      id: `farmaco_${f.id}`,
      label: `Usar ${f.label}`,
      grupo: "Fármacos",
      nota: `${f.resumen} Quedan ${cantidad}.`,
      confirmarLabel: "Usar",
      farmacoId: f.id,
    });
  }
  return acciones;
}
