// Convierte los fármacos que el personaje lleva en el pool (sheet.farmacos)
// en su propia fila de Acciones — mismo patrón que herramientas.ts, pero
// sobre un pool con cantidad en vez de equipo instalado (docs/tareas.md,
// "Granadas → recurso con cantidad" es el mismo espíritu). Archivo aparte de
// herramientas.ts a propósito: herramientas son equipo con nivel, fármacos
// son consumibles de cantidad — conceptos distintos aunque el patrón de
// generación se parezca. Fuente: docs/prompt-gasto-recursos.md, Fase 2.
//
// Alcance: genera la fila, tira si corresponde con la dificultad ya conocida (como texto en
// `nota`, nunca como ajustesFijos: ver comentario de CON_TIRADA) y gasta 1 dosis al confirmar. Lo
// que la dosis te hace va por estados (fármacos como estados, usuario 2026-11-14): «Usar» pone el
// del efecto con duración (ESTADO_AL_USAR; con tirada, sus consecuencias propias por grado), y el
// estado lo aplica solo mientras dura (catalog/estados.ts, ESTADOS_DE_FARMACO). Lo que no cabe
// (curación por niveles, sobredosis...) sigue siendo texto y comunicación de mesa.
import { FARMACOS, NO_APILA_NANOMEDICINA } from "../catalog/medicina";
import { equipoPorId, type Consumible } from "../catalog/equipo";
import type { TipoAccionBase } from "./tipoAccion";
import type { Sheet } from "./sheet";
import type { Accion, AccionDirecta } from "./acciones";
import type { AplicadoId } from "./atributos";
import type { HabilidadId } from "./habilidades";
import type { CondicionTirada } from "./condiciones";
import type { ConsecuenciaPropia } from "./consecuenciasPropias";
import type { Grado } from "./psionica";
import type { EstadoAlUsar } from "./sigilo";
import type { EstadoActivo } from "./estados";
import {
  ESTADO_ANTIPATOGENO_ID,
  ESTADO_BAJO_ANALGESICO_ID,
  ESTADO_BAJO_CALMANTE_ID,
  ESTADO_BAJO_ULTRA_ID,
  ESTADO_BAJO_XOVROMIUM_ID,
  ESTADO_RECHAZO_XOVROMIUM_ID,
} from "../catalog/estados";

// Los tres que no llevan tirada (docs/checklist-motor-vs-prosa-2026-09-24.md
// / prompt-gasto-recursos.md): "Usar" gasta la dosis y pone su estado (ESTADO_AL_USAR), sin
// resolución de d12 de por medio.
const SIN_TIRADA = new Set(["farmaco_analgesico", "farmaco_antipatogeno", "farmaco_ultra_estimulante"]);

// El estado que pone usar la dosis (fármacos como estados, usuario 2026-11-14): «Bajo Analgésico»
// (−1 a heridas), «Bajo Ultra Estimulante» (sus bonos y, al acabarse, el bajón: fa-03) y
// «Antipatógeno» (la oportunidad de la segunda salvación, que se gasta al tirarla). Hasta
// quitarlo: la fuente da horas o minutos y la app no mide el tiempo. Usarlo con el estado puesto lo
// renueva (ponerEstado sustituye: no acumula). Lo aplica el servidor (consecuencia propia «usar»).
const ESTADO_AL_USAR: Readonly<Record<string, EstadoAlUsar>> = {
  farmaco_analgesico: { estadoId: ESTADO_BAJO_ANALGESICO_ID, fijo: { gradoId: "activo", turnos: null } },
  farmaco_antipatogeno: { estadoId: ESTADO_ANTIPATOGENO_ID, fijo: { gradoId: "activo", turnos: null } },
  farmaco_ultra_estimulante: { estadoId: ESTADO_BAJO_ULTRA_ID, fijo: { gradoId: "activo", turnos: null } },
};

// Los estados del catálogo que tocan los instantáneos. Como toda consecuencia propia, sobre quien
// tira: con lo que lleva puesto (sin el estado, nada).
// TODO(revisar): administrárselo a otro no se modela (la fila es «Usar» sobre ti); el máster le
// quita o baja el estado desde la Mesa.
const ESTADO_HEMORRAGIA_ID = "hemorragia";
const ESTADO_ATURDIDO_ID = "aturdido";
// Del peor al más leve (catalog/estados.ts).
const GRADOS_ATURDIDO = ["fracaso_critico", "fracaso", "exito"];

// Lo que los Geles te ponen al superar su tirada: los efectos del Analgésico y el Antipatógeno.
function conAnalgesicoAlSuperar(): Partial<Record<Grado, ConsecuenciaPropia>> {
  const c: ConsecuenciaPropia = {
    texto:
      "Incluye el Analgésico y el Antipatógeno: te pones «Bajo Analgésico» (−1 al penalizador por heridas) y " +
      "«Antipatógeno» (segunda salvación con +3). La curación, a mano.",
    estados: [
      { estadoId: ESTADO_BAJO_ANALGESICO_ID, gradoId: "activo" },
      { estadoId: ESTADO_ANTIPATOGENO_ID, gradoId: "activo" },
    ],
  };
  return { critico: c, exito: c };
}

// El resto lleva tirada fija: Perspicacia + Biociencia (especialidad
// Medicina), dificultad ya conocida — puesta en `nota` como texto, NUNCA en
// `ajustesFijos`. Mismo criterio que la tirada fija "medicina" (ACCIONES,
// acciones.ts: "Gel sanador y estabilizar tienen dificultad 4"): ajustesFijos
// es un modificador que se SUMA al resultado (el -2 fijo de un modo de
// disparo), no el número objetivo que el jugador teclea a mano en el modal
// — confundir los dos infla el resultado, no fija la dificultad.
// `ajustesFijos` aquí es SOLO para el +5 real de Nano-Elixir (bono de la
// dosis a la propia tirada, no una dificultad; no se suma con el Enjambre Nanobot, au-07).
// El +3 del Enjambre Nanobot 1 «sobre ti mismo» llega a estas filas como casilla de la pieza
// (grupo Fármacos, catalog/aumentos.ts), no desde aquí.
// Por defecto Perspicacia + Biociencia (Medicina): entera con Medicina, la mitad sin ella;
// `habilidades` con dos = la más alta de la ficha ("Biociencia o Actitud"); `sinEspecialidad`,
// la tirada que no nombra especialidad (Xovromium): entera (docs/sistema.md §3).
const CON_TIRADA: Record<
  string,
  {
    nota: string;
    ajustesFijos?: NonNullable<Accion["ajustesFijos"]>;
    aplicado?: AplicadoId;
    habilidades?: HabilidadId[];
    sinEspecialidad?: true;
    dificultad?: number;
    condiciones?: CondicionTirada[];
    // Lo que el grado de la tirada te hace a ti (rules/consecuenciasPropias.ts); lo aplica el servidor.
    consecuenciasPropias?: Partial<Record<Grado, ConsecuenciaPropia>>;
  }
> = {
  // fa-03 (usuario 2026-11-14): superarla pone «Bajo Xovromium», que aplica solo su efecto en los
  // poderes (FUENTES_EXTERNAS_FATIGA, catalog/psionica.ts, mira el estado) y cuyo botón aplica el
  // bajón al acabarse; fallarla, 1 de fatiga y «Rechazo del Xovromium». La sobredosis (segunda dosis
  // en 4 horas) sigue a mano (fa-04).
  farmaco_xovromium: {
    nota:
      "Voluntad + Biociencia o Actitud (la más alta), dificultad 6. Con éxito, 1 hora: la app te pone «Bajo Xovromium» " +
      "(+1 a la tirada de tus poderes y −1 a su fatiga), y desde él aplicas el bajón al acabarse (2 de fatiga y −2 mentales una hora). " +
      "Si falla, pierdes la dosis y la app te resta 1 de fatiga y te pone «Rechazo del Xovromium» (−1 mentales 15 minutos). " +
      "Una segunda dosis en 4 horas: salvación de Fortaleza (dificultad 8, +2 por dosis extra), a mano.",
    aplicado: "voluntad",
    habilidades: ["biociencia", "actitud"],
    sinEspecialidad: true,
    dificultad: 6,
    consecuenciasPropias: (() => {
      const estabiliza: ConsecuenciaPropia = {
        texto: "Se estabiliza: te pones «Bajo Xovromium» (+1 y −1 de fatiga en tus poderes; el bajón, desde él al acabarse).",
        estados: [{ estadoId: ESTADO_BAJO_XOVROMIUM_ID, gradoId: "activo" }],
      };
      const rechazo: ConsecuenciaPropia = {
        texto: "Rechazo: pierdes la dosis, 1 de fatiga y −1 a las tiradas mentales 15 minutos.",
        fatiga: 1,
        estados: [{ estadoId: ESTADO_RECHAZO_XOVROMIUM_ID, gradoId: "activo" }],
      };
      return { critico: estabiliza, exito: estabiliza, fracaso: rechazo, fracasoCritico: rechazo };
    })(),
  },
  // Dificultades del documento (S94, docs/fuente/equipamiento.md, Fármacos): el modal abre
  // en ellas; la hemorragia exanguinante es una opción de la propia fila (9). Instantáneo (fármacos
  // como estados, usuario 2026-11-14): superarla te quita la Hemorragia («detención inmediata del
  // estado de hemorragia»; la exanguinante no es otro estado, solo pide más).
  farmaco_hemostaticos: {
    nota: "Perspicacia + Biociencia (Medicina). Dificultad 7 normal, 9 en hemorragia exanguinante. Con éxito, la app te quita la Hemorragia.",
    dificultad: 7,
    consecuenciasPropias: (() => {
      const sella: ConsecuenciaPropia = { texto: "Detiene la hemorragia: se te quita «Hemorragia».", estados: [], quita: [ESTADO_HEMORRAGIA_ID] };
      return { critico: sella, exito: sella };
    })(),
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
  // Instantáneo (fármacos como estados, usuario 2026-11-14): «purgar instantáneamente un grado del
  // estado de aturdimiento»; con crítico, «elimina por completo el estado».
  // TODO(revisar): «un grado» leído sobre los grados del Aturdido (los de su salvación): fracaso
  // crítico → fracaso → éxito → fuera (el éxito crítico ya no hace nada).
  farmaco_estabilizadores_neurales: {
    nota:
      "Perspicacia + Biociencia (Medicina), dificultad 6 — purga un grado del aturdimiento; con éxito crítico, el estado entero. " +
      "La app te lo aplica a ti.",
    dificultad: 6,
    consecuenciasPropias: {
      exito: { texto: "Purga un grado del aturdimiento.", estados: [], rebaja: [{ estadoId: ESTADO_ATURDIDO_ID, orden: GRADOS_ATURDIDO }] },
      critico: { texto: "Elimina el aturdimiento.", estados: [], quita: [ESTADO_ATURDIDO_ID] },
    },
  },
  // «Para establecer la duración»: superada, «Bajo Calmante» (−1 a heridas) 1 hora y 1 más por cada
  // 4 éxitos (texto del estado: la app no mide el tiempo). Varias dosis no suman (fa-02); su fatiga
  // y la salvación desde la tercera, a mano.
  // TODO(revisar): la fuente no dice qué pasa si se falla la tirada; se supone que no hace efecto.
  farmaco_calmante: {
    nota:
      "Perspicacia + Medicina, dificultad 4 — con éxito, la app te pone «Bajo Calmante» (−1 al penalizador por heridas): " +
      "1 hora, y 1 más por cada 4 éxitos. Cada dosis más: 4 de fatiga; desde la tercera, Fortaleza 8 (+2 por dosis extra), a mano.",
    dificultad: 4,
    consecuenciasPropias: (() => {
      const calma: ConsecuenciaPropia = {
        texto: "Te pones «Bajo Calmante»: −1 al penalizador por heridas, 1 hora y 1 más por cada 4 éxitos.",
        estados: [{ estadoId: ESTADO_BAJO_CALMANTE_ID, gradoId: "activo" }],
      };
      return { critico: calma, exito: calma };
    })(),
  },
  // Los Geles «incluyen de forma integrada los efectos del analgésico y el antipatógeno» (el
  // Avanzado y el Nano-Elixir funcionan como el Gel): superada la tirada, la app pone «Bajo
  // Analgésico» y «Antipatógeno» (renueva los que hubiera). La curación sigue a mano.
  // TODO(revisar): la fuente no dice si con la tirada fallada el gel hace algo; se supone que no.
  // TODO(revisar): la curación va por éxitos acumulados (margen) y «a discreción del interventor»
  // (no letal, letal o grave), con el peaje de fatiga del Gel por nivel sanado: sin reparto que
  // elegir, la app no la aplica sola.
  farmaco_gel_sanador: {
    nota:
      "Perspicacia + Medicina, dificultad 4 — cada éxito sana un nivel no letal, cada 2 uno letal, cada 4 uno grave (a mano), " +
      "con 1, 2 o 4 de fatiga por nivel sanado. Con éxito, la app te pone «Bajo Analgésico» y «Antipatógeno».",
    dificultad: 4,
    consecuenciasPropias: conAnalgesicoAlSuperar(),
  },
  farmaco_gel_sanador_avanzado: {
    nota: "Perspicacia + Medicina, dificultad 4 — igual que Gel Sanador (curación a mano), sin el peaje de fatiga. Con éxito, «Bajo Analgésico» y «Antipatógeno».",
    dificultad: 4,
    consecuenciasPropias: conAnalgesicoAlSuperar(),
  },
  farmaco_nano_elixir: {
    nota: "Perspicacia + Medicina, dificultad 4 — igual que Gel Sanador Avanzado (curación a mano), con +5 ya sumado a esta tirada. Con éxito, «Bajo Analgésico» y «Antipatógeno».",
    // «No se apila con aumentos tecnológicos de nanomedicina» (au-07): con el Enjambre, el mayor.
    ajustesFijos: [{ valor: 5, fuente: "Nano-Elixir", noApila: NO_APILA_NANOMEDICINA }],
    dificultad: 4,
    consecuenciasPropias: conAnalgesicoAlSuperar(),
  },
};

// `notasEspecie`: FichaResuelta.notasFarmacos (Irota, efectos a la mitad, §14.9), al
// final de la nota de cada fila. Solo texto, como el resto del efecto.
const conNotas = (nota: string, notasEspecie: string[]) => [nota, ...notasEspecie].join(" ");

// «Inyectarse» en la fila (T5c): el tipo de acción de aplicárselo, el de quien viste armadura o
// traje si la fuente lo distingue. Lo rebaja el Inyector Hipodérmico (rules/tipoAccion.ts).
function inyectarse(sheet: Sheet, f: Consumible): TipoAccionBase[] {
  if (!f.aplicacion) return [];
  const { base, conArmadura } = f.aplicacion;
  const conArmaduraPuesta = conArmadura && sheet.equipo.some((p) => equipoPorId(p.catalogoId)?.familia === "armadura");
  return [{ accion: "inyectarse", base: [conArmaduraPuesta ? conArmadura : base] }];
}

// `conAgotados`: también los que ya no quedan. Para el servidor al aplicar lo que la acción te hace
// (consecuencias propias): el cliente gasta la dosis antes, y con la última ya no estaría.
export function accionesDeFarmacos(sheet: Sheet, notasEspecie: string[], conAgotados = false): Accion[] {
  const acciones: Accion[] = [];
  for (const f of FARMACOS) {
    const cantidad = sheet.farmacos[f.id] ?? 0;
    if (cantidad <= 0 && !conAgotados) continue;
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
      ...(con.consecuenciasPropias && { consecuenciasPropias: con.consecuenciasPropias }),
      farmacoId: f.id,
      tiposDeAccionBase: inyectarse(sheet, f),
      origen: { tipo: "farmaco", id: f.id, label: f.label },
    });
  }
  return acciones;
}

// `conAgotados`: como en accionesDeFarmacos.
export function accionesDirectasDeFarmacos(sheet: Sheet, notasEspecie: string[], conAgotados = false): AccionDirecta[] {
  const acciones: AccionDirecta[] = [];
  for (const f of FARMACOS) {
    const cantidad = sheet.farmacos[f.id] ?? 0;
    if (cantidad <= 0 && !conAgotados) continue;
    if (!SIN_TIRADA.has(f.id)) continue;
    acciones.push({
      id: `farmaco_${f.id}`,
      label: `Usar ${f.label}`,
      grupo: "Fármacos",
      nota: conNotas(`${f.resumen} Quedan ${cantidad}.`, notasEspecie),
      confirmarLabel: "Usar",
      farmacoId: f.id,
      tiposDeAccionBase: inyectarse(sheet, f),
      ...(ESTADO_AL_USAR[f.id] && { estadoAlUsar: ESTADO_AL_USAR[f.id] }),
      origen: { tipo: "farmaco", id: f.id, label: f.label },
    });
  }
  return acciones;
}

// Antipatógeno (R9, 2026-10-24): "permite una segunda tirada de salvación, con un bonificador de
// +3" si el personaje está envenenado, enfermo o intoxicado. Oportunidad puntual (fármacos como
// estados, usuario 2026-11-14): la casilla sale en la salvación de Fortaleza solo con el estado
// «Antipatógeno» puesto (lo pone su «Usar» o superar un Gel, que «incluye sus efectos») y tirar con
// ella marcada lo gasta (`gastaEstado`). Sin el estado no sale, aunque queden dosis.
export const ID_CASILLA_ANTIPATOGENO = "farmaco_antipatogeno_segunda_salvacion";

export function casillasDeFarmacos(estados: readonly EstadoActivo[]): CondicionTirada[] {
  if (!estados.some((e) => e.estadoId === ESTADO_ANTIPATOGENO_ID)) return [];
  return [
    {
      id: ID_CASILLA_ANTIPATOGENO,
      tipo: "toggle",
      etiqueta: "Segunda salvación con Antipatógeno",
      valorActivo: 3,
      alcance: { tipo: "tiradaId", id: "salv_fortaleza" },
      nota:
        "Solo envenenado, enfermo o intoxicado: la segunda salvación que da el Antipatógeno (o un Gel " +
        "Sanador, que incluye su efecto). Revierte un nivel de gravedad. Tirarla gasta el estado " +
        "«Antipatógeno». Uno cada 8 horas.",
      gastaEstado: ESTADO_ANTIPATOGENO_ID,
      origen: { tipo: "estado", id: ESTADO_ANTIPATOGENO_ID, label: "Antipatógeno" },
    },
  ];
}
