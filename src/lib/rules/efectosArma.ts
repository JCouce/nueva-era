// Efectos de arma sobre el objetivo (T3a del cuestionario de cierre, usuario 2026-11-13).
//
// Lo que un arma, su munición especial o su modificación le hacen al objetivo al acertar:
// «Efecto Shock (5)», «Crítico de Aturdimiento (8)», «Hemorragia (1d6 turnos)», «Derribo (N)».
// El catálogo lo declara como dato (`EfectoArma`); este módulo decide cuáles saltan con el
// resultado de un ataque y monta el aviso para el resultado (`EfectoSobreObjetivo`), con la
// salvación y qué pasa en cada grado sacados del catálogo de estados. La app no tira por el
// objetivo ni le pone el estado: el máster lo hace a mano (eq-01). El aviso es el dato que la
// tarjeta del máster (T3b) persistirá.
//
// Reglas (docs/sistema.md §7, «Efectos de arma sobre el objetivo»):
//   - «Efecto X (N)» salta con el acierto (superar la defensa), aunque el blindaje se coma
//     todo el daño (eq-03). «Crítico de X (N)», solo en crítico.
//   - En crítico, cada efecto de crítico sustituye al normal del mismo estado de esa fuente
//     (eq-04); el resto de normales siguen y los críticos sin par se suman.
//   - Con munición especial, se aplican el crítico del arma y el de la munición (eq-05); la
//     Perforante («en lugar del crítico habitual», `sustituyeCritico`) quita el del arma.
//   - «Shock y Llamarada (N)» son dos salvaciones (eq-06): dos entradas en el catálogo.
//   - La salvación la dice el estado (eq-07, `Estado.salvacion`); el grado, tal cual el catálogo
//     de estados, o la tabla propia del efecto (munición Tóxica, Radiactiva, Supresora; eq-22).
//   - Hemorragia no se salva: dura lo que diga el efecto, y la app tira el dado al avisar (eq-08).
import { estadoPorId } from "../catalog/estados";
import type { TramoDistancia, EstadoCondiciones } from "./condiciones";
import type { Grado } from "./psionica";
import type { OrigenAporte } from "./origen";

// ── El dato del catálogo ─────────────────────────────────────────────────────

// Qué pasa con un grado de la salvación cuando el efecto trae tabla propia (munición Tóxica:
// «si falla, envenenado 1»). `estado`: el que pone el máster con ese grado (T3b), si alguno.
export type ResultadoDeTabla = { texto: string; estado?: { estadoId: string; gradoId: string } };

// Cuánto dura un estado que no se salva (Hemorragia, eq-08): «1d6 turnos» se tira al avisar;
// «1 turno» dura uno; la Exanguinante no tiene duración (solo la quita la medicina).
export type DuracionEfecto =
  | { tipo: "dado"; caras: number }
  | { tipo: "turnos"; turnos: number }
  | { tipo: "sinDuracion"; motivo: string };

export type EfectoArma = (
  | {
      tipo: "salvacion";
      estadoId: string;
      dificultad: number;
      // Tabla propia por grado; sin ella, los grados del estado tal cual el catálogo.
      tabla?: Partial<Record<Grado, ResultadoDeTabla>>;
    }
  | {
      tipo: "estado";
      estadoId: string;
      duracion: DuracionEfecto;
      // Nombre propio si no es el del estado ("Hemorragia Exanguinante").
      etiqueta?: string;
    }
  // Lo que no es un estado que se salve ni se ponga: Impacto Estructural, el crítico de la
  // Perforante, «Derribado o Entorpecido» (lo elige el máster según la escena, eq-11).
  | { tipo: "texto"; texto: string }
) & {
  cuando: "acierto" | "critico";
  // Solo con esa opción elegida al tirar: el modo («Acción Compleja: Derribo (8)»; por su
  // etiqueta en la tabla del arma) o el tramo de distancia (Derribo de escopetas y
  // ametralladoras en corta y bocajarro).
  soloEn?: { modo?: readonly string[]; tramo?: readonly TramoDistancia[] };
  // «Si el objetivo recibe daño» (Munición Supresora): el acierto no basta, lo dice el aviso.
  soloSiRecibeDanio?: true;
  // Lo que la fuente añade y no cabe en lo anterior (sintéticos +2, relanzar a los 10 turnos…).
  nota?: string;
};

// Un efecto ya colgado de una tirada concreta, con quién lo produce.
export type EfectoEnTirada = EfectoArma & { fuente: string; origen?: OrigenAporte };

// ── El aviso del resultado ───────────────────────────────────────────────────

export type GradoAviso = {
  id: string;
  label: string;
  texto: string;
  // Estado y grado que pone el máster con ese resultado (tabla propia), si se sabe.
  estado?: { estadoId: string; gradoId: string };
};

// Lo que el resultado del ataque enseña y la tarjeta del máster (T3b) guardará: a quién le
// toca tirar qué, contra cuánto, y qué pasa en cada grado. Todo resuelto: la UI solo pinta.
export type EfectoSobreObjetivo = {
  fuente: string;
  enCritico: boolean;
  // La frase entera: «El objetivo salva Fortaleza contra Shock, dificultad 5».
  titulo: string;
  estadoId: string | null;
  salvacion?: { etiqueta: string; tiradaId?: string; dificultad: number };
  // Sin salvación (Hemorragia): turnos que dura (null = sin duración) y cómo salió.
  duracion?: { turnos: number | null; detalle: string };
  resumen?: string;
  grados: GradoAviso[];
  notas: string[];
};

const ETIQUETA_GRADO: Record<Grado, string> = {
  critico: "Éxito crítico",
  exito: "Éxito",
  fracaso: "Fracaso",
  fracasoCritico: "Fracaso crítico",
};
const ORDEN_TABLA: Grado[] = ["fracasoCritico", "fracaso", "exito", "critico"];

const NOTA_SI_RECIBE_DANIO = "Solo si el golpe le hace daño (tras el blindaje).";

// ── Qué salta ────────────────────────────────────────────────────────────────

// La tirada de ataque que lleva los efectos: los suyos, los de su munición especial y los
// modos (para leer la etiqueta del elegido).
export type TiradaConEfectos = {
  efectosObjetivo?: EfectoEnTirada[];
  municionesEspeciales?: { id: string; label: string; efectosObjetivo?: EfectoEnTirada[]; sustituyeCritico?: boolean }[];
  ataque?: { modos: { id: string; etiqueta?: string }[] };
};

function etiquetaModoElegido(t: TiradaConEfectos, estado: EstadoCondiciones): string | null {
  const modos = t.ataque?.modos ?? [];
  const id = typeof estado.modo === "string" ? estado.modo : modos[0]?.id;
  return modos.find((m) => m.id === id)?.etiqueta ?? null;
}

// ¿Vale el efecto con lo elegido al tirar? (modo y tramo).
export function efectoAplicaCon(e: Pick<EfectoArma, "soloEn">, modo: string | null, tramo: string | null): boolean {
  if (e.soloEn?.modo && (modo === null || !e.soloEn.modo.includes(modo))) return false;
  if (e.soloEn?.tramo && (tramo === null || !e.soloEn.tramo.includes(tramo as TramoDistancia))) return false;
  return true;
}

// Los efectos de una fuente que saltan con este resultado. En crítico, cada efecto de crítico
// sustituye al normal del mismo estado (eq-04: Pistón en Compleja, Aturdimiento 10 en lugar
// de 6 y el Derribo 8 sigue); los normales de otro estado siguen y los de crítico sin par
// se suman (Fusión del Plasma, Impacto Estructural del Kerzul).
function deUnaFuente(efectos: EfectoEnTirada[], critico: boolean): EfectoEnTirada[] {
  const normales = efectos.filter((e) => e.cuando === "acierto");
  if (!critico) return normales;
  const criticos = efectos.filter((e) => e.cuando === "critico");
  const estadoDe = (e: EfectoEnTirada) => (e.tipo === "texto" ? null : e.estadoId);
  const usados = new Set<EfectoEnTirada>();
  const tras = normales.map((n) => {
    const c = criticos.find((c) => !usados.has(c) && estadoDe(c) !== null && estadoDe(c) === estadoDe(n));
    if (!c) return n;
    usados.add(c);
    return c;
  });
  return [...tras, ...criticos.filter((c) => !usados.has(c))];
}

function porFuente(efectos: EfectoEnTirada[]): EfectoEnTirada[][] {
  const grupos = new Map<string, EfectoEnTirada[]>();
  for (const e of efectos) grupos.set(e.fuente, [...(grupos.get(e.fuente) ?? []), e]);
  return [...grupos.values()];
}

// Los efectos que saltan, sin montar el aviso. Solo con acierto: la tirada con dificultad
// elegida (la defensa del objetivo) y éxito. Sin dificultad no se sabe si acertó.
// TODO(revisar): sin dificultad elegida el resultado dice «sin dificultad» y no ofrece tirar
// daño; tampoco avisa de los efectos. Si el máster quiere verlos así, hay que decidir cómo.
export function efectosQueSaltan(
  t: TiradaConEfectos,
  estado: EstadoCondiciones,
  resultado: { exito: boolean | null; critico: boolean; dificultad: number | null },
): EfectoEnTirada[] {
  if (resultado.dificultad === null || resultado.exito !== true) return [];
  const critico = resultado.critico;
  const modo = etiquetaModoElegido(t, estado);
  const tramo = typeof estado.tramo === "string" ? estado.tramo : null;
  const aplica = (e: EfectoEnTirada) => efectoAplicaCon(e, modo, tramo);

  const idMunicion = typeof estado.municion === "string" ? estado.municion : null;
  const municion = t.municionesEspeciales?.find((m) => m.id === idMunicion) ?? null;
  // La Perforante sustituye el crítico del arma: el arma se queda sin crítico propio (y, si
  // tenía efecto normal, ese sigue, como en un arma sin crítico).
  const delArma = (t.efectosObjetivo ?? []).filter(aplica);
  const armaSinCritico = critico && municion?.sustituyeCritico ? delArma.filter((e) => e.cuando !== "critico") : delArma;
  const deMunicion = (municion?.efectosObjetivo ?? []).filter(aplica);

  return [...porFuente(armaSinCritico), ...porFuente(deMunicion)].flatMap((g) => deUnaFuente(g, critico));
}

// ── El aviso ─────────────────────────────────────────────────────────────────

function gradosDelEstado(estadoId: string): GradoAviso[] {
  const estado = estadoPorId(estadoId);
  return (estado?.grados ?? []).map((g) => ({ id: g.id, label: g.label, texto: g.detalle.join(" ") }));
}

function gradosDeTabla(tabla: Partial<Record<Grado, ResultadoDeTabla>>): GradoAviso[] {
  return ORDEN_TABLA.flatMap((g) => {
    const r = tabla[g];
    return r ? [{ id: g, label: ETIQUETA_GRADO[g], texto: r.texto, ...(r.estado && { estado: r.estado }) }] : [];
  });
}

// Un dado de N caras (Hemorragia 1d6): se inyecta para los tests.
export type TirarCaras = (caras: number) => number;

function duracionDe(d: DuracionEfecto, tirar: TirarCaras): { turnos: number | null; detalle: string } {
  if (d.tipo === "turnos") return { turnos: d.turnos, detalle: `${d.turnos} turno${d.turnos === 1 ? "" : "s"}` };
  if (d.tipo === "sinDuracion") return { turnos: null, detalle: d.motivo };
  const turnos = tirar(d.caras);
  return { turnos, detalle: `${turnos} turno${turnos === 1 ? "" : "s"} (1d${d.caras})` };
}

export function avisoDeEfecto(e: EfectoEnTirada, critico: boolean, tirar: TirarCaras): EfectoSobreObjetivo {
  const enCritico = critico && e.cuando === "critico";
  const notas = [...(e.soloSiRecibeDanio ? [NOTA_SI_RECIBE_DANIO] : []), ...(e.nota ? [e.nota] : [])];
  if (e.tipo === "texto") {
    return { fuente: e.fuente, enCritico, titulo: e.texto, estadoId: null, grados: [], notas };
  }
  const estado = estadoPorId(e.estadoId);
  const label = estado?.label ?? e.estadoId;
  if (e.tipo === "estado") {
    const duracion = duracionDe(e.duracion, tirar);
    const nombre = e.etiqueta ?? label;
    const titulo =
      duracion.turnos === null ? `El objetivo sufre ${nombre}: ${duracion.detalle}` : `El objetivo sufre ${nombre} durante ${duracion.detalle}`;
    return {
      fuente: e.fuente,
      enCritico,
      titulo,
      estadoId: e.estadoId,
      duracion,
      ...(estado && { resumen: estado.resumen }),
      grados: gradosDelEstado(e.estadoId),
      notas,
    };
  }
  const salvacion = estado?.salvacion;
  // Un estado sin salvación declarada no debería llegar aquí (lo comprueba el test del
  // catálogo); por si acaso, se dice sin nombrar la tirada.
  const titulo = salvacion
    ? `El objetivo salva ${salvacion.etiqueta} contra ${label}, dificultad ${e.dificultad}`
    : `El objetivo salva contra ${label}, dificultad ${e.dificultad}`;
  return {
    fuente: e.fuente,
    enCritico,
    titulo,
    estadoId: e.estadoId,
    salvacion: { etiqueta: salvacion?.etiqueta ?? "Salvación", ...(salvacion?.tiradaId && { tiradaId: salvacion.tiradaId }), dificultad: e.dificultad },
    ...(estado && { resumen: estado.resumen }),
    grados: e.tabla ? gradosDeTabla(e.tabla) : gradosDelEstado(e.estadoId),
    notas,
  };
}

// El aviso entero del resultado de un ataque: qué le pasa al objetivo, uno por efecto.
export function efectosSobreObjetivo(
  t: TiradaConEfectos,
  estado: EstadoCondiciones,
  resultado: { exito: boolean | null; critico: boolean; dificultad: number | null },
  tirar: TirarCaras,
): EfectoSobreObjetivo[] {
  return efectosQueSaltan(t, estado, resultado).map((e) => avisoDeEfecto(e, resultado.critico, tirar));
}

// Para las notas «antes» de la tirada (la opción de tramo de una escopeta): la frase corta
// de un efecto, sin tirar nada. «Derribo: el objetivo salva Saltar, levantarse (…) contra 9».
export function textoCortoDeEfecto(e: EfectoArma): string {
  if (e.tipo === "texto") return e.texto;
  const estado = estadoPorId(e.estadoId);
  const label = (e.tipo === "estado" && e.etiqueta) || estado?.label || e.estadoId;
  if (e.tipo === "estado") return label;
  const con = estado?.salvacion ? ` ${estado.salvacion.etiqueta}` : "";
  return `${label}: si aciertas, el objetivo salva${con} contra ${e.dificultad}`;
}
