// Psiónica: forma de los poderes y compra de disciplinas. Fuente de las reglas:
// docs/sistema.md §10.6; forma de los datos: MODELO_PSIONICA (v2) en
// scripts/workflows/modelar-area-extraer.ts. Principio: la app calcula lo que
// sale de la ficha de quien usa el poder; lo que hace el objetivo es texto tras
// tirar; lo que se cuenta en mesa es mensaje.
import type { AplicadoId } from "./atributos";
import type { HabilidadId } from "./habilidades";
import type { MotorMetadata } from "./motor";
import { clampInt, type Sheet } from "./sheet";
import { costeTotal, COSTE_FACTOR_PSIONICA, PUNTOS_PSIONICA_POR_LETRA } from "./prioridad";
import { DISCIPLINAS, disciplinaPorId, type DisciplinaId } from "../catalog/psionica";

// ── Forma de los datos ─────────────────────────────────────────────

// porNivel = × nivel EMPLEADO; porNivelPoseido = × nivel POSEÍDO. "Nivel de poder"
// a secas en la prosa es el poseído; el empleado solo si la prosa lo dice o lo
// fija una fila de tabla.
export type Valor =
  | number
  | { base: number; porNivel?: number; porNivelPoseido?: number; porAplicado?: { aplicado: AplicadoId; valor: number } }
  | { opciones: { label: string; valor: number }[]; ajusteMaster: true } // referencias; la dificultad la escribe el jugador
  | { manual: string }; // solo texto

export type Economia = "gratuita" | "simple" | "estandar" | "compleja" | "reaccion" | { tiempo: string };

export const GRADOS = ["critico", "exito", "fracaso", "fracasoCritico"] as const;
export type Grado = (typeof GRADOS)[number];

export type ResolucionPoder =
  | { tipo: "sin_dado" }
  | { tipo: "tirada"; aplicado: AplicadoId; habilidad: HabilidadId | HabilidadId[]; especialidad?: string; dificultad?: Valor; modificador?: number }
  | { tipo: "enfrentada"; aplicado: AplicadoId; habilidad: HabilidadId | HabilidadId[]; especialidad?: string; modificador?: number }
  | {
      tipo: "ataque";
      aplicado: AplicadoId;
      habilidad: HabilidadId | HabilidadId[];
      especialidad?: string;
      modificador?: number;
      danio: Valor | "tabla";
      categoria: string;
      // Hace daño aunque la tirada falle (Expansión: se desvía y estalla igual);
      // al fallar, el daño base sin bono por éxitos.
      danioAlFallar?: boolean;
    };

// Los textos (grados, notas) pueden llevar marcadores `{campo}` o `{campo/2}` que
// el evaluador rellena con el valor ya resuelto: así una opción que cambia el
// desplazamiento (Impulso Poderoso) no deja los metros del texto desfasados.
export type TiradaObjetivo = { que: string; dificultad?: Valor; grados?: Partial<Record<Grado, string>> };

export type ResultadoPoder = {
  texto: string;
  estados: { estado: string; duracion: Valor; sobre: "objetivo" | "propio" }[];
  danio?: { valor: Valor; categoria: string; sobre: "objetivo" | "propio" };
};

export type BonoToggle = {
  etiqueta: string;
  alcance: string; // id de acción, grupo ("Salvaciones") o "alerta"
  valor: number;
  desdeNivelPoseido?: number;
};

export type Nota = { texto: string; lugar: "tirada" | "danio" };

export type AccionPoder = {
  id: string; // "psi_<disciplina>_<accion>"
  label: string;
  desdeNivel: number; // nivel POSEÍDO mínimo
  economia: Economia | "tabla";
  fatiga: Valor | "tabla"; // coste BASE; los descuentos van como ModificadorFatiga
  permiteFatigaTemporal: boolean; // solo Proeza
  alcance: Valor | "tabla" | null;
  duracion: Valor | null;
  objetivo: { tipo: "unico" | "casilla" | "varios" | "propio" | "aliado"; area?: Valor | "tabla" } | null;
  desplazamiento: Valor | "tabla" | null;
  resolucion: ResolucionPoder;
  porObjetivo?: { organico?: Partial<AccionPoder>; sintetico?: Partial<AccionPoder> };
  objetivoTira: TiradaObjetivo[]; // SOLO TEXTO tras tirar
  ejes: EjePoder[];
  resultados: Partial<Record<Grado, ResultadoPoder>>; // desde el punto de vista de quien tira
  danioPropio: { valor: Valor; categoria: string } | null;
  multiplesObjetivos: { texto: string; fatigaPorObjetivo: Valor } | null; // mensaje; fatiga a mano
  notas: Nota[];
  togglesPropios: BonoToggle[];
  bonosEnOtrasTiradas: BonoToggle[];
  movimientoOtorgado: { tipo: "levitar"; velocidad: Valor } | null;
  ajustesPorNivelPoseido: { desdeNivel: number; sobre: string; op: "sustituye" | "suma" | "multiplica"; valor: Valor | Economia | string }[];
  manual: string[];
  motor: MotorMetadata[];
};

// Lo que una opción puede sustituir. `resolucion` va parcial: una fila de nivel
// solo fija el daño sin repetir aplicado/habilidad.
export type CambiosOpcion = Partial<
  Pick<AccionPoder, "economia" | "fatiga" | "alcance" | "duracion" | "resultados" | "objetivoTira" | "notas" | "danioPropio" | "desplazamiento" | "objetivo">
> & { resolucion?: Partial<ResolucionPoder> & { danio?: Valor } };

export type Opcion = {
  id: string;
  label: string;
  desdeNivel?: number;
  cambia: CambiosOpcion; // SUSTITUYE
  // SUMA sobre lo ya resuelto por los otros ejes (ruta → +N); `*` recorre un array.
  suma?: Record<string, number>;
};

export type EjePoder = { id: string; label: string; tipo: "nivel_empleado" | "opcion"; opciones: Opcion[] };

// Cadena semi-global de fatiga (orden fijo): descuentos por nivel → ×2 Munición
// Supresora → Xovromium −1 → mínimo (0 salvo que la prosa diga 1) → pago con cargas.
export type ModificadorFatiga = {
  fuente: string;
  alcance: {
    rama?: Rama;
    disciplina?: DisciplinaId;
    accion?: string;
    opcion?: { eje: string; opcion: string };
    nivelEmpleadoMax?: number;
    nivelEmpleadoMin?: number;
  };
  desdeNivelPoseido?: number;
  condicion?: { toggle: string };
  op: "suma" | "multiplica" | "minimo" | "ignora_primero" | "paga_con_recurso";
  valor: number | { recurso: string; porPunto: number };
};

export type Rama = "metasensoria" | "metrica";

export type NivelDisciplina = {
  nivel: number;
  fatiga?: Valor;
  economia?: Economia;
  alcance?: Valor;
  carga?: Valor;
  duracion?: Valor;
};

export type Disciplina = {
  id: DisciplinaId;
  label: string;
  rama: Rama;
  requisito: { disciplina: DisciplinaId; nivel: number } | null;
  porNivel: NivelDisciplina[];
  reglas: { id: string; texto: string; aplica: "todas" | string[] }[];
  modificadoresFatiga: ModificadorFatiga[];
  modificadoresEconomia: {
    fuente: string;
    desdeNivelPoseido: number;
    alcance: { accion?: string; nivelEmpleado?: number };
    op: "baja_un_paso" | "sustituye";
    valor?: Economia;
  }[];
  bonosEnOtrasTiradas: BonoToggle[];
  ventajas: { desdeNivelPoseido: number; acciones: string[] }[];
  acciones: AccionPoder[];
};

export type CatalogoPsionica = {
  sobrecarga: {
    umbral: "exhausto";
    inconsciencia: "automatica";
    salvacion: { aplicado: AplicadoId; dificultad: Valor };
    danio: { valor: Valor; categoria: "letal"; absorbible: false };
    multiplicadorPorGrado: Record<Grado, number>;
  };
  disciplinas: Disciplina[];
};

// ── Compra de disciplinas ──────────────────────────────────────────
// Nivel N cuesta N×3 (triangular, como atributos ×2 y habilidades ×1). Sin tope
// propio de creación: con la letra A (18 pts) ya no se pasa de 3 en una sola.

export const DISCIPLINA_MAX = 6;

export function nivelDisciplina(sheet: Sheet, id: DisciplinaId): number {
  return sheet.psionica[id] ?? 0;
}

export function presupuestoPsionica(sheet: Sheet): number {
  const letra = sheet.prioridades.psionica;
  return letra ? PUNTOS_PSIONICA_POR_LETRA[letra] : 0;
}

export function puntosPsionicaGastados(sheet: Sheet): number {
  return DISCIPLINAS.reduce((total, d) => total + costeTotal(nivelDisciplina(sheet, d.id), COSTE_FACTOR_PSIONICA), 0);
}

export function puntosPsionicaDisponibles(sheet: Sheet): number {
  return presupuestoPsionica(sheet) - puntosPsionicaGastados(sheet);
}

export function cumpleRequisito(sheet: Sheet, id: DisciplinaId): boolean {
  const { requisito } = disciplinaPorId(id);
  return !requisito || nivelDisciplina(sheet, requisito.disciplina) >= requisito.nivel;
}

// Nivel mínimo al que se puede bajar `id` sin dejar colgada una disciplina que la
// tiene de requisito (bajar Traslación a 1 con Singularidad comprada se bloquea).
export function sueloPorRequisitos(sheet: Sheet, id: DisciplinaId): number {
  return DISCIPLINAS.reduce(
    (suelo, d) =>
      d.requisito?.disciplina === id && nivelDisciplina(sheet, d.id) > 0 ? Math.max(suelo, d.requisito.nivel) : suelo,
    0,
  );
}

// Fija el nivel respetando requisitos en los dos sentidos. No mira el pool: eso lo
// añade la compra de creación; la subida con XP (ficha aprobada) cobra aparte.
export function setNivelDisciplina(sheet: Sheet, id: DisciplinaId, value: number): Sheet {
  const actual = nivelDisciplina(sheet, id);
  const v = clampInt(value, 0, DISCIPLINA_MAX, actual);
  if (v > 0 && !cumpleRequisito(sheet, id)) return sheet;
  if (v < sueloPorRequisitos(sheet, id)) return sheet;
  const psionica = { ...sheet.psionica };
  if (v > 0) psionica[id] = v;
  else delete psionica[id];
  return { ...sheet, psionica };
}

export function setDisciplinaValue(sheet: Sheet, id: DisciplinaId, value: number): Sheet {
  const next = setNivelDisciplina(sheet, id, value);
  return puntosPsionicaDisponibles(next) < 0 ? sheet : next;
}
