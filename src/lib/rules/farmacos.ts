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
import type { CondicionTirada } from "./condiciones";

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
// Por defecto Perspicacia + Biociencia (Medicina): entera con Medicina, la mitad sin ella;
// `habilidades` con dos = la más alta de la ficha ("Biociencia o Actitud"); `sinEspecialidad`,
// la tirada que no nombra especialidad (Xovromium): entera (docs/sistema.md §3).
const CON_TIRADA: Record<
  string,
  {
    nota: string;
    ajustesFijos?: { valor: number; fuente: string }[];
    aplicado?: AplicadoId;
    habilidades?: HabilidadId[];
    sinEspecialidad?: true;
    dificultad?: number;
    condiciones?: CondicionTirada[];
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
    sinEspecialidad: true,
    dificultad: 6,
  },
  // Dificultades del documento (S94, docs/fuente/equipamiento.md, Fármacos): el modal abre
  // en ellas; la hemorragia exanguinante es una opción de la propia fila (9).
  farmaco_hemostaticos: {
    nota: "Perspicacia + Biociencia (Medicina). Dificultad 7 normal, 9 en hemorragia exanguinante.",
    dificultad: 7,
    condiciones: [
      {
        id: "hemostaticos_hemorragia",
        tipo: "opcion",
        etiqueta: "Hemorragia",
        opciones: [
          { id: "normal", etiqueta: "Normal", valor: 0, sinValor: true, dificultad: 7 },
          { id: "exanguinante", etiqueta: "Exanguinante", valor: 0, sinValor: true, dificultad: 9 },
        ],
        porDefecto: "normal",
      },
    ],
  },
  farmaco_estabilizadores_neurales: {
    nota: "Perspicacia + Biociencia (Medicina), dificultad 6 — purga un grado del aturdimiento; con éxito crítico, el estado entero.",
    dificultad: 6,
  },
  farmaco_calmante: {
    nota: "Perspicacia + Medicina, dificultad 4 — fija la duración y reduce en 1 el penalizador por herida.",
    dificultad: 4,
  },
  farmaco_gel_sanador: {
    nota: "Perspicacia + Medicina, dificultad 4 — cada éxito sana un nivel no letal, cada 2 uno letal, cada 4 uno grave.",
    dificultad: 4,
  },
  farmaco_gel_sanador_avanzado: {
    nota: "Perspicacia + Medicina, dificultad 4 — igual que Gel Sanador, sin el peaje de fatiga.",
    dificultad: 4,
  },
  farmaco_nano_elixir: {
    nota: "Perspicacia + Medicina, dificultad 4 — igual que Gel Sanador Avanzado, con +5 ya sumado a esta tirada.",
    ajustesFijos: [{ valor: 5, fuente: "Nano-Elixir" }],
    dificultad: 4,
  },
};

// `notasEspecie`: FichaResuelta.notasFarmacos (Irota, efectos a la mitad, §14.9), al
// final de la nota de cada fila. Solo texto, como el resto del efecto.
const conNotas = (nota: string, notasEspecie: string[]) => [nota, ...notasEspecie].join(" ");

export function accionesDeFarmacos(sheet: Sheet, notasEspecie: string[]): Accion[] {
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
      ...(!con.sinEspecialidad && { especialidadesAccion: ["medicina" as const] }),
      nota: conNotas(`${con.nota} Quedan ${cantidad}.`, notasEspecie),
      ajustesFijos: con.ajustesFijos,
      ...(con.dificultad !== undefined && { dificultadSugerida: con.dificultad }),
      ...(con.condiciones && { condiciones: con.condiciones }),
      farmacoId: f.id,
    });
  }
  return acciones;
}

export function accionesDirectasDeFarmacos(sheet: Sheet, notasEspecie: string[]): AccionDirecta[] {
  const acciones: AccionDirecta[] = [];
  for (const f of FARMACOS) {
    const cantidad = sheet.farmacos[f.id] ?? 0;
    if (cantidad <= 0) continue;
    if (!SIN_TIRADA.has(f.id)) continue;
    acciones.push({
      id: `farmaco_${f.id}`,
      label: `Usar ${f.label}`,
      grupo: "Fármacos",
      nota: conNotas(`${f.resumen} Quedan ${cantidad}.`, notasEspecie),
      confirmarLabel: "Usar",
      farmacoId: f.id,
    });
  }
  return acciones;
}

// Antipatógeno (R9, 2026-10-24): "permite una segunda tirada de salvación, con un bonificador de
// +3" si el personaje está envenenado, enfermo o intoxicado. Casilla en la salvación de Fortaleza
// mientras queda alguna dosis de algo que lo incluya (los Geles Sanadores "incluyen los efectos
// del Analgésico y el Antipatógeno"; el Avanzado y el Nano-Elixir funcionan como el Gel). La dosis
// se gasta con su "Usar"; la casilla no gasta nada.
export const ID_CASILLA_ANTIPATOGENO = "farmaco_antipatogeno_segunda_salvacion";
const CON_EFECTO_ANTIPATOGENO = [
  "farmaco_antipatogeno",
  "farmaco_gel_sanador",
  "farmaco_gel_sanador_avanzado",
  "farmaco_nano_elixir",
];

// Ultra Estimulante (S94, docs/fuente/equipamiento.md, Fármacos): "+2 a la iniciativa y +1 a
// las acciones físicas basadas en Agilidad o Fuerza" durante 30 minutos. Casilla «Bajo Ultra
// Estimulante» siempre visible, como la de Xovromium (usuario, 2026-09-30: la app no sabe si te
// la has tomado, y el efecto sigue tras gastar la última dosis). Física = tirada con un aplicado
// que lleve Fuerza o Agilidad (Fortaleza, Potencia, Reflejos), sin las salvaciones. Las dos
// casillas no se apilan: una Iniciativa con Reflejos se queda en +2. La reducción de los
// penalizadores por heridas y fatiga y el bajón al terminar siguen a mano.
export const ID_CASILLA_ULTRA_INICIATIVA = "farmaco_ultra_estimulante_iniciativa";
export const ID_CASILLA_ULTRA_FISICAS = "farmaco_ultra_estimulante_fisicas";
const ETIQUETA_ULTRA = "Bajo Ultra Estimulante";
const NOTA_ULTRA =
  "30 minutos desde la dosis. Al terminar: 2 de fatiga y −1 en tiradas mentales durante una hora (a mano).";

const CASILLAS_ULTRA_ESTIMULANTE: CondicionTirada[] = [
  {
    id: ID_CASILLA_ULTRA_INICIATIVA,
    tipo: "toggle",
    etiqueta: ETIQUETA_ULTRA,
    valorActivo: 2,
    noApila: "ultra_estimulante",
    nota: NOTA_ULTRA,
    alcance: { tipo: "grupo", grupo: "Iniciativa" },
  },
  {
    id: ID_CASILLA_ULTRA_FISICAS,
    tipo: "toggle",
    etiqueta: ETIQUETA_ULTRA,
    valorActivo: 1,
    noApila: "ultra_estimulante",
    nota: NOTA_ULTRA,
    alcance: { tipo: "aplicado", aplicados: ["fortaleza", "potencia", "reflejos"], salvoGrupo: "Salvaciones" },
  },
];

export function casillasDeFarmacos(sheet: Pick<Sheet, "farmacos">): CondicionTirada[] {
  if (!CON_EFECTO_ANTIPATOGENO.some((id) => (sheet.farmacos[id] ?? 0) > 0)) return CASILLAS_ULTRA_ESTIMULANTE;
  return [
    ...CASILLAS_ULTRA_ESTIMULANTE,
    {
      id: ID_CASILLA_ANTIPATOGENO,
      tipo: "toggle",
      etiqueta: "Segunda salvación con Antipatógeno",
      valorActivo: 3,
      alcance: { tipo: "tiradaId", id: "salv_fortaleza" },
      nota:
        "Solo envenenado, enfermo o intoxicado: la segunda salvación que da el Antipatógeno (o un Gel " +
        "Sanador, que incluye su efecto). Revierte un nivel de gravedad. Uno cada 8 horas; la dosis se " +
        "gasta con su «Usar».",
    },
  ];
}
