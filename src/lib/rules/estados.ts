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
import type { ModificadorConFuente } from "./modificadores";
import { estadoPorId } from "../catalog/estados";

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

// Un tramo menos de penalizador por recurso (Guerrero heridas, Siervo fatiga, §14.8):
// `valor` puntos menos en cada tramo, con la fuente para el desglose. Lo resuelve la
// especie (ajusteUmbralesDeEspecie) y llega por parámetro obligatorio; sin especie,
// SIN_AJUSTE_UMBRALES. Solo toca el −N de las tiradas: la velocidad y la carga del
// mismo umbral no cambian (movimientoPorUmbrales no lo recibe).
// TODO(revisar): §14.8 dice "reducen en 1 los penalizadores"; se lee como el −N a
// todo (M12), no como la media velocidad ni la carga de §7.
export type AjusteUmbral = { valor: number; fuente: string };
export type AjusteUmbrales = { salud: AjusteUmbral | null; fatiga: AjusteUmbral | null };
export const SIN_AJUSTE_UMBRALES: AjusteUmbrales = { salud: null, fatiga: null };

function modificadorDeUmbral(
  penalizador: number,
  etiqueta: string,
  ajuste: AjusteUmbral | null,
): ModificadorConFuente | null {
  const valor = Math.min(0, penalizador + (ajuste?.valor ?? 0));
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

// El "-1/-3/-5 a todo" de PG y el "-1/-2 a todo" de fatiga (docs/sistema.md
// §7), listos para sumarse al resto de modificadores de la ficha: resolverFicha los
// mete en FichaResuelta.modificadores (M1b), así llegan a montarTirada y a
// prepararPoder sin que nadie más los sume. La velocidad y la carga del mismo
// umbral, que no son deltas, van aparte: movimientoPorUmbrales, abajo.
export function modificadoresDeUmbrales(
  pgActual: number,
  pgMax: number,
  fatigaActual: number,
  fatigaMax: number,
  ajuste: AjusteUmbrales,
): ModificadorConFuente[] {
  const mods: ModificadorConFuente[] = [];

  const salud = umbralSalud(pgActual, pgMax);
  if (salud !== "normal") {
    const m = modificadorDeUmbral(PENALIZADOR_SALUD[salud], ETIQUETA_UMBRAL[salud], ajuste.salud);
    if (m) mods.push(m);
  }

  const fatiga = umbralFatiga(fatigaActual, fatigaMax);
  if (fatiga !== "normal") {
    const m = modificadorDeUmbral(PENALIZADOR_FATIGA[fatiga], ETIQUETA_UMBRAL[fatiga], ajuste.fatiga);
    if (m) mods.push(m);
  }

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
};

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
export function modificadoresDeEstados(activos: EstadoActivo[]): ModificadorConFuente[] {
  return activos.flatMap((activo): ModificadorConFuente[] => {
    const estado = estadoPorId(activo.estadoId);
    if (!estado) return [];
    const grado = estado.grados.find((g) => g.id === activo.gradoId);
    if (!grado) return [];
    return grado.modificadores.map((m) => ({
      ...m,
      origen: "estado" as const,
      fuente: estado.label,
    }));
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
};

export function describirEstadosActivos(activos: EstadoActivo[]): EstadoActivoDescrito[] {
  return activos.map((ea) => {
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
