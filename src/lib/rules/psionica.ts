// Psiónica: forma de los poderes y compra de disciplinas. Fuente de las reglas:
// docs/sistema.md §10.6; forma de los datos: MODELO_PSIONICA (v2) en
// scripts/workflows/modelar-area-extraer.ts. Principio: la app calcula lo que
// sale de la ficha de quien usa el poder; lo que hace el objetivo es texto tras
// tirar; lo que se cuenta en mesa es mensaje.
import type { AplicadoId } from "./atributos";
import type { HabilidadId } from "./habilidades";
import type { EspecialidadId } from "../catalog/especialidades";
import type { MotorMetadata } from "./motor";
import { clampInt, type Sheet } from "./sheet";
import { PUNTOS_PSIONICA_POR_LETRA } from "./prioridad";
import { costeNivelDisciplina, type AjusteCoste } from "./progresion";
import { bonoDisciplina, type ModificadorConFuente } from "./modificadores";
import { DISCIPLINAS, disciplinaPorId, type DisciplinaId } from "../catalog/psionica";

// ── Forma de los datos ─────────────────────────────────────────────

// porNivel = × nivel EMPLEADO; porNivelPoseido = × nivel POSEÍDO. "Nivel de poder"
// a secas en la prosa es el poseído; el empleado solo si la prosa lo dice o lo
// fija una fila de tabla. porCadaNiveles = 1 por cada `cada` niveles EMPLEADOS, hacia
// abajo y con mínimo (Sobrecarga Métrica: "1 por cada dos niveles empleados, mínimo 1").
export type Valor =
  | number
  | {
      base: number;
      porNivel?: number;
      porNivelPoseido?: number;
      porAplicado?: { aplicado: AplicadoId; valor: number };
      porCadaNiveles?: { cada: number; minimo: number };
    }
  | { opciones: { label: string; valor: number }[]; ajusteMaster: true } // referencias; la dificultad la escribe el jugador
  // Fracción del alcance de la fila de OTRA disciplina, a su nivel en la ficha
  // (Sondeo: ¼ del alcance de tu Resonancia).
  | { alcanceDe: DisciplinaId; fraccion: number }
  | { manual: string }; // solo texto

export type Economia = "gratuita" | "simple" | "estandar" | "compleja" | "reaccion" | { tiempo: string };

export const GRADOS = ["critico", "exito", "fracaso", "fracasoCritico"] as const;
export type Grado = (typeof GRADOS)[number];

export type ResolucionPoder =
  | { tipo: "sin_dado" }
  | { tipo: "tirada"; aplicado: AplicadoId; habilidad: HabilidadId | HabilidadId[]; especialidad?: EspecialidadId; dificultad?: Valor; modificador?: number }
  | { tipo: "enfrentada"; aplicado: AplicadoId; habilidad: HabilidadId | HabilidadId[]; especialidad?: EspecialidadId; modificador?: number }
  | {
      tipo: "ataque";
      aplicado: AplicadoId;
      habilidad: HabilidadId | HabilidadId[];
      especialidad?: EspecialidadId;
      modificador?: number;
      danio: Valor | "tabla";
      categoria: string;
      // Hace daño aunque la tirada falle (Expansión: se desvía y estalla igual);
      // al fallar, el daño base sin bono por éxitos.
      danioAlFallar?: boolean;
    };

// Los textos (grados, notas) pueden llevar marcadores `{campo}`, `{campo/2}` o `{campo*2}` que
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
  alcance: string; // id de acción o grupo ("Salvaciones")
  valor: number;
  // Tramo de nivel poseído en que vale (Estabilización: +2 hasta 3, +3 en 4-5, +4
  // en 6), para que los tramos no se sumen entre sí.
  desdeNivelPoseido?: number;
  hastaNivelPoseido?: number;
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
  // Mensaje; la fatiga de los objetivos extra se descuenta a mano. Sin
  // fatigaPorObjetivo, cada uno paga lo mismo que el poder.
  multiplesObjetivos: { texto: string; fatigaPorObjetivo?: Valor } | null;
  notas: Nota[];
  togglesPropios: BonoToggle[];
  bonosEnOtrasTiradas: BonoToggle[];
  movimientoOtorgado: { tipo: "levitar"; velocidad: Valor } | null;
  // `sobre` admite ruta con puntos ("datos.2.valor"). `nivelEmpleado` y `opcion`
  // lo restringen a un nivel empleado / una opción elegida (Contención: con nivel 6,
  // emplear el nivel 1 personal es gratis).
  ajustesPorNivelPoseido: {
    desdeNivel: number;
    nivelEmpleado?: number;
    opcion?: { eje: string; opcion: string };
    sobre: string;
    op: "sustituye" | "suma" | "multiplica";
    valor: Valor | Economia | string;
  }[];
  // Proeza: la fatiga extra sale del peso del objetivo que escribe el jugador
  // frente a la carga máxima de la fila (+N por cada 10 % completo de exceso,
  // mínimo `minimo`); al llegar a `limitePorcentaje` de la carga se aplica
  // `danioAlLimite`, y por encima no se puede.
  excesoDeCarga?: {
    fatigaPorCada10: number;
    minimo: number;
    limitePorcentaje: number;
    danioAlLimite: { valor: number; categoria: string };
  };
  // Datos del poder que se enseñan tal cual en su ficha (Contención: absorción,
  // −Agilidad…) y que el jugador aplica a mano.
  datos?: { etiqueta: string; valor: Valor }[];
  manual: string[];
  // Unidades para mostrar; por defecto metros en alcance, área y desplazamiento.
  unidades?: { alcance?: string; area?: string; desplazamiento?: string; duracion?: string };
  motor: MotorMetadata[];
};

// Lo que una opción puede sustituir. `resolucion` va parcial: una fila de nivel
// solo fija el daño sin repetir aplicado/habilidad.
export type CambiosOpcion = Partial<
  Pick<
    AccionPoder,
    | "economia"
    | "fatiga"
    | "alcance"
    | "duracion"
    | "resultados"
    | "objetivoTira"
    | "notas"
    | "danioPropio"
    | "desplazamiento"
    | "objetivo"
    | "multiplesObjetivos"
    | "datos"
  >
> & { resolucion?: Partial<ResolucionPoder> & { danio?: Valor } };

export type Opcion = {
  id: string;
  label: string;
  desdeNivel?: number;
  // Nivel empleado que fija una opción de eje de nivel cuyo id no es `nN`
  // (Resonancia: el alcance Local cuenta como nivel 1).
  nivel?: number;
  cambia: CambiosOpcion; // SUSTITUYE
  // SUMA sobre lo ya resuelto por los otros ejes (ruta → +N); `*` recorre un array.
  suma?: Record<string, number>;
  // Multiplica el tiempo de la acción ya resuelta (Rastreo: ×2 vagamente
  // conocido, ×10 desconocido, sobre el tiempo de la fila usada).
  multiplicaTiempo?: number;
};

// `porDefecto`: opción elegida si no se pide otra (sin él, el nivel empleado más
// alto o la primera opción).
export type EjePoder = { id: string; label: string; tipo: "nivel_empleado" | "opcion"; opciones: Opcion[]; porDefecto?: string };

// Cadena semi-global de fatiga (orden fijo): descuentos por nivel → ×2 Munición
// Supresora → Xovromium −1 → mínimo (0 salvo que la prosa diga 1) → pago con cargas.
export type ModificadorFatiga = {
  fuente: string;
  alcance: {
    rama?: Rama;
    disciplina?: DisciplinaId;
    accion?: string | string[];
    opcion?: { eje: string; opcion: string };
    nivelEmpleadoMax?: number;
    nivelEmpleadoMin?: number;
  };
  desdeNivelPoseido?: number;
  // Lo declara el jugador con una casilla. Casillas del mismo `grupo` se
  // excluyen entre sí (la carga no puede ser a la vez < 10 kg y otra cosa).
  condicion?: { toggle: string; grupo?: string };
  op: "suma" | "multiplica" | "minimo" | "ignora_primero" | "paga_con_recurso";
  valor: number | { recurso: string; porPunto: number };
  // Lo que la misma casilla hace además de tocar la fatiga: sumar a la tirada del
  // poder (Xovromium +1, Munición Supresora −2) o hacer 1 de daño propio por punto
  // de fatiga gastado (Supresora con fallo crítico).
  ademas?: { tirada?: number; danioPorPunto?: string };
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
    alcance: { accion?: string; nivelEmpleado?: number; opcion?: { eje: string; opcion: string } };
    op: "baja_un_paso" | "sustituye";
    valor?: Economia;
  }[];
  bonosEnOtrasTiradas: BonoToggle[];
  // `acciones`: ids de acciones de poder o de tiradas fijas ("alerta_activa").
  // `condicion`: lo que la app no comprueba y se enseña junto al aviso.
  ventajas: { desdeNivelPoseido: number; acciones: string[]; condicion?: string }[];
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
// Nivel N cuesta N×3 salvo ajuste de especie (progresion.ts) (triangular, como atributos ×2 y habilidades ×1). Sin tope
// propio de creación: con la letra A (18 pts) ya no se pasa de 3 en una sola.

export const DISCIPLINA_MAX = 6;

export function nivelDisciplina(sheet: Sheet, id: DisciplinaId): number {
  return sheet.psionica[id] ?? 0;
}

export function presupuestoPsionica(sheet: Sheet): number {
  const letra = sheet.prioridades.psionica;
  return letra ? PUNTOS_PSIONICA_POR_LETRA[letra] : 0;
}

// Con los descuentos de especie (§14.6: Arianyi, Maolher) ya resueltos en `ajuste`.
export function costeDisciplina(nivel: number, ajuste: AjusteCoste): number {
  let total = 0;
  for (let n = 1; n <= nivel; n++) total += costeNivelDisciplina(n, ajuste);
  return total;
}

export function puntosPsionicaGastados(sheet: Sheet, ajuste: AjusteCoste): number {
  return DISCIPLINAS.reduce((total, d) => total + costeDisciplina(nivelDisciplina(sheet, d.id), ajuste), 0);
}

export function puntosPsionicaDisponibles(sheet: Sheet, ajuste: AjusteCoste): number {
  return presupuestoPsionica(sheet) - puntosPsionicaGastados(sheet, ajuste);
}

// ── Nivel efectivo (§14.6) ─────────────────────────────────────────
// Comprado = lo que guarda la ficha (y lo único que miran el coste, el tope de 6 y
// la XP). Efectivo = comprado + modificadores de tipo "disciplina" (Resonancia +1
// del Arianyi), también con 0 comprado, y puede pasar de 6: es el que miran los
// requisitos. Para efectos (poderes, bonos por nivel) se usa `paraEfectos`, el
// efectivo recortado a 6: un 7 cumple cualquier "desde nivel X" y usa la fila del 6.
//
// Los bonos llegan siempre por parámetro, ya resueltos (FichaResuelta.psionica.bonos
// en pantalla; bonosDeDisciplina(modificadoresActivos(sheet)) en el servidor), mismo
// patrón que AjusteCoste: aquí no se lee la especie.

export type BonosDisciplina = Partial<Record<DisciplinaId, number>>;
export const SIN_BONOS_DISCIPLINA: BonosDisciplina = {};

export function bonosDeDisciplina(mods: ModificadorConFuente[]): BonosDisciplina {
  const bonos: BonosDisciplina = {};
  for (const d of DISCIPLINAS) {
    const b = bonoDisciplina(mods, d.id);
    if (b !== 0) bonos[d.id] = b;
  }
  return bonos;
}

export type NivelDisciplinaResuelto = { comprado: number; bono: number; efectivo: number; paraEfectos: number };

// Niveles para efectos de todas las disciplinas: lo que reciben los poderes.
export type NivelesPsionica = Record<DisciplinaId, number>;

export type PsionicaResuelta = {
  disciplinas: Record<DisciplinaId, NivelDisciplinaResuelto>;
  paraEfectos: NivelesPsionica;
  bonos: BonosDisciplina;
  // Disciplinas con nivel y el requisito sin cumplir (cambio de especie sin reset).
  requisitosRotos: DisciplinaId[];
};

export function nivelEfectivo(sheet: Sheet, id: DisciplinaId, bonos: BonosDisciplina): number {
  return Math.max(0, nivelDisciplina(sheet, id) + (bonos[id] ?? 0));
}

export function nivelesDePsionica(sheet: Sheet, bonos: BonosDisciplina): PsionicaResuelta {
  const disciplinas = {} as Record<DisciplinaId, NivelDisciplinaResuelto>;
  const paraEfectos = {} as NivelesPsionica;
  for (const d of DISCIPLINAS) {
    const efectivo = nivelEfectivo(sheet, d.id, bonos);
    const nivel = {
      comprado: nivelDisciplina(sheet, d.id),
      bono: bonos[d.id] ?? 0,
      efectivo,
      paraEfectos: Math.min(efectivo, DISCIPLINA_MAX),
    };
    disciplinas[d.id] = nivel;
    paraEfectos[d.id] = nivel.paraEfectos;
  }
  return { disciplinas, paraEfectos, bonos, requisitosRotos: requisitosRotos(sheet, bonos) };
}

// "2 (1 + 1 especie)" con bono; el nivel a secas sin él. Una línea por origen del
// modificador (especie, equipo…), para la ficha.
// Cabecera de la disciplina en Acciones. Con un 7 (Resonancia +1 sobre 6) los efectos
// usan la fila del 6 (S24): se dicen los dos para que no parezca un error frente al
// 7 de la pestaña Psiónica.
export function textoNivelEnAcciones(nivel: NivelDisciplinaResuelto): string {
  return nivel.paraEfectos < nivel.efectivo
    ? `nivel ${nivel.efectivo} · efectos de nivel ${nivel.paraEfectos}`
    : `nivel ${nivel.efectivo}`;
}

export function textoNivelDisciplina(
  nivel: NivelDisciplinaResuelto,
  mods: ModificadorConFuente[],
  id: DisciplinaId,
): string {
  if (nivel.bono === 0) return String(nivel.efectivo);
  const porOrigen = new Map<string, number>();
  for (const m of mods) {
    if (m.tipo === "disciplina" && m.id === id) porOrigen.set(m.origen, (porOrigen.get(m.origen) ?? 0) + m.valor);
  }
  const partes = [...porOrigen.entries()].map(([origen, v]) => `${v >= 0 ? "+ " : "− "}${Math.abs(v)} ${origen}`);
  return `${nivel.efectivo} (${nivel.comprado} ${partes.join(" ")})`;
}

export function cumpleRequisito(sheet: Sheet, id: DisciplinaId, bonos: BonosDisciplina): boolean {
  const { requisito } = disciplinaPorId(id);
  return !requisito || nivelEfectivo(sheet, requisito.disciplina, bonos) >= requisito.nivel;
}

// Requisito roto (decisión del usuario, 2026-10-13): el máster con la ficha aprobada
// o un NPC cambian de especie sin reset, y puede quedar p. ej. Inducción comprada con
// la Resonancia efectiva a 0 (ex-Arianyi). No se borra nada: Psiónica la marca, y
// en Acciones sus poderes salen bloqueados y sin efectos (bloqueoPorRequisito,
// poderes.ts), para que el máster vea qué ha roto.
export function requisitosRotos(sheet: Sheet, bonos: BonosDisciplina): DisciplinaId[] {
  return DISCIPLINAS.filter((d) => nivelEfectivo(sheet, d.id, bonos) > 0 && !cumpleRequisito(sheet, d.id, bonos)).map(
    (d) => d.id,
  );
}

// Nivel COMPRADO mínimo al que se puede bajar `id` sin dejar colgada una disciplina
// que la tiene de requisito (bajar Traslación a 1 con Singularidad comprada se
// bloquea). El requisito mira el efectivo: con Resonancia +1 de especie, la
// Resonancia comprada puede bajar a 0 con Inducción 1 comprada.
export function sueloPorRequisitos(sheet: Sheet, id: DisciplinaId, bonos: BonosDisciplina): number {
  const necesario = DISCIPLINAS.reduce(
    (suelo, d) =>
      d.requisito?.disciplina === id && nivelEfectivo(sheet, d.id, bonos) > 0 ? Math.max(suelo, d.requisito.nivel) : suelo,
    0,
  );
  return Math.max(0, necesario - (bonos[id] ?? 0));
}

// Fija el nivel comprado respetando requisitos en los dos sentidos. No mira el pool:
// eso lo añade la compra de creación; la subida con XP (ficha aprobada) cobra aparte.
// Con el requisito roto (ver requisitosRotos) se puede bajar, no subir (decisión del
// usuario, 2026-10-13).
export function setNivelDisciplina(sheet: Sheet, id: DisciplinaId, value: number, bonos: BonosDisciplina): Sheet {
  const actual = nivelDisciplina(sheet, id);
  const v = clampInt(value, 0, DISCIPLINA_MAX, actual);
  if (v > actual && !cumpleRequisito(sheet, id, bonos)) return sheet;
  if (v < actual && v < sueloPorRequisitos(sheet, id, bonos)) return sheet;
  const psionica = { ...sheet.psionica };
  if (v > 0) psionica[id] = v;
  else delete psionica[id];
  return { ...sheet, psionica };
}

export function setDisciplinaValue(
  sheet: Sheet,
  id: DisciplinaId,
  value: number,
  ajuste: AjusteCoste,
  bonos: BonosDisciplina,
): Sheet {
  const next = setNivelDisciplina(sheet, id, value, bonos);
  return puntosPsionicaDisponibles(next, ajuste) < 0 ? sheet : next;
}
