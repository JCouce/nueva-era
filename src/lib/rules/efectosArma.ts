// Efectos sobre el objetivo de un ataque (T3a y T3b del cuestionario de cierre, usuario 2026-11-13).
//
// Lo que un arma, su munición especial, su modificación o una dote le hacen al objetivo:
// «Efecto Shock (5)», «Crítico de Aturdimiento (8)», «Hemorragia (1d6 turnos)», «Derribo (N)»,
// «entorpecido 1d4 turnos» (Golpe Entorpecedor). El catálogo lo declara como dato (`EfectoArma`);
// este módulo decide cuáles saltan con el resultado de un ataque y monta el aviso para el
// resultado (`EfectoSobreObjetivo`), con la salvación y qué pasa en cada grado sacados del
// catálogo de estados. La app no tira por el objetivo ni le pone el estado: el jugador se lo
// canta al máster y él lo pone en su panel (eq-01, eq-02, do-05).
//
// Reglas (docs/sistema.md §7, «Efectos de arma sobre el objetivo»):
//   - «Efecto X (N)» salta con el acierto (superar la defensa), aunque el blindaje se coma
//     todo el daño (eq-03). «Crítico de X (N)», solo en crítico. Lo que no depende del
//     resultado (Asesino, Onda Residual tras Expansión) va `siempre`.
//   - En crítico, cada efecto de crítico sustituye al normal del mismo estado de esa fuente
//     (eq-04); el resto de normales siguen y los críticos sin par se suman.
//   - Con munición especial, se aplican el crítico del arma y el de la munición (eq-05); la
//     Perforante («en lugar del crítico habitual», `sustituyeCritico`) quita el del arma, no
//     el de las dotes.
//   - «Shock y Llamarada (N)» son dos salvaciones (eq-06): dos entradas en el catálogo.
//   - La salvación la dice el estado (eq-07, `Estado.salvacion`) o el propio efecto (Golpe
//     Fatigante: Fortaleza + Atletismo, sin estado); el grado, tal cual el catálogo de estados, o
//     la tabla propia del efecto (munición Tóxica, Radiactiva, Supresora; eq-22).
//   - Hemorragia no se salva: dura lo que diga el efecto, y la app tira el dado al avisar (eq-08).
//   - Un `ajusteSalvacion` no avisa solo: retoca la salvación contra ese estado que ya salte en
//     el mismo ataque (Dominio Elevado −2 contra el derribo; Derribo Mejorado, lo que añade a
//     cada grado). Sin esa salvación, no sale.
import { z } from "zod";
import { estadoPorId } from "../catalog/estados";
import { MARGEN_CRITICO } from "./acciones";
import type { EstadoCondiciones, TramoDistancia } from "./condiciones";
import type { Grado } from "./psionica";
import type { OrigenAporte } from "./origen";

// ── El dato del catálogo ─────────────────────────────────────────────────────
// Schema Zod porque el catálogo de dotes (dotesTipos.ts) lo valida al generarse; el tipo sale de él.

const GRADOS = ["critico", "exito", "fracaso", "fracasoCritico"] as const satisfies readonly Grado[];
const TRAMOS = ["bocajarro", "corta", "media", "larga"] as const satisfies readonly TramoDistancia[];

// Qué pasa con un grado de la salvación cuando el efecto trae tabla propia (munición Tóxica:
// «si falla, envenenado 1»). `estado`: el que pone el máster con ese grado, si alguno, y cuántos
// turnos si lo dice la fuente; `fatiga`: puntos de fatiga que pierde (Golpe Fatigante).
const resultadoDeTablaSchema = z.strictObject({
  texto: z.string().min(1),
  estado: z
    .strictObject({ estadoId: z.string().min(1), gradoId: z.string().min(1), turnos: z.number().int().min(1).optional() })
    .optional(),
  fatiga: z.number().int().min(1).optional(),
});
export type ResultadoDeTabla = z.infer<typeof resultadoDeTablaSchema>;
const tablaSchema = z.partialRecord(z.enum(GRADOS), resultadoDeTablaSchema);

// Cuánto dura un estado que no se salva (Hemorragia, eq-08): «1d6 turnos» se tira al avisar;
// «1 turno» dura uno; la Exanguinante no tiene duración (solo la quita la medicina).
const duracionSchema = z.discriminatedUnion("tipo", [
  z.strictObject({ tipo: z.literal("dado"), caras: z.number().int().min(2) }),
  z.strictObject({ tipo: z.literal("turnos"), turnos: z.number().int().min(1) }),
  z.strictObject({ tipo: z.literal("sinDuracion"), motivo: z.string().min(1) }),
]);
export type DuracionEfecto = z.infer<typeof duracionSchema>;

// Contra qué tira el objetivo: un número, el total de tu ataque («enfrentada al resultado del
// ataque original», Golpe Fatigante) o tantos éxitos como los de tu ataque (maniobra Derribo).
const dificultadSchema = z.union([z.number().int().min(0), z.literal("totalDelAtaque"), z.literal("exitosDelAtaque")]);

const comunes = {
  cuando: z.enum(["acierto", "critico", "siempre"]),
  // Solo con esa opción elegida al tirar: el modo («Acción Compleja: Derribo (8)»; por su
  // etiqueta en la tabla del arma), el tramo de distancia (Derribo de escopetas y
  // ametralladoras en corta y bocajarro) o una casilla marcada (la de la dote: «Golpe
  // fatigante»; la maniobra «Derribo»).
  soloEn: z
    .strictObject({ modo: z.array(z.string().min(1)).optional(), tramo: z.array(z.enum(TRAMOS)).optional(), casilla: z.string().min(1).optional() })
    .optional(),
  // «Si el objetivo recibe daño» (Munición Supresora): el acierto no basta, lo dice el aviso.
  soloSiRecibeDanio: z.literal(true).optional(),
  // Lo que la fuente añade y no cabe en lo anterior (sintéticos +2, relanzar a los 10 turnos…).
  nota: z.string().min(1).optional(),
  // A quién le toca, si no es «el objetivo» del golpe: «Cada enemigo a 40 m» (Grito de Guerra).
  quien: z.string().min(1).optional(),
};

export const efectoArmaSchema = z.discriminatedUnion("tipo", [
  z.strictObject({
    tipo: z.literal("salvacion"),
    // El estado que se salva; sin él, `tirada` dice con qué (Golpe Fatigante).
    estadoId: z.string().min(1).optional(),
    // Con qué salva, si no es la del estado (Derribo de la maniobra: Potencia + Atletismo o
    // Combate Melee) o no hay estado.
    tirada: z.strictObject({ etiqueta: z.string().min(1), tiradaId: z.string().min(1).optional() }).optional(),
    dificultad: dificultadSchema,
    // Tabla propia por grado; sin ella, los grados del estado tal cual el catálogo.
    tabla: tablaSchema.optional(),
    ...comunes,
  }),
  z.strictObject({
    tipo: z.literal("estado"),
    estadoId: z.string().min(1),
    duracion: duracionSchema,
    // El grado que pone, si es uno (Golpe Entorpecedor: el de «acierto del atacante» o el de su
    // crítico); sin él, el aviso enseña todos.
    gradoId: z.string().min(1).optional(),
    // Nombre propio si no es el del estado ("Hemorragia Exanguinante").
    etiqueta: z.string().min(1).optional(),
    ...comunes,
  }),
  // Lo que no es un estado que se salve ni se ponga: Impacto Estructural, el crítico de la
  // Perforante, «Derribado o Entorpecido» (lo elige el máster según la escena, eq-11), la zona
  // de Onda Residual (con su duración).
  z.strictObject({ tipo: z.literal("texto"), texto: z.string().min(1), duracion: duracionSchema.optional(), ...comunes }),
  // Retoca la salvación contra `contra` (id de estado) de este mismo ataque: `valor` a la tirada
  // del objetivo y lo que añade a cada grado.
  z.strictObject({
    tipo: z.literal("ajusteSalvacion"),
    contra: z.string().min(1),
    valor: z.number().int().optional(),
    tabla: tablaSchema.optional(),
    ...comunes,
  }),
]);
export type EfectoArma = z.infer<typeof efectoArmaSchema>;

// Un efecto ya colgado de una tirada concreta, con quién lo produce.
export type EfectoEnTirada = EfectoArma & { fuente: string; origen?: OrigenAporte };

// ── El aviso del resultado ───────────────────────────────────────────────────

// Lo que otra fuente añade a un grado (Derribo Mejorado en el fracaso del derribo).
export type AnadidoAGrado = { fuente: string; texto: string; estado?: ResultadoDeTabla["estado"]; fatiga?: number };

export type GradoAviso = {
  id: string;
  label: string;
  texto: string;
  // Estado y grado que pone el máster con ese resultado (tabla propia), si se sabe.
  estado?: ResultadoDeTabla["estado"];
  // Fatiga que pierde en total con ese resultado, añadidos incluidos.
  fatiga?: number;
  anadidos?: AnadidoAGrado[];
  // Qué total de su tirada cae en este grado («10 a 14»), sacado solo de la dificultad: el
  // máster compara la tirada del rival sin que la app la necesite.
  rango?: string;
};

// Lo que el resultado del ataque enseña: a quién le
// toca tirar qué, contra cuánto, y qué pasa en cada grado. Todo resuelto: la UI solo pinta.
export type EfectoSobreObjetivo = {
  fuente: string;
  enCritico: boolean;
  // La frase entera: «El objetivo salva Fortaleza contra Shock, dificultad 5».
  titulo: string;
  estadoId: string | null;
  // `dificultad`: la del objetivo (también el total de tu ataque); sin ella, `contra` dice qué
  // necesita. `ajustes`: lo que le suman otras fuentes a su tirada (Dominio Elevado −2).
  salvacion?: {
    etiqueta: string;
    tiradaId?: string;
    dificultad?: number;
    contra?: string;
    ajustes?: { valor: number; fuente: string }[];
  };
  // El grado fijo que pone (Golpe Entorpecedor), si es uno.
  grado?: { id: string; label: string };
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

// La tirada de ataque que lleva los efectos: los suyos (arma y modificación), los de su munición
// especial, los de la ficha (dotes, que la Perforante no toca) y los modos (para leer la etiqueta
// del elegido).
export type TiradaConEfectos = {
  efectosObjetivo?: EfectoEnTirada[];
  efectosObjetivoDeFicha?: EfectoEnTirada[];
  municionesEspeciales?: { id: string; label: string; efectosObjetivo?: EfectoEnTirada[]; sustituyeCritico?: boolean }[];
  ataque?: { modos: { id: string; etiqueta?: string }[] };
};

// Lo que hace falta del resultado: si acertó, si fue crítico y contra cuánto; el total, para
// la salvación enfrentada a tu tirada (Golpe Fatigante, intimidar). Sin él, el aviso no dice el
// número. `esAtaque`: el total se nombra como «de tu ataque» (si no, «tu total»).
export type ResultadoParaAviso = { exito: boolean | null; critico: boolean; dificultad: number | null; total?: number; esAtaque?: boolean };

function etiquetaModoElegido(t: TiradaConEfectos, estado: EstadoCondiciones): string | null {
  const modos = t.ataque?.modos ?? [];
  const id = typeof estado.modo === "string" ? estado.modo : modos[0]?.id;
  return modos.find((m) => m.id === id)?.etiqueta ?? null;
}

// ¿Vale el efecto con lo elegido al tirar? (modo, tramo y casilla marcada).
export function efectoAplicaCon(
  e: Pick<EfectoArma, "soloEn">,
  modo: string | null,
  tramo: string | null,
  estado: EstadoCondiciones = {},
): boolean {
  if (e.soloEn?.modo && (modo === null || !e.soloEn.modo.includes(modo))) return false;
  if (e.soloEn?.tramo && (tramo === null || !e.soloEn.tramo.includes(tramo as TramoDistancia))) return false;
  if (e.soloEn?.casilla && estado[e.soloEn.casilla] !== true) return false;
  return true;
}

const estadoDe = (e: EfectoArma): string | null => (e.tipo === "salvacion" || e.tipo === "estado" ? (e.estadoId ?? null) : null);

// Los efectos de una fuente que saltan con este resultado. En crítico, cada efecto de crítico
// sustituye al normal del mismo estado (eq-04: Pistón en Compleja, Aturdimiento 10 en lugar
// de 6 y el Derribo 8 sigue); los normales de otro estado siguen y los de crítico sin par
// se suman (Fusión del Plasma, Impacto Estructural del Kerzul). Los de `siempre`, tal cual.
function deUnaFuente(efectos: EfectoEnTirada[], critico: boolean): EfectoEnTirada[] {
  const normales = efectos.filter((e) => e.cuando === "acierto");
  if (!critico) return normales;
  const criticos = efectos.filter((e) => e.cuando === "critico");
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

// Los efectos que saltan, sin montar el aviso. Los de acierto y crítico, solo con acierto: la
// tirada con dificultad elegida (la defensa del objetivo) y éxito. Sin dificultad no se sabe si
// acertó. Los de `siempre`, con cualquier resultado.
// TODO(revisar): sin dificultad elegida el resultado dice «sin dificultad» y no ofrece tirar
// daño; tampoco avisa de los efectos. Si el máster quiere verlos así, hay que decidir cómo.
export function efectosQueSaltan(t: TiradaConEfectos, estado: EstadoCondiciones, resultado: ResultadoParaAviso): EfectoEnTirada[] {
  const modo = etiquetaModoElegido(t, estado);
  const tramo = typeof estado.tramo === "string" ? estado.tramo : null;
  const aplica = (e: EfectoEnTirada) => efectoAplicaCon(e, modo, tramo, estado);
  const deFicha = (t.efectosObjetivoDeFicha ?? []).filter(aplica);
  const siempre = [...(t.efectosObjetivo ?? []), ...deFicha].filter((e) => e.cuando === "siempre" && aplica(e));
  if (resultado.dificultad === null || resultado.exito !== true) return siempre;
  const critico = resultado.critico;

  const idMunicion = typeof estado.municion === "string" ? estado.municion : null;
  const municion = t.municionesEspeciales?.find((m) => m.id === idMunicion) ?? null;
  // La Perforante sustituye el crítico del arma: el arma se queda sin crítico propio (y, si
  // tenía efecto normal, ese sigue, como en un arma sin crítico).
  const delArma = (t.efectosObjetivo ?? []).filter(aplica);
  const armaSinCritico = critico && municion?.sustituyeCritico ? delArma.filter((e) => e.cuando !== "critico") : delArma;
  const deMunicion = (municion?.efectosObjetivo ?? []).filter(aplica);

  const segunResultado = [...porFuente(armaSinCritico), ...porFuente(deMunicion), ...porFuente(deFicha)].flatMap((g) =>
    deUnaFuente(g, critico),
  );
  return [...segunResultado, ...siempre];
}

// ── El aviso ─────────────────────────────────────────────────────────────────

function gradosDelEstado(estadoId: string, soloGrado?: string): GradoAviso[] {
  const estado = estadoPorId(estadoId);
  return (estado?.grados ?? [])
    .filter((g) => soloGrado === undefined || g.id === soloGrado)
    .map((g) => ({ id: g.id, label: g.label, texto: g.detalle.join(" ") }));
}

function gradosDeTabla(tabla: Partial<Record<Grado, ResultadoDeTabla>>): GradoAviso[] {
  return ORDEN_TABLA.flatMap((g) => {
    const r = tabla[g];
    return r ? [{ id: g, label: ETIQUETA_GRADO[g], texto: r.texto, ...(r.estado && { estado: r.estado }), ...(r.fatiga && { fatiga: r.fatiga }) }] : [];
  });
}

// Cada grado de una salvación por su id, sea de la tabla propia o del catálogo de estados.
const GRADO_POR_ID: Record<string, Grado> = {
  fracasoCritico: "fracasoCritico",
  fracaso_critico: "fracasoCritico",
  fracaso: "fracaso",
  fallo: "fracaso",
  exito: "exito",
  critico: "critico",
  exito_critico: "critico",
};

function rangoDe(grado: Grado, d: number): string {
  const m = MARGEN_CRITICO;
  if (grado === "fracasoCritico") return `${d - m} o menos`;
  if (grado === "fracaso") return `${d - m + 1} a ${d - 1}`;
  if (grado === "exito") return `${d} a ${d + m - 1}`;
  return `${d + m} o más`;
}

// Con dificultad conocida, todos los resultados posibles de su tirada, cada uno con su tramo; el
// que la fuente no nombra, «Ningún efecto». Un estado de un solo grado (Derribado, «activo») le
// cae con el fracaso, crítico o no. Varios grados que no son de salvación (niveles) se dejan como
// vienen.
function conRangos(grados: GradoAviso[], d: number, nombre: string): GradoAviso[] {
  const unico = grados.length === 1 && !(grados[0].id in GRADO_POR_ID) ? grados[0] : null;
  if (!unico && grados.length > 0 && !grados.every((g) => g.id in GRADO_POR_ID)) return grados;
  return ORDEN_TABLA.map((grado) => {
    const cae = unico && (grado === "fracaso" || grado === "fracasoCritico");
    const g = cae
      ? { ...unico, id: grado, label: ETIQUETA_GRADO[grado], texto: `Queda ${nombre}. ${unico.texto}` }
      : (grados.find((x) => GRADO_POR_ID[x.id] === grado) ?? { id: grado, label: ETIQUETA_GRADO[grado], texto: "Ningún efecto." });
    return { ...g, rango: rangoDe(grado, d) };
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

const conSigno = (n: number) => (n >= 0 ? `+${n}` : `−${-n}`);

export function avisoDeEfecto(
  e: Exclude<EfectoEnTirada, { tipo: "ajusteSalvacion" }>,
  resultado: Pick<ResultadoParaAviso, "critico" | "total" | "esAtaque">,
  tirar: TirarCaras,
): EfectoSobreObjetivo {
  const quien = e.quien ?? "El objetivo";
  const tuTotal = resultado.esAtaque === false ? "tu total" : "el total de tu ataque";
  const enCritico = resultado.critico && e.cuando === "critico";
  const notas = [...(e.soloSiRecibeDanio ? [NOTA_SI_RECIBE_DANIO] : []), ...(e.nota ? [e.nota] : [])];
  if (e.tipo === "texto") {
    const duracion = e.duracion && duracionDe(e.duracion, tirar);
    return {
      fuente: e.fuente,
      enCritico,
      titulo: duracion ? `${e.texto}, durante ${duracion.detalle}` : e.texto,
      estadoId: null,
      ...(duracion && { duracion }),
      grados: [],
      notas,
    };
  }
  const estado = e.estadoId ? estadoPorId(e.estadoId) : null;
  const label = estado?.label ?? e.estadoId ?? e.fuente;
  if (e.tipo === "estado") {
    const duracion = duracionDe(e.duracion, tirar);
    const nombre = e.etiqueta ?? label;
    const titulo =
      duracion.turnos === null ? `${quien} sufre ${nombre}: ${duracion.detalle}` : `${quien} sufre ${nombre} durante ${duracion.detalle}`;
    const grado = e.gradoId ? estado?.grados.find((g) => g.id === e.gradoId) : undefined;
    return {
      fuente: e.fuente,
      enCritico,
      titulo,
      estadoId: e.estadoId,
      ...(grado && { grado: { id: grado.id, label: grado.label } }),
      duracion,
      ...(estado && { resumen: estado.resumen }),
      grados: gradosDelEstado(e.estadoId, e.gradoId),
      notas,
    };
  }
  // Un estado sin salvación declarada no debería llegar aquí (lo comprueba el test del
  // catálogo); por si acaso, se dice sin nombrar la tirada.
  const tirada = e.tirada ?? estado?.salvacion;
  const dificultad =
    typeof e.dificultad === "number" ? e.dificultad : e.dificultad === "totalDelAtaque" ? resultado.total : undefined;
  const contra =
    e.dificultad === "exitosDelAtaque"
      ? "tantos éxitos o más como los de tu ataque (antes de restar los de su defensa)"
      : e.dificultad === "totalDelAtaque" && dificultad === undefined
        ? tuTotal
        : undefined;
  const cuanto =
    dificultad !== undefined
      ? `dificultad ${dificultad}${e.dificultad === "totalDelAtaque" ? ` (${tuTotal})` : ""}`
      : e.dificultad === "exitosDelAtaque"
        ? `necesita ${contra}`
        : `contra ${contra}`;
  const titulo = `${quien} salva${tirada ? ` ${tirada.etiqueta}` : ""} contra ${label}, ${cuanto}`;
  return {
    fuente: e.fuente,
    enCritico,
    titulo,
    estadoId: e.estadoId ?? null,
    salvacion: {
      etiqueta: tirada?.etiqueta ?? "Salvación",
      ...(tirada?.tiradaId && { tiradaId: tirada.tiradaId }),
      ...(dificultad !== undefined && { dificultad }),
      ...(contra && { contra }),
    },
    ...(estado && { resumen: estado.resumen }),
    grados: ((g) => (dificultad !== undefined ? conRangos(g, dificultad, label) : g))(
      e.tabla ? gradosDeTabla(e.tabla) : e.estadoId ? gradosDelEstado(e.estadoId) : [],
    ),
    notas,
  };
}

// Un ajuste sobre la salvación de su estado: el valor, a la tirada (y al título); lo de cada
// grado, añadido con su fuente. Varios de la misma fuente en un grado van en una línea.
function conAjuste(a: EfectoSobreObjetivo, e: Extract<EfectoEnTirada, { tipo: "ajusteSalvacion" }>): EfectoSobreObjetivo {
  if (!a.salvacion) return a;
  const ajustes = e.valor ? [...(a.salvacion.ajustes ?? []), { valor: e.valor, fuente: e.fuente }] : a.salvacion.ajustes;
  const grados = a.grados.map((g): GradoAviso => {
    const r = e.tabla?.[g.id as Grado];
    if (!r) return g;
    const previos = g.anadidos ?? [];
    const mismo = previos.find((x) => x.fuente === e.fuente);
    const anadidos = mismo
      ? previos.map((x) =>
          x === mismo
            ? { ...x, texto: `${x.texto} ${r.texto}`, ...((x.estado ?? r.estado) && { estado: x.estado ?? r.estado }), ...((x.fatiga ?? 0) + (r.fatiga ?? 0) > 0 && { fatiga: (x.fatiga ?? 0) + (r.fatiga ?? 0) }) }
            : x,
        )
      : [...previos, { fuente: e.fuente, texto: r.texto, ...(r.estado && { estado: r.estado }), ...(r.fatiga && { fatiga: r.fatiga }) }];
    const fatiga = (g.fatiga ?? 0) + (r.fatiga ?? 0);
    const texto = mismo
      ? g.texto.replace(`· ${e.fuente}: ${mismo.texto}`, `· ${e.fuente}: ${mismo.texto} ${r.texto}`)
      : `${g.texto} · ${e.fuente}: ${r.texto}`;
    return {
      ...g,
      texto,
      ...(fatiga > 0 && { fatiga }),
      anadidos,
    };
  });
  const sufijo = e.valor ? `; ${conSigno(e.valor)} a su tirada (${e.fuente})` : "";
  return {
    ...a,
    titulo: `${a.titulo}${sufijo}`,
    salvacion: { ...a.salvacion, ...(ajustes && { ajustes }) },
    grados,
    notas: e.nota ? [...a.notas, e.nota] : a.notas,
  };
}

// El aviso entero del resultado de un ataque: qué le pasa al objetivo, uno por efecto; los
// ajustes, dentro de la salvación que retocan.
export function efectosSobreObjetivo(
  t: TiradaConEfectos,
  estado: EstadoCondiciones,
  resultado: ResultadoParaAviso,
  tirar: TirarCaras,
): EfectoSobreObjetivo[] {
  const saltan = efectosQueSaltan(t, estado, resultado);
  const ajustes = saltan.filter((e): e is Extract<EfectoEnTirada, { tipo: "ajusteSalvacion" }> => e.tipo === "ajusteSalvacion");
  const avisos = saltan
    .filter((e): e is Exclude<EfectoEnTirada, { tipo: "ajusteSalvacion" }> => e.tipo !== "ajusteSalvacion")
    .map((e) => avisoDeEfecto(e, { ...resultado, esAtaque: resultado.esAtaque ?? t.ataque !== undefined }, tirar));
  return avisos.map((a) => ajustes.reduce((x, e) => (x.salvacion && x.estadoId === e.contra ? conAjuste(x, e) : x), a));
}

// Para las notas «antes» de la tirada (la opción de tramo de una escopeta): la frase corta
// de un efecto, sin tirar nada. «Derribo: el objetivo salva Saltar, levantarse (…) contra 9».
export function textoCortoDeEfecto(e: EfectoArma): string {
  if (e.tipo === "texto") return e.texto;
  if (e.tipo === "ajusteSalvacion") {
    const contra = estadoPorId(e.contra)?.label ?? e.contra;
    return `Salvación contra ${contra}${e.valor ? `: ${conSigno(e.valor)}` : ""}`;
  }
  const estado = e.estadoId ? estadoPorId(e.estadoId) : null;
  const label = (e.tipo === "estado" && e.etiqueta) || estado?.label || e.estadoId || "el efecto";
  if (e.tipo === "estado") return label;
  const tirada = e.tirada ?? estado?.salvacion;
  const con = tirada ? ` ${tirada.etiqueta}` : "";
  const contra = typeof e.dificultad === "number" ? `${e.dificultad}` : e.dificultad === "totalDelAtaque" ? "tu ataque" : "tus éxitos";
  return `${label}: si aciertas, el objetivo salva${con} contra ${contra}`;
}
