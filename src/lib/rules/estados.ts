// El motor de estados de combate (fase 6b, docs/fase-6b.md bloque 0).
//
// Dos familias de estado, que comparten el mismo mecanismo de salida
// (ModificadorConFuente con origen "estado", el socket que ya existía
// reservado en modificadores.ts desde la fase 4) pero llegan por caminos
// distintos:
//
//   - Los umbrales de PG/fatiga (este fichero, más abajo) se DERIVAN solos
//     del número actual frente al máximo — nadie los "aplica", igual que hoy
//     se derivan los aplicados o la salud máxima.
//   - Los ~20 estados del catálogo (docs/sistema.md §7) los aplica el máster
//     a mano en un combate — llegan en 0.3/0.4, con su propio catálogo y su
//     propia función `modificadoresDeEstados()`.
//
// Fuente de los umbrales: docs/sistema.md §7 y docs/sistema-y-combate.md
// "Puntos de salud". Dos supuestos numerados en docs/sistema.md cubren lo
// que el documento no dice explícitamente: S14 (los umbrales de un mismo
// recurso no se acumulan, solo el más profundo aporta su penalizador) y S15
// (cómo se interpreta el "mínimo 1" de Moribundo/Exhausto).
import type { AplicadoId } from "./atributos";
import type { ModificadorConFuente, OrigenModificador } from "./modificadores";
import { esEstadoDeAumento, estadoPorId } from "../catalog/estados";

export type UmbralSalud = "normal" | "herido" | "malherido" | "moribundo";
export type UmbralFatiga = "normal" | "fatigado" | "exhausto";

// Cruza un valor actual con su máximo y una banda de umbrales, de la más
// profunda a la más superficial (S14: gana la primera que se cumpla). El
// `limiteMinimo` opcional es el "(mínimo 1)" de Moribundo/Exhausto (S15):
// sin él, un personaje con máximo bajo podría no cruzar nunca ese 10% antes
// de llegar a 0 PG, que ya es un estado distinto (inconsciente).
function pasaUmbral(actual: number, max: number, fraccion: number, limiteMinimo = 0): boolean {
  if (max <= 0) return false;
  return actual < Math.max(limiteMinimo, max * fraccion);
}

export function umbralSalud(pgActual: number, pgMax: number): UmbralSalud {
  if (pasaUmbral(pgActual, pgMax, 0.1, 2)) return "moribundo";
  if (pasaUmbral(pgActual, pgMax, 0.25)) return "malherido";
  if (pasaUmbral(pgActual, pgMax, 0.5)) return "herido";
  return "normal";
}

export function umbralFatiga(fatigaActual: number, fatigaMax: number): UmbralFatiga {
  if (pasaUmbral(fatigaActual, fatigaMax, 0.1, 2)) return "exhausto";
  if (pasaUmbral(fatigaActual, fatigaMax, 0.25)) return "fatigado";
  return "normal";
}

const PENALIZADOR_SALUD: Record<Exclude<UmbralSalud, "normal">, number> = {
  herido: -1,
  malherido: -3,
  moribundo: -5,
};

const PENALIZADOR_FATIGA: Record<Exclude<UmbralFatiga, "normal">, number> = {
  fatigado: -1,
  exhausto: -2,
};

const ETIQUETA_UMBRAL: Record<Exclude<UmbralSalud, "normal"> | Exclude<UmbralFatiga, "normal">, string> = {
  herido: "Herido",
  malherido: "Malherido",
  moribundo: "Moribundo",
  fatigado: "Fatigado",
  exhausto: "Exhausto",
};

// El umbral de un recurso con su etiqueta y su −N base (sin el ajuste de especie),
// para enseñarlo fuera de la ficha (vista previa de la pestaña Vida del máster).
// null = sin umbral.
export type UmbralVital = { id: Exclude<UmbralSalud | UmbralFatiga, "normal">; etiqueta: string; penalizador: number };

export function umbralVital(recurso: "vida" | "fatiga", actual: number, max: number): UmbralVital | null {
  if (recurso === "vida") {
    const u = umbralSalud(actual, max);
    return u === "normal" ? null : { id: u, etiqueta: ETIQUETA_UMBRAL[u], penalizador: PENALIZADOR_SALUD[u] };
  }
  const u = umbralFatiga(actual, max);
  return u === "normal" ? null : { id: u, etiqueta: ETIQUETA_UMBRAL[u], penalizador: PENALIZADOR_FATIGA[u] };
}

// Puntos menos de penalizador por recurso (§14.8 y R8 de §11.3): especie (Guerrero heridas,
// Siervo fatiga) y aumentos (Estabilización Autonómica, heridas y fatiga), `valor` puntos
// menos en cada tramo, con la fuente para el desglose. Cada reducción baja el penalizador en 1
// y se suma a las demás (sumaAjustesUmbrales); el tramo no pasa de 0. Lo resuelve
// resolverFicha y llega por parámetro obligatorio; sin nada, SIN_AJUSTE_UMBRALES. Solo toca
// el −N de las tiradas: la velocidad y la carga del mismo umbral no cambian
// (movimientoPorUmbrales no lo recibe).
// TODO(revisar): §14.8 dice "reducen en 1 los penalizadores"; se lee como el −N a
// todo (M12), no como la media velocidad ni la carga de §7.
export type AjusteUmbral = { valor: number; fuente: string };
export type AjusteUmbrales = { salud: AjusteUmbral | null; fatiga: AjusteUmbral | null };
export const SIN_AJUSTE_UMBRALES: AjusteUmbrales = { salud: null, fatiga: null };

// Junta varios ajustes (especie + aumentos) en uno por recurso: los valores se suman y las
// fuentes se leen juntas ("Manduk · Siervo y Estabilización Autonómica").
export function sumaAjustesUmbrales(...ajustes: AjusteUmbrales[]): AjusteUmbrales {
  const suma = (recurso: keyof AjusteUmbrales): AjusteUmbral | null => {
    const con = ajustes.flatMap((a) => (a[recurso] ? [a[recurso]!] : []));
    if (con.length === 0) return null;
    return { valor: con.reduce((t, a) => t + a.valor, 0), fuente: [...new Set(con.map((a) => a.fuente))].join(" y ") };
  };
  const salud = suma("salud");
  const fatiga = suma("fatiga");
  return salud || fatiga ? { salud, fatiga } : SIN_AJUSTE_UMBRALES;
}

// Una reducción que solo vale en las tiradas con ciertos aplicados (Neurogénesis Hipocampal:
// fatiga, en perspicacia, voluntad y expresión). No entra en el ajuste general: sale como una
// compensación propia (+valor) con alcance "aplicado", y solo si el tramo sigue penalizando
// tras el ajuste general; nunca deja el penalizador por encima de 0.
export type ReduccionPorAplicado = {
  recurso: keyof AjusteUmbrales;
  valor: number;
  aplicados: AplicadoId[];
  fuente: string;
  origen: OrigenModificador;
};

function valorDeUmbral(penalizador: number, ajuste: AjusteUmbral | null): number {
  return Math.min(0, penalizador + (ajuste?.valor ?? 0));
}

function modificadorDeUmbral(valor: number, etiqueta: string, ajuste: AjusteUmbral | null): ModificadorConFuente | null {
  // Un tramo que el ajuste deja en 0 no da línea en el desglose.
  if (valor === 0) return null;
  return {
    tipo: "tirada",
    alcance: { tipo: "todas" },
    valor,
    origen: "estado",
    fuente: ajuste ? `${etiqueta} (${ajuste.fuente})` : etiqueta,
  };
}

// Las compensaciones por aplicado de un recurso sobre su penalizador ya ajustado (`valor`,
// ≤ 0). Se descuentan en orden de lo que queda por compensar, para que juntas tampoco pasen
// de 0 (hoy solo existe Neurogénesis).
function compensacionesPorAplicado(
  valor: number,
  etiqueta: string,
  reducciones: ReduccionPorAplicado[],
): ModificadorConFuente[] {
  let restante = -valor;
  return reducciones.flatMap((r): ModificadorConFuente[] => {
    const v = Math.min(r.valor, restante);
    if (v <= 0) return [];
    restante -= v;
    return [{ tipo: "tirada", alcance: { tipo: "aplicado", aplicados: r.aplicados }, valor: v, compensa: true, origen: r.origen, fuente: `${r.fuente} (${etiqueta})` }];
  });
}

// El "-1/-3/-5 a todo" de PG y el "-1/-2 a todo" de fatiga (docs/sistema.md
// §7), listos para sumarse al resto de modificadores de la ficha: resolverFicha los
// mete en FichaResuelta.modificadores (M1b), así llegan a montarTirada y a
// prepararPoder sin que nadie más los sume. La velocidad y la carga del mismo
// umbral, que no son deltas, van aparte: movimientoPorUmbrales, abajo.
// `porAplicado` (A3 de aumentos): compensaciones que solo valen con ciertos aplicados, detrás
// del penalizador de su recurso. Las casa montarTirada con el aplicado con el que se tira.
export function modificadoresDeUmbrales(
  pgActual: number,
  pgMax: number,
  fatigaActual: number,
  fatigaMax: number,
  ajuste: AjusteUmbrales,
  porAplicado: ReduccionPorAplicado[] = [],
): ModificadorConFuente[] {
  const mods: ModificadorConFuente[] = [];
  const tramo = (recurso: keyof AjusteUmbrales, penalizador: number, etiqueta: string) => {
    const valor = valorDeUmbral(penalizador, ajuste[recurso]);
    const m = modificadorDeUmbral(valor, etiqueta, ajuste[recurso]);
    if (m) mods.push(m);
    mods.push(...compensacionesPorAplicado(valor, etiqueta, porAplicado.filter((r) => r.recurso === recurso)));
  };

  const salud = umbralSalud(pgActual, pgMax);
  if (salud !== "normal") tramo("salud", PENALIZADOR_SALUD[salud], ETIQUETA_UMBRAL[salud]);

  const fatiga = umbralFatiga(fatigaActual, fatigaMax);
  if (fatiga !== "normal") tramo("fatiga", PENALIZADOR_FATIGA[fatiga], ETIQUETA_UMBRAL[fatiga]);

  return mods;
}

// El resto de la tabla de §7: "media velocidad" (Malherido, Exhausto), "una casilla
// por turno" (Moribundo, solo como nota) y "−25 %/−50 % de carga". Lo aplica
// resolverFicha sobre el movimiento y la carga ya calculados.
// TODO(revisar): supuestos S26-S29 de docs/sistema.md (a qué movimientos afecta,
// cómo se combinan Malherido y Exhausto, redondeo, orden con la especie).
export type MovimientoPorUmbral = {
  // Fuentes que dan media velocidad ("Malherido", "Exhausto"); vacío si ninguna.
  // Varias no se acumulan: la velocidad se divide entre 2 una sola vez (S27).
  mediaVelocidad: string[];
  unaCasillaPorTurno: string | null;
  // La mayor reducción de carga, no la suma (S27), con las fuentes que la dan.
  reduccionCarga: { fraccion: number; fuentes: string[] } | null;
};

const MEDIA_VELOCIDAD = new Set<string>(["malherido", "exhausto"]);
const REDUCCION_CARGA: Partial<Record<Exclude<UmbralSalud, "normal"> | Exclude<UmbralFatiga, "normal">, number>> = {
  malherido: 0.25,
  moribundo: 0.5,
  exhausto: 0.25,
};

export function movimientoPorUmbrales(salud: UmbralSalud, fatiga: UmbralFatiga): MovimientoPorUmbral {
  const activos = [salud, fatiga].filter((u): u is Exclude<UmbralSalud | UmbralFatiga, "normal"> => u !== "normal");
  const fraccion = Math.max(0, ...activos.map((u) => REDUCCION_CARGA[u] ?? 0));
  return {
    mediaVelocidad: activos.filter((u) => MEDIA_VELOCIDAD.has(u)).map((u) => ETIQUETA_UMBRAL[u]),
    unaCasillaPorTurno: salud === "moribundo" ? ETIQUETA_UMBRAL.moribundo : null,
    reduccionCarga:
      fraccion > 0
        ? { fraccion, fuentes: activos.filter((u) => REDUCCION_CARGA[u] === fraccion).map((u) => ETIQUETA_UMBRAL[u]) }
        : null,
  };
}

// Un estado del catálogo (0.3) puesto en un combatiente concreto: qué grado
// le tocó y cuántas rondas le quedan. Vive aquí, no en el schema de Prisma
// del bloque 1 todavía — esa forma se decide al construir Combatiente, esto
// es solo lo que necesita la función de abajo para hacer su trabajo.
export type EstadoActivo = {
  estadoId: string;
  gradoId: string;
  // null = sin límite de rondas conocido (algunos estados no dan uno, ver
  // catalog/estados.ts); un número que descuenta el bloque 2 al avanzar
  // turno.
  rondasRestantes: number | null;
  // Solo con rondasRestantes null: dura hasta el fin de escena. Hoy es una etiqueta para
  // el máster: "Limpiar estados" los quita todos, sean de escena o no. Opcional para que
  // lo ya guardado en Combatiente.estados siga valiendo tal cual.
  finDeEscena?: true;
  // A7: puesto con "Aplicar igualmente" a quien es inmune. Hace efecto aunque haya inmunidad.
  // Opcional por lo mismo que finDeEscena.
  forzado?: true;
};

// Inmunidad a un estado del catálogo (A7: Ojo Biónico 2-4, Regeneración Tisular), con la pieza
// que la da: "Ojo Biónico 2". La calcula inmunidadesDe (inmunidades.ts) con la ficha.
export type Inmunidad = { estadoId: string; fuente: string };

// La inmunidad que deja sin efecto este estado puesto, o null: la hay y no se forzó.
export function inmunidadQueAnula(activo: EstadoActivo, inmunidades: readonly Inmunidad[]): Inmunidad | null {
  if (activo.forzado) return null;
  return inmunidades.find((i) => i.estadoId === activo.estadoId) ?? null;
}

// Los estados que hacen efecto (A7): sin los puestos antes de ganar la inmunidad (siguen en la
// lista y el máster los quita cuando quiera). Los forzados sí cuentan.
export function estadosConEfecto(activos: EstadoActivo[], inmunidades: readonly Inmunidad[]): EstadoActivo[] {
  if (inmunidades.length === 0) return activos;
  return activos.filter((e) => !inmunidadQueAnula(e, inmunidades));
}

// Las tres duraciones que elige el máster (docs/tareas.md, E1). Es la vista de
// EstadoActivo para pintar y validar; lo guardado sigue siendo EstadoActivo.
export type DuracionEstado =
  | { tipo: "rondas"; rondas: number }
  | { tipo: "escena" }
  | { tipo: "hastaQuitarlo" };

export function duracionDe(activo: EstadoActivo): DuracionEstado {
  if (activo.rondasRestantes !== null) return { tipo: "rondas", rondas: activo.rondasRestantes };
  return activo.finDeEscena ? { tipo: "escena" } : { tipo: "hastaQuitarlo" };
}

export function estadoActivoCon(estadoId: string, gradoId: string, duracion: DuracionEstado): EstadoActivo {
  switch (duracion.tipo) {
    case "rondas":
      return { estadoId, gradoId, rondasRestantes: duracion.rondas };
    case "escena":
      return { estadoId, gradoId, rondasRestantes: null, finDeEscena: true };
    case "hastaQuitarlo":
      return { estadoId, gradoId, rondasRestantes: null };
  }
}

// Traduce los estados que el máster ha aplicado a un combatiente en
// ModificadorConFuente[] — calcado de modificadoresDeEquipo()
// (lib/rules/equipo.ts): un estadoId o gradoId que ya no exista en el
// catálogo (dato viejo, typo) se ignora sin reventar el resto del cálculo,
// igual que equipoPorId con un catalogoId huérfano.
// `reduccion` (Neuroprótesis activa, A5a): −valor a cada penalizador de tirada de cada estado,
// por separado y sin pasar de 0, como una compensación con el mismo alcance detrás de él
// ("Neuroprótesis Simpática 1 (Aturdido)"). Los penalizadores a atributos no se tocan.
// TODO(revisar): "reducir penalizadores por estado en 1" se lee como el −N a las tiradas; los
// −N a atributos de Enfermedad o Parálisis no se reducen.
export function modificadoresDeEstados(
  activos: EstadoActivo[],
  reduccion: { valor: number; fuente: string } | null = null,
): ModificadorConFuente[] {
  return activos.flatMap((activo): ModificadorConFuente[] => {
    const estado = estadoPorId(activo.estadoId);
    if (!estado) return [];
    const grado = estado.grados.find((g) => g.id === activo.gradoId);
    if (!grado) return [];
    return grado.modificadores.flatMap((m): ModificadorConFuente[] => {
      const propio: ModificadorConFuente = { ...m, origen: "estado", fuente: estado.label };
      if (!reduccion || m.tipo !== "tirada" || m.valor >= 0) return [propio];
      const compensa: ModificadorConFuente = {
        tipo: "tirada",
        alcance: m.alcance,
        valor: Math.min(reduccion.valor, -m.valor),
        origen: "estado",
        fuente: `${reduccion.fuente} (${estado.label})`,
      };
      return [propio, compensa];
    });
  });
}

// Un EstadoActivo (solo ids) con el label/detalle que trae su grado en el
// catálogo, para pintarlo sin que cada consumidor repita la búsqueda —
// antes vivía inline en CombateConsole.tsx (subtarea 2.5); la fase 6b
// bloque 3 necesita la misma traducción en la ficha del jugador, así que
// se comparte aquí. Un estadoId/gradoId huérfano (dato viejo, typo) cae al
// propio id en vez de reventar, mismo criterio que modificadoresDeEstados().
export type EstadoActivoDescrito = EstadoActivo & {
  label: string;
  // Por separado, para los chips (ChipEstado): "Aturdido" y "Fracaso"; grado null si el
  // estado tiene un único grado.
  nombre: string;
  grado: string | null;
  duracion: DuracionEstado;
  // Frases del catálogo ya unidas para pintar directo — array vacío si el
  // grado no trae detalle o no se encontró en el catálogo.
  detalle: string[];
  // Solo los estados propios de un aumento activable (A5a): la duración larga para el chip
  // ("3 rondas, en combate", "hasta el final de la escena"), porque fuera de combate las
  // rondas no corren y se desactiva a mano.
  duracionActivable?: string;
  // A7: la fuente de la inmunidad que lo deja sin efecto ("Ojo Biónico 2"), para el chip.
  inmune?: string;
};

// "3 rondas, en combate" / "hasta el final de la escena" (A5a).
export function textoDuracionActivable(d: DuracionEstado): string {
  if (d.tipo === "rondas") return `${d.rondas} ${d.rondas === 1 ? "ronda" : "rondas"}, en combate`;
  return d.tipo === "escena" ? "hasta el final de la escena" : "hasta desactivarlo";
}

// `inmunidades` (A7): las de la ficha; un estado que anulan sale con `inmune`.
export function describirEstadosActivos(activos: EstadoActivo[], inmunidades: readonly Inmunidad[] = []): EstadoActivoDescrito[] {
  return activos.map((ea) => {
    const anula = inmunidadQueAnula(ea, inmunidades);
    const estado = estadoPorId(ea.estadoId);
    const grado = estado?.grados.find((g) => g.id === ea.gradoId);
    return {
      ...ea,
      duracion: duracionDe(ea),
      nombre: estado?.label ?? ea.estadoId,
      grado: estado && grado && estado.grados.length !== 1 ? grado.label : null,
      // El número de grados de ESTE estado, no de un desplegable ajeno que
      // pueda estar mostrando otro estado a medio elegir.
      label:
        estado && grado && estado.grados.length !== 1
          ? `${estado.label} (${grado.label})`
          : (estado?.label ?? ea.estadoId),
      detalle: grado?.detalle ?? [],
      ...(esEstadoDeAumento(ea.estadoId) && { duracionActivable: textoDuracionActivable(duracionDe(ea)) }),
      ...(anula && { inmune: anula.fuente }),
    };
  });
}

// Una ronda menos a cada estado activo con duración conocida; se cae solo al llegar a
// 0, sin que el máster tenga que quitarlo a mano. Se llama al cerrar la vuelta (pasar
// del último de la cola al primero, `pasarTurno` en turnos.ts), para todos a la vez,
// no con cada turno (decisión del usuario 2026-10-16, S77). `null` es "sin límite"
// (escena, hasta quitarlo) y no se toca.
export function descontarDuracion(estados: EstadoActivo[]): EstadoActivo[] {
  return estados
    .map((e) => (e.rondasRestantes === null ? e : { ...e, rondasRestantes: e.rondasRestantes - 1 }))
    .filter((e) => e.rondasRestantes === null || e.rondasRestantes > 0);
}
