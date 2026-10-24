// Modificadores: la vía única por la que cualquier cosa altera los números de
// un personaje.
//
// Razas, dotes, aumentos, equipo y estados hacen todos lo mismo —subir un
// atributo, cambiar un derivado, regalar habilidad, afectar a un tipo de
// tirada—, así que comparten un solo tipo. Cuando lleguen los poderes o los
// aumentos reales, serán datos nuevos en el catálogo, no código nuevo.
import type { AplicadoId, AtributoId } from "./atributos";
import type { HabilidadId } from "./habilidades";
import type { DisciplinaId } from "../catalog/psionica";
import type { EspecialidadId } from "../catalog/especialidades";

// Valores derivados que algo puede modificar directamente.
export const DERIVADOS_MODIFICABLES = [
  "vida",
  "fatiga",
  "alerta",
  "carrera",
  "saltoVertical",
  "saltoHorizontal",
  "escalada",
  "nado",
  "carga",
] as const;
export type DerivadoId = (typeof DERIVADOS_MODIFICABLES)[number];

// Cómo se lee cada derivado en un chip o en un desglose.
export const ETIQUETA_DERIVADO: Record<DerivadoId, string> = {
  vida: "Vida",
  fatiga: "Fatiga",
  alerta: "Alerta",
  carrera: "Carrera",
  saltoVertical: "Salto vertical",
  saltoHorizontal: "Salto horizontal",
  escalada: "Escalada",
  nado: "Nado",
  carga: "Carga",
};

// Los grupos de la pestaña Acciones. Vive aquí (y no en acciones.ts, donde se
// usa) para que Modificador pueda dirigir un bono a un grupo entero sin que
// este fichero, más bajo en la cadena de imports, dependa de aquel.
// "Ataques" y "Herramientas" no viven en ACCIONES ni en GRUPOS_ACCION: los
// generan combate.ts y herramientas.ts a partir del equipo, no el catálogo
// fijo — ver el comentario de cabecera de tiradas.ts.
export type GrupoAccion =
  | "Ataques"
  | "Defensa"
  | "Salvaciones"
  | "Iniciativa"
  | "Acciones"
  | "Herramientas"
  | "Fármacos"
  // Poderes psiónicos (poderes.ts): el grupo al que apuntarán los modificadores
  // externos de la psiónica (Xovromium, Munición Supresora...).
  | "Psiónica"
  // Acciones propias de dote (dotesAcciones.ts, D2c-1).
  | "Dotes"
  // Acciones propias de aumento (aumentosAcciones.ts, A4a).
  | "Aumentos"
  // Tirada libre (acciones.ts, T-007): grupo propio para que no le case ningún alcance por grupo.
  | "Libre";

// Familia de un ataque, bloqueo o "Levantar escudo" generado por arma (combate.ts): la
// pone el generador al crear la Accion, no se deduce del id. Es lo que miran las dotes
// con alcance "familia:<f>" (D2b-1, docs/sistema.md §9.3). Una sola por tirada.
//   ataque_melee     golpe con arma melee, Bayoneta y Aguijón del Proyector de Pulso
//   ataque_fuego     disparo con arma de fuego y disparo del Proyector de Pulso (también
//                    el de Tecnociencia)
//   ataque_pesado    armamento pesado y lanzagranadas integrado
//   lanzar_melee     lanzar un arma melee arrojadiza
//   lanzar_granada   lanzar una granada a mano
//   bloquear_melee   "Bloquear con X" (melee, Bayoneta, Aguijón)
//   levantar_escudo  "Levantar [escudo]", acción sin dado
export const FAMILIAS_ARMA = [
  "ataque_melee",
  "ataque_fuego",
  "ataque_pesado",
  "lanzar_melee",
  "lanzar_granada",
  "bloquear_melee",
  "levantar_escudo",
] as const;
export type FamiliaArma = (typeof FAMILIAS_ARMA)[number];

// Empleo del arma de la tirada (mismo campo que ArmaFuego/ArmaMelee.empleo): lo miran
// los filtros de arma de las dotes (Desenfundado Rápido: "armas a una mano").
export type EmpleoArma = "una mano" | "dos manos";

// A qué tirada(s) afecta un modificador de tipo "tirada". Cerrado a propósito
// — ver docs/modificadores-tiradas.md antes de añadir un sexto caso:
//
//   tiradaId  → una tirada concreta, por su id estable ("salv_fortaleza").
//               Sirve para las fijas de ACCIONES; las de ataque generadas por
//               combate.ts tienen id por instancia, así que esto no las
//               alcanza — para esas ya existen ajustesFijos/bonosTramo/
//               condiciones, más precisos.
//   grupo     → todas las tiradas de un grupo (Salvaciones, Acciones...).
//   habilidad → cualquier tirada que use esa habilidad, sea cual sea.
//   grupoHabilidad → las tiradas de ese grupo que usen esa habilidad ("ataques
//               con Combate a Distancia": el −1 del Arköru, que no debe tocar
//               Iniciativa desenfundando, que también usa esa habilidad).
//   modo      → solo si el modo de disparo/golpe elegido contiene ese texto
//               ("F. Auto"). Exige que la tirada tenga condición "modo".
//   familiaArma → las tiradas generadas por arma de esa familia (FAMILIAS_ARMA), y con
//               `empleo`, solo las de un arma de ese empleo. Lo usan las dotes (D2b-1).
//   aplicado  → las tiradas que se tiran con uno de esos aplicados (A2b de aumentos: "pruebas
//               que usen perspicacia, voluntad o expresión", §11.3 R9; salvaciones y poderes
//               incluidos). Vale el aplicado con el que se tira de verdad: si una casilla lo
//               cambia (Negociación Analítica) o va en Sutil, el nuevo (usuario, 2026-10-22).
//               Lo resuelve montarTirada con `ContextoAccion.aplicado`.
//   todas     → cualquier tirada, sin excepción. Para los "-1/-3/-5 a todo"
//               de los umbrales de salud/fatiga (docs/sistema.md §7) y los
//               estados que penalizan toda acción por igual — no hay forma
//               de expresar eso con los otros cuatro casos sin enumerar
//               grupos a mano y arriesgarse a que un grupo nuevo se quede
//               fuera en silencio.
export type AlcanceModificador =
  | { tipo: "tiradaId"; id: string }
  | { tipo: "grupo"; grupo: GrupoAccion }
  | { tipo: "habilidad"; habilidad: HabilidadId }
  | { tipo: "grupoHabilidad"; grupo: GrupoAccion; habilidad: HabilidadId }
  | { tipo: "modo"; contieneEtiqueta: string }
  // `desarmado`: solo en las tiradas de arma desarmada (Pelea), p.ej. la casilla de Bloqueo
  // "desarmado frente a atacante armado". `contundente` (D2d): solo armas de daño
  // contundente; con `empleo` a la vez vale cualquiera de los dos (Golpe Fatigante:
  // "daño contundente o arma a dos manos"). `especialidad` (D2d): solo armas de esa
  // especialidad (Golpe Mejorado con Escudo: Escudos).
  | {
      tipo: "familiaArma";
      familia: FamiliaArma;
      empleo?: EmpleoArma;
      desarmado?: true;
      contundente?: true;
      especialidad?: EspecialidadId;
    }
  // `salvoGrupo`: no en las tiradas de ese grupo (Ultra Estimulante: acciones físicas de
  // Fuerza o Agilidad, no las salvaciones; S94).
  | { tipo: "aplicado"; aplicados: AplicadoId[]; salvoGrupo?: GrupoAccion }
  // Las tiradas que nombran alguna de estas especialidades (la del arma, la de la acción o la
  // elegida en Convencer / mentir), la tenga o no la ficha: Presencia Imponente, Elión.
  | { tipo: "especialidad"; especialidades: readonly EspecialidadId[] }
  | { tipo: "todas" };

export type Modificador =
  // `exceptoSaludYSalvaciones` (Exoesqueleto): vale en tiradas y atributos, pero no en la
  // vida ni en las salvaciones, ni en movimiento y carga, que ya lo cuentan doble aparte.
  | { tipo: "atributo"; id: AtributoId; valor: number; exceptoSaludYSalvaciones?: true }
  // `noApila` (A2a de aumentos): grupo de no apilamiento. De lo que llega a un mismo
  // derivado o a una misma tirada con el mismo grupo, solo vale el mayor (Ojo Biónico con
  // miras y gafas, "vision_aumentada"). En la tirada lo resuelve montarTirada (también
  // contra casillas y bonos por tramo); en el derivado, bonoDerivado.
  | { tipo: "derivado"; id: DerivadoId; valor: number; noApila?: string }
  | { tipo: "habilidad"; id: HabilidadId; valor: number }
  // `compensa` (A5a): compensación de un penalizador (Neurogénesis sobre la fatiga) que no
  // viene con origen "estado"; cuenta junto a los penalizadores al anularlos (Proyección).
  | { tipo: "tirada"; alcance: AlcanceModificador; valor: number; noApila?: string; compensa?: true }
  // Nivel de una disciplina psiónica (Resonancia +1 del Arianyi, §14.6). No toca
  // ninguna tirada: sube el nivel efectivo, que es el que miran requisitos y
  // poderes (psionica.ts: nivelesDePsionica). Ver docs/modificadores-tiradas.md §9.
  | { tipo: "disciplina"; id: DisciplinaId; valor: number }
  // Multiplica la Fortaleza en la fórmula de la vida (Hipertrofia Miofibrilar, A1,
  // §11.3): vida = 10 + ⌊Fortaleza × factor⌋ si Fortaleza > 0; con 0 o menos no se
  // multiplica. Lo lee salud() (derivados.ts); no toca ninguna tirada. `valor` es el
  // factor (1,5), no un sumando: no lo suma ningún bono*.
  | { tipo: "multiplicadorVida"; valor: number }
  // Anula los penalizadores de las tiradas de ese alcance (Proyección Neuro-Expresiva activa,
  // A5a): los de heridas, fatiga y estados con sus compensaciones, sin pasar de 0. No toca el
  // circunstancial ni los bonos positivos. Lo resuelve montarTirada (conPenalizadoresAnulados).
  // `valor` siempre 0: no suma nada por sí mismo (lo lleva para que el resto del código, que
  // lee `valor` de cualquier modificador, no tenga que distinguirlo).
  | { tipo: "anulaPenalizadores"; alcance: AlcanceModificador; valor: 0 };

export type OrigenModificador =
  | "especie"
  | "dote"
  | "aumento"
  | "equipo"
  | "estado";

// Un modificador con su procedencia, para que la ficha pueda explicar de dónde
// sale cada número en vez de mostrar un total opaco.
export type ModificadorConFuente = Modificador & {
  origen: OrigenModificador;
  fuente: string; // etiqueta legible: "Arkorü", "Malherido", "Exoesqueleto 2"…
};

// Los modificadores sin los bonos de atributo que no cuentan para salud, salvaciones,
// movimiento ni carga (Exoesqueleto, docs/sistema.md S10).
export function sinExceptoSaludYSalvaciones(mods: ModificadorConFuente[]): ModificadorConFuente[] {
  return mods.filter((m) => !(m.tipo === "atributo" && m.exceptoSaludYSalvaciones));
}

export function bonoAtributo(
  mods: ModificadorConFuente[],
  id: AtributoId,
): number {
  return mods.reduce(
    (t, m) => (m.tipo === "atributo" && m.id === id ? t + m.valor : t),
    0,
  );
}

export function bonoDerivado(
  mods: ModificadorConFuente[],
  id: DerivadoId,
): number {
  const propios = mods.filter((m) => m.tipo === "derivado" && m.id === id);
  const fuera = descartadosPorNoApila(propios, (m) => (m.tipo === "derivado" ? m.noApila : undefined), (m) => m.valor);
  return propios.reduce((t, m) => (fuera.has(m) ? t : t + m.valor), 0);
}

// No apilamiento (A2a): de los elementos con el mismo grupo y valor distinto de 0, se queda
// el mayor (con empate, el primero); devuelve los demás, cada uno con el que gana. Los sin
// grupo no compiten.
export function descartadosPorNoApila<T>(
  items: readonly T[],
  grupoDe: (item: T) => string | undefined,
  valorDe: (item: T) => number,
): Map<T, T> {
  const mejor = new Map<string, T>();
  for (const item of items) {
    const grupo = grupoDe(item);
    if (!grupo || valorDe(item) === 0) continue;
    const actual = mejor.get(grupo);
    if (actual === undefined || valorDe(item) > valorDe(actual)) mejor.set(grupo, item);
  }
  const fuera = new Map<T, T>();
  for (const item of items) {
    const grupo = grupoDe(item);
    if (!grupo || valorDe(item) === 0) continue;
    const gana = mejor.get(grupo)!;
    if (gana !== item) fuera.set(item, gana);
  }
  return fuera;
}

export function bonoHabilidad(
  mods: ModificadorConFuente[],
  id: HabilidadId,
): number {
  return mods.reduce(
    (t, m) => (m.tipo === "habilidad" && m.id === id ? t + m.valor : t),
    0,
  );
}

// El factor de la vida (Hipertrofia). Una sola pieza lo da hoy; si llegaran dos, cuenta
// el mayor en vez de encadenarlos.
// Ningún documento lo dice; el usuario lo dejó así (2026-10-22).
export function factorVida(mods: ModificadorConFuente[]): number {
  return mods.reduce((f, m) => (m.tipo === "multiplicadorVida" ? Math.max(f, m.valor) : f), 1);
}

export function bonoDisciplina(
  mods: ModificadorConFuente[],
  id: DisciplinaId,
): number {
  return mods.reduce(
    (t, m) => (m.tipo === "disciplina" && m.id === id ? t + m.valor : t),
    0,
  );
}

// Lo que hace falta saber de una tirada concreta para decidir si le toca un
// modificador de alcance "tiradaId"/"grupo"/"habilidad"/"modo". La UI lo
// arma: `id`/`grupo`/`habilidad` salen de la propia Accion; `modoElegido` es
// la etiqueta de la opción de la condición "modo" que esté seleccionada
// ahora mismo en el modal (o null si no hay tal condición o no aplica).
// `familiaArma`/`empleoArma`: los de la Accion, si la genera un arma (ausentes en el resto).
// `aplicado`: el aplicado con el que se tira de verdad (montarTirada, tras Sutil y casillas
// que lo cambian); sin él, un alcance "aplicado" no casa. `aplicadosPosibles`: antes de
// abrir la tirada (contextoDe), los aplicados con los que podría tirarse (el suyo, el de
// Sutil y el de cualquier casilla que lo cambie): con ellos se recogen las casillas por
// aplicado, y montarTirada deja sin efecto las que no casen con el de verdad.
export type ContextoAccion = {
  id: string;
  grupo: GrupoAccion;
  habilidad: HabilidadId | null;
  modoElegido: string | null;
  aplicado?: AplicadoId;
  aplicadosPosibles?: readonly AplicadoId[];
  familiaArma?: FamiliaArma;
  empleoArma?: EmpleoArma;
  desarmado?: boolean;
  contundente?: boolean;
  especialidadArma?: EspecialidadId;
  // Las que nombra la tirada (especialidadesDeTirada). Antes de abrirla (contextoDe), también
  // las candidatas de `especialidadAElegir`; montarTirada pone las de verdad.
  especialidades?: readonly EspecialidadId[];
};

// Exportada para condicionesActivas() (equipo.ts) — mismo criterio de alcance
// para CondicionTirada que para Modificador, sin duplicar la lógica de match.
export function alcanzaA(alcance: AlcanceModificador, ctx: ContextoAccion): boolean {
  if (alcance.tipo === "todas") return true;
  if (alcance.tipo === "tiradaId") return alcance.id === ctx.id;
  if (alcance.tipo === "grupo") return alcance.grupo === ctx.grupo;
  if (alcance.tipo === "habilidad") return alcance.habilidad === ctx.habilidad;
  if (alcance.tipo === "grupoHabilidad") return alcance.grupo === ctx.grupo && alcance.habilidad === ctx.habilidad;
  if (alcance.tipo === "especialidad") return alcance.especialidades.some((e) => ctx.especialidades?.includes(e));
  if (alcance.tipo === "aplicado")
    return ctx.aplicado !== undefined && alcance.aplicados.includes(ctx.aplicado) && alcance.salvoGrupo !== ctx.grupo;
  // Sin empleo conocido (Proyector de Pulso, que va en la armadura), un filtro de empleo no casa.
  if (alcance.tipo === "familiaArma") {
    // Empleo y contundente: basta uno de los dos (si solo hay uno, ese).
    const porEmpleo = alcance.empleo !== undefined && alcance.empleo === ctx.empleoArma;
    const porContundente = alcance.contundente === true && ctx.contundente === true;
    const arma = (alcance.empleo === undefined && !alcance.contundente) || porEmpleo || porContundente;
    return (
      alcance.familia === ctx.familiaArma &&
      arma &&
      (!alcance.desarmado || ctx.desarmado === true) &&
      (alcance.especialidad === undefined || alcance.especialidad === ctx.especialidadArma)
    );
  }
  return ctx.modoElegido !== null && ctx.modoElegido.includes(alcance.contieneEtiqueta);
}

// Si un alcance "aplicado" puede llegar a casar con la tirada, antes de abrirla: con alguno de
// sus aplicados posibles (o con el suyo, si no hay lista). Lo usan el índice de casillas y los
// textos de tirada.
export function alcanzaAlgunAplicado(alcance: Extract<AlcanceModificador, { tipo: "aplicado" }>, ctx: ContextoAccion): boolean {
  if (alcance.salvoGrupo === ctx.grupo) return false;
  const posibles = ctx.aplicadosPosibles ?? (ctx.aplicado ? [ctx.aplicado] : []);
  return posibles.some((a) => alcance.aplicados.includes(a));
}

// Lo que cuenta como penalizador al anularlo: lo que viene de estados y umbrales (origen
// "estado", con las compensaciones de la Neuroprótesis) y las compensaciones marcadas.
const esDePenalizador = (m: ModificadorConFuente) => m.origen === "estado" || (m.tipo === "tirada" && m.compensa === true);

// Con un `anulaPenalizadores` que alcance a la tirada, una línea más que deja a 0 lo que suman
// sus penalizadores (si suman menos de 0). Sin él, la misma lista.
export function conPenalizadoresAnulados(mods: ModificadorConFuente[], ctx: ContextoAccion): ModificadorConFuente[] {
  const anula = mods.find((m) => m.tipo === "anulaPenalizadores" && alcanzaA(m.alcance, ctx));
  if (!anula) return mods;
  const neto = mods.reduce(
    (t, m) => (m.tipo === "tirada" && esDePenalizador(m) && alcanzaA(m.alcance, ctx) ? t + m.valor : t),
    0,
  );
  if (neto >= 0) return mods;
  return [...mods, { tipo: "tirada", alcance: { tipo: "todas" }, valor: -neto, origen: anula.origen, fuente: `${anula.fuente} (anula penalizadores)` }];
}

export function bonoAlcance(mods: ModificadorConFuente[], ctx: ContextoAccion): number {
  return mods.reduce(
    (t, m) => (m.tipo === "tirada" && alcanzaA(m.alcance, ctx) ? t + m.valor : t),
    0,
  );
}

// Una línea por modificador que le toca a esta tirada ahora mismo, con su
// fuente — mismo patrón que desgloseCondiciones/desgloseBonosTramo.
export function desgloseAlcance(
  mods: ModificadorConFuente[],
  ctx: ContextoAccion,
): { etiqueta: string; valor: number }[] {
  return mods
    .filter((m): m is Extract<Modificador, { tipo: "tirada" }> & ModificadorConFuente =>
      m.tipo === "tirada" && alcanzaA(m.alcance, ctx),
    )
    .map((m) => ({ etiqueta: m.fuente, valor: m.valor }));
}

// Agrupa por fuente para poder mostrar "Arkorü: +1 Aguante" en la ficha.
export function porFuente(
  mods: ModificadorConFuente[],
): { fuente: string; origen: OrigenModificador; mods: ModificadorConFuente[] }[] {
  const mapa = new Map<string, ModificadorConFuente[]>();
  for (const m of mods) {
    const lista = mapa.get(m.fuente) ?? [];
    lista.push(m);
    mapa.set(m.fuente, lista);
  }
  return [...mapa.entries()].map(([fuente, lista]) => ({
    fuente,
    origen: lista[0].origen,
    mods: lista,
  }));
}
