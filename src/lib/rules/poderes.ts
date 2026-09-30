// Evaluador de poderes psiónicos: una AccionPoder del catálogo + el nivel poseído
// + las opciones elegidas → valores concretos. Puro: ni tira dados ni gasta
// fatiga (la cadena de descuentos es aparte).
//
// Orden: opciones de cada eje en orden (su `cambia` SUSTITUYE, salvo las notas,
// que se AÑADEN — si no, "Impulso Poderoso" borraría "ignora la cobertura
// ligera") → fórmulas `Valor` a número → `suma` de las opciones → marcadores
// `{campo}` de los textos.
import type { AplicadoId } from "./atributos";
import type { HabilidadId } from "./habilidades";
import type { Sheet } from "./sheet";
import type { Accion } from "./acciones";
import type { CondicionTirada } from "./condiciones";
import { DISCIPLINAS, PSIONICA, type DisciplinaId } from "../catalog/psionica";
import { umbralFatiga } from "./estados";
import type {
  AccionPoder,
  BonoToggle,
  Disciplina,
  EjePoder,
  Economia,
  Grado,
  ModificadorFatiga,
  Nota,
  Opcion,
  Valor,
} from "./psionica";

// Lo que queda de un Valor tras evaluar: un número, o lo que la app no calcula
// (referencias de dificultad que escribe el jugador, texto manual).
export type ValorResuelto = number | Extract<Valor, { manual: string } | { ajusteMaster: true }>;

export type ResolucionResuelta =
  | { tipo: "sin_dado" }
  | { tipo: "tirada"; aplicado: AplicadoId; habilidad: HabilidadId; especialidad?: string; dificultad?: ValorResuelto; modificador?: number }
  | { tipo: "enfrentada"; aplicado: AplicadoId; habilidad: HabilidadId; especialidad?: string; modificador?: number }
  | {
      tipo: "ataque";
      aplicado: AplicadoId;
      habilidad: HabilidadId;
      especialidad?: string;
      modificador?: number;
      danio: ValorResuelto;
      categoria: string;
      danioAlFallar?: boolean;
    };

export type PoderResuelto = {
  id: string;
  label: string;
  nivelPoseido: number;
  // Sin eje de nivel (poderes de coste fijo) cuenta el poseído, también para la sobrecarga.
  nivelEmpleado: number;
  elecciones: Record<string, string>; // eje → opción efectivamente aplicada
  economia: Economia;
  fatiga: ValorResuelto; // coste BASE, antes de la cadena de descuentos
  alcance: ValorResuelto | null;
  duracion: ValorResuelto | null;
  objetivo: { tipo: NonNullable<AccionPoder["objetivo"]>["tipo"]; area?: ValorResuelto } | null;
  desplazamiento: ValorResuelto | null;
  resolucion: ResolucionResuelta;
  // Habilidad alternativa ("Biociencia o Actitud"): entre cuáles elige el jugador;
  // la elegida va en `resolucion.habilidad` y en `elecciones.habilidad`.
  habilidadesAElegir: HabilidadId[] | null;
  objetivoTira: { que: string; dificultad?: ValorResuelto; grados?: Partial<Record<Grado, string>> }[];
  resultados: Partial<
    Record<
      Grado,
      {
        texto: string;
        estados: { estado: string; duracion: ValorResuelto; sobre: "objetivo" | "propio" }[];
        danio?: { valor: ValorResuelto; categoria: string; sobre: "objetivo" | "propio" };
      }
    >
  >;
  danioPropio: { valor: ValorResuelto; categoria: string } | null;
  multiplesObjetivos: { texto: string; fatigaPorObjetivo?: ValorResuelto } | null;
  // Carga máxima de la fila de la disciplina (Traslación: fila × Perspicacia); null si no hay.
  carga: ValorResuelto | null;
  datos: { etiqueta: string; valor: ValorResuelto }[];
  exceso: ExcesoResuelto | null;
  unidades: NonNullable<AccionPoder["unidades"]>;
  notas: Nota[];
  togglesPropios: BonoToggle[]; // ya filtrados por nivel poseído
  // Fuente de la ventaja (dos d12, el mejor) si la disciplina la da a esta acción.
  ventaja: string | null;
  bonosEnOtrasTiradas: BonoToggle[];
  movimientoOtorgado: { tipo: "levitar"; velocidad: ValorResuelto } | null;
  manual: string[];
};

export type ContextoPoder = {
  nivelPoseido: number;
  elecciones?: Record<string, string>;
  aplicados?: Partial<Record<AplicadoId, number>>; // para Valor.porAplicado
  // Valores de habilidad de la ficha: preseleccionan la más alta cuando la
  // tirada deja elegir habilidad.
  habilidades?: Partial<Record<HabilidadId, number>>;
  // Para lo que la acción deja en "tabla" (fatiga, alcance… de la fila del nivel
  // empleado) y las rebajas de tipo de acción por nivel poseído.
  disciplina?: Disciplina;
  pesoKg?: number; // Proeza: peso del objetivo (excesoDeCarga)
};

export type ExcesoResuelto = {
  pesoKg: number | null;
  cargaMax: number;
  porcentajeCarga: number | null; // peso / carga máxima, en %
  extra: number; // fatiga extra ya sumada a `fatiga`
  enLimite: boolean;
  bloqueo: string | null; // por qué no se puede tirar con este peso
};

const PASO_ECONOMIA: Partial<Record<Economia & string, Economia>> = { compleja: "estandar", estandar: "simple" };

export function opcionesDisponibles(eje: EjePoder, nivelPoseido: number): Opcion[] {
  return eje.opciones.filter((o) => (o.desdeNivel ?? 0) <= nivelPoseido);
}

// Elección efectiva de un eje: la pedida si está disponible; si no, el nivel
// empleado más alto (= el poseído) o la primera opción.
function opcionElegida(eje: EjePoder, nivelPoseido: number, pedida: string | undefined): Opcion | null {
  const disponibles = opcionesDisponibles(eje, nivelPoseido);
  if (disponibles.length === 0) return null;
  return (
    disponibles.find((o) => o.id === pedida) ??
    disponibles.find((o) => o.id === eje.porDefecto) ??
    (eje.tipo === "nivel_empleado" ? disponibles[disponibles.length - 1] : disponibles[0])
  );
}

function nivelDeOpcion(o: Opcion): number {
  if (o.nivel !== undefined) return o.nivel;
  const m = /^n(\d+)$/.exec(o.id);
  if (!m) throw new Error(`Opción de nivel empleado con id no numérico: ${o.id}`);
  return Number(m[1]);
}

// null = el personaje no tiene nivel suficiente para esta acción (no aparece).
export function resolverPoder(accion: AccionPoder, ctx: ContextoPoder): PoderResuelto | null {
  const { nivelPoseido } = ctx;
  if (nivelPoseido < accion.desdeNivel) return null;
  if (accion.porObjetivo) throw new Error(`${accion.id}: porObjetivo aún sin soporte en el evaluador`);

  // Copia de trabajo sin tipar fino: los `cambia` y `suma` son parches por ruta.
  const w = structuredClone(accion) as unknown as Record<string, unknown>;
  const elecciones: Record<string, string> = {};
  const sumas: Record<string, number>[] = [];
  let multiplicaTiempo = 1;
  let nivelEmpleado = nivelPoseido;

  for (const eje of accion.ejes) {
    const opcion = opcionElegida(eje, nivelPoseido, ctx.elecciones?.[eje.id]);
    if (!opcion) continue;
    elecciones[eje.id] = opcion.id;
    if (eje.tipo === "nivel_empleado") nivelEmpleado = nivelDeOpcion(opcion);
    for (const [campo, valor] of Object.entries(structuredClone(opcion.cambia))) {
      if (campo === "notas") w.notas = [...(w.notas as Nota[]), ...(valor as Nota[])];
      else if (campo === "resolucion") w.resolucion = { ...(w.resolucion as object), ...(valor as object) };
      else w[campo] = valor;
    }
    if (opcion.suma) sumas.push(opcion.suma);
    if (opcion.multiplicaTiempo) multiplicaTiempo *= opcion.multiplicaTiempo;
  }

  // Habilidad a elegir: la pedida si está en la lista; si no, la más alta de la
  // ficha (empate o sin ficha: la primera).
  const res = w.resolucion as Record<string, unknown>;
  let habilidadesAElegir: HabilidadId[] | null = null;
  if (Array.isArray(res.habilidad)) {
    const lista = res.habilidad as HabilidadId[];
    const pedida = lista.find((h) => h === ctx.elecciones?.habilidad);
    const valor = (h: HabilidadId) => ctx.habilidades?.[h] ?? 0;
    res.habilidad = pedida ?? lista.reduce((mejor, h) => (valor(h) > valor(mejor) ? h : mejor));
    elecciones.habilidad = res.habilidad as HabilidadId;
    habilidadesAElegir = lista;
  }

  const evaluar = (v: unknown, donde: string): ValorResuelto => evaluarValor(v, donde, nivelEmpleado, ctx);
  const opt = <T,>(v: T | null | undefined, f: (x: T) => ValorResuelto) => (v === null || v === undefined ? v : f(v));

  // Ajustes por nivel POSEÍDO (Levitar: 1 minuto por punto, 10 en nivel 4, 1 h en
  // nivel 6), en orden: el último que aplica gana en "sustituye".
  for (const a of accion.ajustesPorNivelPoseido) {
    if (nivelPoseido < a.desdeNivel) continue;
    if (a.nivelEmpleado !== undefined && a.nivelEmpleado !== nivelEmpleado) continue;
    if (a.opcion && elecciones[a.opcion.eje] !== a.opcion.opcion) continue;
    const ruta = a.sobre.split(".");
    const padre = ruta.slice(0, -1).reduce<Record<string, unknown> | undefined>(
      (n, k) => (n?.[k] as Record<string, unknown> | undefined),
      w,
    );
    const campo = ruta[ruta.length - 1];
    if (!padre || !(campo in padre)) throw new Error(`${accion.id}: ajuste sobre "${a.sobre}", que no existe`);
    if (a.op === "sustituye") padre[campo] = structuredClone(a.valor);
    else if (typeof padre[campo] === "number" && typeof a.valor === "number") {
      padre[campo] = a.op === "suma" ? (padre[campo] as number) + a.valor : (padre[campo] as number) * a.valor;
    } else throw new Error(`${accion.id}: ajuste "${a.op}" sobre "${a.sobre}" no numérico`);
  }

  // "tabla" = la fila del nivel empleado en la tabla común de la disciplina.
  const fila = ctx.disciplina?.porNivel.find((f) => f.nivel === nivelEmpleado);
  for (const campo of ["fatiga", "alcance", "duracion", "economia"] as const) {
    if (w[campo] === "tabla" && fila?.[campo] !== undefined) w[campo] = structuredClone(fila[campo]);
  }
  if (w.economia === "tabla") throw new Error(`${accion.id}: economía "tabla" sin fila elegida`);
  // Rebajas de tipo de acción por nivel poseído (nunca por debajo de simple).
  for (const m of ctx.disciplina?.modificadoresEconomia ?? []) {
    const a = m.alcance;
    if (nivelPoseido < m.desdeNivelPoseido) continue;
    if (a.accion && a.accion !== accion.id) continue;
    if (a.nivelEmpleado !== undefined && a.nivelEmpleado !== nivelEmpleado) continue;
    if (a.opcion && elecciones[a.opcion.eje] !== a.opcion.opcion) continue;
    if (m.op === "sustituye" && m.valor) w.economia = m.valor;
    else if (m.op === "baja_un_paso" && typeof w.economia === "string") {
      w.economia = PASO_ECONOMIA[w.economia as Economia & string] ?? w.economia;
    }
  }
  if (multiplicaTiempo !== 1) {
    const e = w.economia as Economia;
    if (typeof e === "string") {
      w.notas = [
        ...(w.notas as Nota[]),
        { texto: `Tarda ${multiplicaTiempo} veces lo normal (${multiplicaTiempo} × acción ${etiquetaEconomia(e).toLocaleLowerCase("es")}).`, lugar: "tirada" as const },
      ];
    } else w.economia = { tiempo: multiplicarTiempo(e.tiempo, multiplicaTiempo, accion.id) };
  }
  w.fatiga = evaluar(w.fatiga, "fatiga");
  w.alcance = opt(w.alcance, (x) => evaluar(x, "alcance"));
  w.duracion = opt(w.duracion, (x) => evaluar(x, "duracion"));
  w.desplazamiento = opt(w.desplazamiento, (x) => evaluar(x, "desplazamiento"));
  const objetivo = w.objetivo as Record<string, unknown> | null;
  if (objetivo && "area" in objetivo) objetivo.area = evaluar(objetivo.area, "objetivo.area");
  if ("danio" in res) res.danio = evaluar(res.danio, "resolucion.danio");
  if ("dificultad" in res) res.dificultad = evaluar(res.dificultad, "resolucion.dificultad");
  for (const t of w.objetivoTira as Record<string, unknown>[]) {
    if ("dificultad" in t) t.dificultad = evaluar(t.dificultad, "objetivoTira.dificultad");
  }
  for (const r of Object.values(w.resultados as Record<string, Record<string, unknown>>)) {
    for (const e of r.estados as Record<string, unknown>[]) e.duracion = evaluar(e.duracion, "resultados.estados.duracion");
    const d = r.danio as Record<string, unknown> | undefined;
    if (d) d.valor = evaluar(d.valor, "resultados.danio");
  }
  const danioPropio = w.danioPropio as Record<string, unknown> | null;
  if (danioPropio) danioPropio.valor = evaluar(danioPropio.valor, "danioPropio");
  const multiples = w.multiplesObjetivos as Record<string, unknown> | null;
  if (multiples && multiples.fatigaPorObjetivo !== undefined) {
    multiples.fatigaPorObjetivo = evaluar(multiples.fatigaPorObjetivo, "multiplesObjetivos");
  }
  // La carga máxima solo cuenta en las acciones que pagan la fila (Anclaje, Trasladar).
  const pagaTabla = accion.fatiga === "tabla" || accion.alcance === "tabla";
  const carga = pagaTabla && fila?.carga !== undefined ? evaluar(fila.carga, "carga") : null;
  const datos = ((w.datos as { etiqueta: string; valor: unknown }[] | undefined) ?? []).map((d) => ({
    etiqueta: d.etiqueta,
    valor: evaluar(d.valor, `datos.${d.etiqueta}`),
  }));
  const movimiento = w.movimientoOtorgado as Record<string, unknown> | null;
  if (movimiento) movimiento.velocidad = evaluar(movimiento.velocidad, "movimientoOtorgado");
  const exceso = accion.excesoDeCarga
    ? resolverExceso(accion.excesoDeCarga, typeof carga === "number" ? Math.max(0, carga) : 0, ctx.pesoKg)
    : null;
  if (exceso && typeof w.fatiga === "number") w.fatiga = (w.fatiga as number) + exceso.extra;
  if (exceso?.enLimite && accion.excesoDeCarga) {
    const d = accion.excesoDeCarga.danioAlLimite;
    w.danioPropio = { ...d };
    w.notas = [
      ...(w.notas as Nota[]),
      {
        texto: `Llegas al ${accion.excesoDeCarga.limitePorcentaje} %: al terminar la acción caes inconsciente por sobrecarga neural y recibes ${d.valor} de daño ${d.categoria} sin absorción (se resta al usarla).`,
        lugar: "tirada" as const,
      },
    ];
  }

  for (const suma of sumas) for (const [ruta, n] of Object.entries(suma)) sumarEnRuta(w, ruta.split("."), n, accion.id, ruta);

  const marcadores: Record<string, unknown> = {
    fatiga: w.fatiga,
    alcance: w.alcance,
    desplazamiento: w.desplazamiento,
    danio: res.danio,
    area: objetivo?.area,
    duracion: w.duracion,
    nivel: nivelEmpleado,
    nivelPoseido,
  };
  const rellenar = (s: string) => rellenarMarcadores(s, marcadores, accion.id);
  for (const t of w.objetivoTira as Record<string, unknown>[]) {
    t.que = rellenar(t.que as string);
    const grados = t.grados as Record<string, string> | undefined;
    if (grados) for (const g of Object.keys(grados)) grados[g] = rellenar(grados[g]);
  }
  for (const r of Object.values(w.resultados as Record<string, Record<string, unknown>>)) r.texto = rellenar(r.texto as string);
  for (const n of w.notas as Nota[]) n.texto = rellenar(n.texto);

  const ventaja = ctx.disciplina?.ventajas.find((v) => v.acciones.includes(accion.id) && nivelPoseido >= v.desdeNivelPoseido);

  return {
    id: accion.id,
    label: accion.label,
    nivelPoseido,
    nivelEmpleado,
    elecciones,
    economia: w.economia as Economia,
    fatiga: w.fatiga as ValorResuelto,
    alcance: w.alcance as ValorResuelto | null,
    duracion: w.duracion as ValorResuelto | null,
    objetivo: w.objetivo as PoderResuelto["objetivo"],
    desplazamiento: w.desplazamiento as ValorResuelto | null,
    resolucion: w.resolucion as ResolucionResuelta,
    habilidadesAElegir,
    objetivoTira: w.objetivoTira as PoderResuelto["objetivoTira"],
    resultados: w.resultados as PoderResuelto["resultados"],
    danioPropio: w.danioPropio as PoderResuelto["danioPropio"],
    multiplesObjetivos: w.multiplesObjetivos as PoderResuelto["multiplesObjetivos"],
    carga,
    datos,
    exceso,
    unidades: accion.unidades ?? {},
    notas: w.notas as Nota[],
    togglesPropios: accion.togglesPropios.filter((t) => enTramo(t, nivelPoseido)),
    ventaja: ventaja ? etiquetaVentaja(ctx.disciplina!, ventaja) : null,
    bonosEnOtrasTiradas: accion.bonosEnOtrasTiradas,
    movimientoOtorgado: w.movimientoOtorgado as PoderResuelto["movimientoOtorgado"],
    manual: accion.manual,
  };
}

// "1 minuto" × 10 → "10 minutos". Solo tiempos de la forma "<número> <unidad>".
function multiplicarTiempo(tiempo: string, n: number, accionId: string): string {
  const m = /^(\d+) (\S+?)s?$/.exec(tiempo);
  if (!m) throw new Error(`${accionId}: no sé multiplicar el tiempo "${tiempo}"`);
  const total = Number(m[1]) * n;
  return `${total} ${m[2]}${total === 1 ? "" : "s"}`;
}

function resolverExceso(
  regla: NonNullable<AccionPoder["excesoDeCarga"]>,
  cargaMax: number,
  pesoKg: number | undefined,
): ExcesoResuelto {
  const base = { cargaMax, pesoKg: pesoKg ?? null, porcentajeCarga: null, extra: 0, enLimite: false };
  if (pesoKg === undefined || !Number.isFinite(pesoKg) || pesoKg <= 0) {
    return { ...base, pesoKg: null, bloqueo: "Escribe el peso del objetivo." };
  }
  if (cargaMax <= 0) return { ...base, bloqueo: "Tu carga máxima es 0 kg: no puedes hacer una Proeza." };
  const porcentajeCarga = Math.round((pesoKg / cargaMax) * 100);
  if (pesoKg <= cargaMax) {
    return { ...base, porcentajeCarga, bloqueo: "No pasa de tu carga máxima: no hace falta Proeza, usa Anclaje o Trasladar." };
  }
  // Comparaciones en enteros para no depender de decimales (250 kg × 200 % = 500 kg).
  if (pesoKg * 100 > regla.limitePorcentaje * cargaMax) {
    return { ...base, porcentajeCarga, bloqueo: `Supera el límite del ${regla.limitePorcentaje} % de tu carga máxima.` };
  }
  // +N por cada 10 % COMPLETO de exceso sobre la carga máxima, con mínimo.
  const decenas = Math.floor(((pesoKg - cargaMax) * 10) / cargaMax);
  const extra = Math.max(regla.minimo, decenas * regla.fatigaPorCada10);
  return { ...base, porcentajeCarga, extra, enLimite: pesoKg * 100 >= regla.limitePorcentaje * cargaMax, bloqueo: null };
}

function evaluarValor(v: unknown, donde: string, nivelEmpleado: number, ctx: ContextoPoder): ValorResuelto {
  if (v === "tabla") throw new Error(`"${donde}" sigue en "tabla": ninguna opción elegida lo fija`);
  if (typeof v === "number") return v;
  const o = v as Record<string, unknown>;
  if ("manual" in o || "ajusteMaster" in o) return v as ValorResuelto;
  const f = v as Extract<Valor, { base: number }>;
  let total = f.base + (f.porNivel ?? 0) * nivelEmpleado + (f.porNivelPoseido ?? 0) * ctx.nivelPoseido;
  if (f.porAplicado) total += f.porAplicado.valor * (ctx.aplicados?.[f.porAplicado.aplicado] ?? 0);
  return total;
}

// "objetivoTira.*.dificultad" recorre el array y salta las entradas sin ese
// campo (la esquiva de Convergencia no tiene dificultad); un índice concreto o
// un campo que falta en ruta explícita es un error del catálogo.
function sumarEnRuta(nodo: unknown, ruta: string[], n: number, accionId: string, rutaEntera: string, comodin = false): void {
  const [cabeza, ...resto] = ruta;
  if (cabeza === "*") {
    if (!Array.isArray(nodo)) throw new Error(`${accionId}: "${rutaEntera}" no recorre un array`);
    for (const x of nodo) sumarEnRuta(x, resto, n, accionId, rutaEntera, true);
    return;
  }
  const obj = nodo as Record<string, unknown>;
  if (!(cabeza in obj)) {
    if (comodin) return;
    throw new Error(`${accionId}: "${rutaEntera}" no existe`);
  }
  if (resto.length > 0) return sumarEnRuta(obj[cabeza], resto, n, accionId, rutaEntera, comodin);
  if (typeof obj[cabeza] !== "number") throw new Error(`${accionId}: "${rutaEntera}" no es numérico, no se le puede sumar`);
  obj[cabeza] = (obj[cabeza] as number) + n;
}

function rellenarMarcadores(texto: string, valores: Record<string, unknown>, accionId: string): string {
  return texto.replace(/\{(\w+)(\/2|\*2)?\}/g, (_, campo: string, op?: string) => {
    const v = valores[campo];
    if (typeof v !== "number") throw new Error(`${accionId}: marcador {${campo}} sin valor numérico`);
    return String(op === "/2" ? Math.floor(v / 2) : op === "*2" ? v * 2 : v);
  });
}

// ── Acciones de poder de una ficha ────────────────────────────────

export type PoderDisponible = {
  disciplina: Disciplina;
  accion: AccionPoder;
  nivelPoseido: number;
  porDefecto: PoderResuelto; // nivel empleado = poseído, primera opción de cada eje
};

// Mismo gate que el equipo (generaAccionPropia en combate.ts): solo se genera
// lo que declara en su MotorMetadata una acción accion_sin_equipo construida.
export function generaAccionDePoder(accion: AccionPoder): boolean {
  return accion.motor.some((m) => m.tipo === "accion" && m.mecanismo === "accion_sin_equipo" && m.estado === "construido");
}

export function valoresHabilidad(sheet: Sheet): Partial<Record<HabilidadId, number>> {
  return Object.fromEntries(Object.entries(sheet.habilidades).map(([id, h]) => [id, h.valor]));
}

export function accionesDePsionica(sheet: Sheet): PoderDisponible[] {
  return DISCIPLINAS.flatMap((disciplina) => {
    const nivelPoseido = sheet.psionica[disciplina.id as DisciplinaId] ?? 0;
    if (nivelPoseido <= 0) return [];
    return disciplina.acciones.flatMap((accion): PoderDisponible[] => {
      if (!generaAccionDePoder(accion)) return [];
      const porDefecto = resolverPoder(accion, { nivelPoseido, disciplina, habilidades: valoresHabilidad(sheet) });
      return porDefecto ? [{ disciplina, accion, nivelPoseido, porDefecto }] : [];
    });
  });
}

const ETIQUETA_ECONOMIA: Record<Exclude<Economia, { tiempo: string }>, string> = {
  gratuita: "Gratuita",
  simple: "Simple",
  estandar: "Estándar",
  compleja: "Compleja",
  reaccion: "Reacción",
};

export function etiquetaEconomia(e: Economia): string {
  return typeof e === "string" ? ETIQUETA_ECONOMIA[e] : e.tiempo;
}

export function textoValor(v: ValorResuelto): string {
  if (typeof v === "number") return String(v);
  return "manual" in v ? v.manual : "a criterio del máster";
}

// ── Poder → tirada ────────────────────────────────────────────────
// Un poder con dado se tira por el mismo camino que cualquier Accion (modal,
// dificultad, desglose, daño). Sin dado no hay tirada: null.

function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Etiqueta con la forma elegida (si el eje de forma cambia algo) y el nivel empleado.
export function etiquetaPoder(accion: AccionPoder, p: PoderResuelto): string {
  // Solo el eje de forma ("modo": Impulso Poderoso…) cambia el nombre; los demás
  // (objetivos, acción…) no.
  const forma = accion.ejes
    .filter((e) => e.id === "modo")
    .map((e) => e.opciones.find((o) => o.id === p.elecciones[e.id]))
    .find((o) => o && Object.keys(o.cambia).length > 0);
  // Una opción de nivel con nombre propio (el alcance Local de Resonancia) se
  // enseña por su nombre en vez del número.
  const conNombre = accion.ejes
    .filter((e) => e.tipo === "nivel_empleado")
    .map((e) => e.opciones.find((o) => o.id === p.elecciones[e.id]))
    .find((o) => o?.nivel !== undefined);
  return `${forma?.label ?? accion.label} (${conNombre ? conNombre.label.toLocaleLowerCase("es") : `nivel ${p.nivelEmpleado}`})`;
}

// Lo que se enseña tras tirar un poder: el resultado propio por grado y lo que
// tira el objetivo (solo texto; la app no tira por él).
export type DetallePoder = {
  resultados: Partial<Record<Grado, string>>;
  objetivoTira: { que: string; dificultad?: string; grados?: Partial<Record<Grado, string>> }[];
};

export function gradoDeTirada(r: { exito: boolean | null; critico: boolean }): Grado | null {
  if (r.exito === null) return null;
  if (r.exito) return r.critico ? "critico" : "exito";
  return r.critico ? "fracasoCritico" : "fracaso";
}

// Sin texto propio para un crítico, vale el del grado normal (los críticos no
// tienen efecto extra si la prosa no lo dice).
export function textoDeGrado(textos: Partial<Record<Grado, string>>, grado: Grado): string | null {
  const respaldo: Partial<Record<Grado, Grado>> = { critico: "exito", fracasoCritico: "fracaso" };
  return textos[grado] ?? (respaldo[grado] ? (textos[respaldo[grado]!] ?? null) : null);
}

export function tiradaDePoder(accion: AccionPoder, p: PoderResuelto): Accion | null {
  const r = p.resolucion;
  if (r.tipo === "sin_dado") return null;
  const resultados: DetallePoder["resultados"] = {};
  for (const [g, res] of Object.entries(p.resultados)) resultados[g as Grado] = res.texto;
  const notasDanio = p.notas.filter((n) => n.lugar === "danio");
  const tirada: Accion = {
    id: accion.id,
    label: etiquetaPoder(accion, p),
    grupo: "Psiónica",
    aplicado: r.aplicado,
    habilidad: r.habilidad,
    poder: {
      resultados,
      objetivoTira: p.objetivoTira.map((t) => ({
        que: t.que,
        dificultad: t.dificultad === undefined ? undefined : textoValor(t.dificultad),
        grados: t.grados,
      })),
    },
    ...(notasDanio.length > 0 && { efectos: notasDanio.map((n) => ({ fuente: accion.label, texto: n.texto })) }),
    // Dificultad fija del poder (Auto-anclaje 6): el modal la trae puesta.
    ...(r.tipo === "tirada" && typeof r.dificultad === "number" && { dificultadSugerida: r.dificultad }),
    // Penalizador propio fijo (Puntería −2 de Proyección): línea más del desglose.
    ...(r.modificador && { ajustesFijos: [{ valor: r.modificador, fuente: `${accion.label} (propio)` }] }),
    ...(p.ventaja && { ventaja: p.ventaja }),
    // Bonos que declara el jugador (Alerta: "+2 por Resonancia 4"): casillas del modal.
    ...(p.togglesPropios.length > 0 && {
      condiciones: p.togglesPropios.map((t, i) => ({
        id: `poder_${i}`,
        tipo: "toggle" as const,
        etiqueta: t.etiqueta,
        valorActivo: t.valor,
      })),
    }),
  };
  if (r.tipo === "ataque") {
    tirada.ataque = {
      modos: [
        {
          id: "poder",
          danio: typeof r.danio === "number" ? r.danio : null,
          formulaDanio: typeof r.danio === "number" ? null : textoValor(r.danio),
          categoriaDanio: capitalizar(r.categoria),
        },
      ],
      ...(r.danioAlFallar && { danioAlFallar: true }),
    };
  }
  return tirada;
}

// La especialidad de un poder (Física en Singularidad) se aplica sola si el
// personaje la tiene en esa habilidad — no es una elección del jugador.
export function enEspecialidadDePoder(sheet: Sheet, p: PoderResuelto): boolean {
  const r = p.resolucion;
  if (r.tipo === "sin_dado" || !r.especialidad) return false;
  const buscada = r.especialidad.toLocaleLowerCase("es");
  return sheet.habilidades[r.habilidad].especialidades.some((e) => e.toLocaleLowerCase("es") === buscada);
}

// ── Coste de fatiga: cadena semi-global ───────────────────────────
// coste base → descuentos por nivel (suma) → ×2 Munición Supresora (multiplica)
// → Xovromium (ignora_primero: −1) → mínimo (0 salvo que la prosa diga 1).
// El pago con cargas (Derivación Psiónica) iría el último y aún no existe.

const ORDEN_OP: Record<ModificadorFatiga["op"], number> = {
  suma: 0,
  multiplica: 1,
  ignora_primero: 2,
  minimo: 3,
  paga_con_recurso: 4,
};

export type CosteFatiga = {
  total: number;
  desglose: { etiqueta: string; valor: string }[];
};

function aplicaModificador(
  m: ModificadorFatiga,
  disciplina: Disciplina,
  accionId: string,
  p: PoderResuelto,
  toggles: ReadonlySet<string>,
): boolean {
  const a = m.alcance;
  if (a.rama && a.rama !== disciplina.rama) return false;
  if (a.disciplina && a.disciplina !== disciplina.id) return false;
  if (a.accion && !(Array.isArray(a.accion) ? a.accion.includes(accionId) : a.accion === accionId)) return false;
  if (a.opcion && p.elecciones[a.opcion.eje] !== a.opcion.opcion) return false;
  if (a.nivelEmpleadoMax !== undefined && p.nivelEmpleado > a.nivelEmpleadoMax) return false;
  if (a.nivelEmpleadoMin !== undefined && p.nivelEmpleado < a.nivelEmpleadoMin) return false;
  if (m.desdeNivelPoseido !== undefined && p.nivelPoseido < m.desdeNivelPoseido) return false;
  if (m.condicion && !toggles.has(m.condicion.toggle)) return false;
  return true;
}

// Coste que se descuenta de la ficha al usar el poder. `externos` = fuentes de
// fuera de la disciplina (Munición Supresora, Xovromium...), que se enchufarán
// después del piloto; `toggles` = condiciones que declara el jugador.
export function costeFatiga(
  disciplina: Disciplina,
  accionId: string,
  p: PoderResuelto,
  opciones: { externos?: ModificadorFatiga[]; toggles?: ReadonlySet<string> } = {},
): CosteFatiga {
  if (typeof p.fatiga !== "number") {
    throw new Error(`${accionId}: fatiga no numérica ("${textoValor(p.fatiga)}"), se paga a mano`);
  }
  const toggles = opciones.toggles ?? new Set<string>();
  const mods = [...disciplina.modificadoresFatiga, ...(opciones.externos ?? [])]
    .filter((m) => aplicaModificador(m, disciplina, accionId, p, toggles))
    .sort((a, b) => ORDEN_OP[a.op] - ORDEN_OP[b.op]);

  let total = p.fatiga;
  let minimo = 0;
  const extra = p.exceso?.extra ?? 0;
  const desglose: CosteFatiga["desglose"] = [{ etiqueta: "Coste del poder", valor: String(p.fatiga - extra) }];
  if (extra > 0 && p.exceso) {
    desglose.push({ etiqueta: `Exceso de carga (${p.exceso.porcentajeCarga} % de tu carga)`, valor: `+${extra}` });
  }
  for (const m of mods) {
    if (m.op === "paga_con_recurso") throw new Error(`${m.fuente}: pago de fatiga con recurso aún sin construir`);
    const n = typeof m.valor === "number" ? m.valor : NaN;
    if (m.op === "suma") {
      total += n;
      desglose.push({ etiqueta: m.fuente, valor: n >= 0 ? `+${n}` : String(n) });
    } else if (m.op === "multiplica") {
      total *= n;
      desglose.push({ etiqueta: m.fuente, valor: `×${n}` });
    } else if (m.op === "ignora_primero") {
      total -= 1;
      desglose.push({ etiqueta: m.fuente, valor: "−1" });
    } else {
      minimo = Math.max(minimo, n);
    }
  }
  const final = Math.max(minimo, total);
  if (final !== total) desglose.push({ etiqueta: `Mínimo ${minimo}`, valor: `→ ${final}` });
  return { total: final, desglose };
}

// null = puede pagarlo. Sin fatiga suficiente no se deja confirmar (salvo los
// poderes con fatiga temporal, Proeza, que aún no existen).
export function bloqueoPorFatiga(accion: AccionPoder, coste: number, fatigaActual: number): string | null {
  if (accion.permiteFatigaTemporal || coste <= fatigaActual) return null;
  return `Te faltan ${coste - fatigaActual} de fatiga (tienes ${fatigaActual}, cuesta ${coste}).`;
}

// ── Sobrecarga ────────────────────────────────────────────────────
// Salta al CRUZAR el umbral de exhausto con un gasto psiónico (si ya estabas
// exhausto no vuelve a saltar): inconsciencia automática y salvación de
// Fortaleza 5 + nivel que solo decide el daño letal no absorbible.

export function cruzaSobrecarga(fatigaAntes: number, fatigaDespues: number, fatigaMax: number): boolean {
  return umbralFatiga(fatigaAntes, fatigaMax) !== "exhausto" && umbralFatiga(fatigaDespues, fatigaMax) === "exhausto";
}

// `nivel` = nivel empleado; en poderes sin eje de nivel, el poseído (que es lo
// que PoderResuelto.nivelEmpleado ya trae en ese caso).
export function dificultadSobrecarga(nivel: number): number {
  const v = evaluarValor(PSIONICA.sobrecarga.salvacion.dificultad, "sobrecarga.dificultad", nivel, { nivelPoseido: nivel });
  if (typeof v !== "number") throw new Error("Dificultad de sobrecarga no numérica");
  return v;
}

// La mitad (éxito) redondea hacia abajo, como el resto de "la mitad" de la psiónica.
export function danioSobrecarga(nivel: number, grado: Grado): number {
  const v = evaluarValor(PSIONICA.sobrecarga.danio.valor, "sobrecarga.danio", nivel, { nivelPoseido: nivel });
  if (typeof v !== "number") throw new Error("Daño de sobrecarga no numérico");
  return Math.floor(v * PSIONICA.sobrecarga.multiplicadorPorGrado[grado]);
}

// Casillas de fatiga que el jugador puede marcar en este poder (condiciones de
// los ModificadorFatiga que le aplican por disciplina, acción y nivel).
export type ToggleFatiga = { toggle: string; grupo?: string };

export function togglesDeFatiga(disciplina: Disciplina, accionId: string, p: PoderResuelto): ToggleFatiga[] {
  const vistos = new Map<string, ToggleFatiga>();
  for (const m of disciplina.modificadoresFatiga) {
    if (!m.condicion) continue;
    const todos = new Set([m.condicion.toggle]);
    if (!aplicaModificador(m, disciplina, accionId, p, todos)) continue;
    vistos.set(m.condicion.toggle, { toggle: m.condicion.toggle, grupo: m.condicion.grupo });
  }
  return [...vistos.values()];
}

function enTramo(b: BonoToggle, nivel: number): boolean {
  return nivel >= (b.desdeNivelPoseido ?? 0) && nivel <= (b.hastaNivelPoseido ?? Infinity);
}

function etiquetaVentaja(d: Disciplina, v: Disciplina["ventajas"][number]): string {
  return `${d.label} ${v.desdeNivelPoseido}${v.condicion ? `, ${v.condicion}` : ""}`;
}

// Lo que la psiónica de la ficha añade a una tirada fija (Buscar / percibir con
// Resonancia 4: ventaja y la casilla de +2): `Disciplina.ventajas` y
// `bonosEnOtrasTiradas` cuyo alcance es el id o el grupo de la tirada.
export function conPsionicaEnTiradaFija(sheet: Sheet, t: Accion): Accion {
  let ventaja = t.ventaja;
  const condiciones: CondicionTirada[] = [];
  for (const d of DISCIPLINAS) {
    const nivel = sheet.psionica[d.id as DisciplinaId] ?? 0;
    if (nivel <= 0) continue;
    const v = d.ventajas.find((x) => x.acciones.includes(t.id) && nivel >= x.desdeNivelPoseido);
    if (v && !ventaja) ventaja = etiquetaVentaja(d, v);
    d.bonosEnOtrasTiradas.forEach((b, i) => {
      if ((b.alcance === t.id || b.alcance === t.grupo) && enTramo(b, nivel)) {
        condiciones.push({ id: `psi_${d.id}_${i}`, tipo: "toggle", etiqueta: b.etiqueta, valorActivo: b.valor });
      }
    });
  }
  if (ventaja === t.ventaja && condiciones.length === 0) return t;
  return {
    ...t,
    ...(ventaja && { ventaja }),
    ...(condiciones.length > 0 && { condiciones: [...(t.condiciones ?? []), ...condiciones] }),
  };
}

// Levitar como movimiento de la ficha: desde Traslación 2, a 10 × nivel poseído
// metros (la misma velocidad a la que Trasladar mueve objetos).
export function levitacion(sheet: Sheet): { velocidadM: number; nivel: number } | null {
  const nivel = sheet.psionica.traslacion ?? 0;
  return nivel >= 2 ? { velocidadM: 10 * nivel, nivel } : null;
}

// Mientras levita, el psiónico esquiva con Física (Traslación, Auto-traslación):
// la esquiva fija gana la casilla "Levitando: Física" si la ficha puede levitar.
export function conEsquivaLevitando(sheet: Sheet, t: Accion): Accion {
  if (t.id !== "defensa" || !levitacion(sheet)) return t;
  return { ...t, habilidadAlternativa: { habilidad: "tecnociencia", especialidad: "Física", etiqueta: "Levitando: Física" } };
}
