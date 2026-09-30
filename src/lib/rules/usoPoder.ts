// Usar un poder psiónico, sin UI: lo que el modal enseña antes de usarlo
// (prepararPoder) y lo que hay que aplicar a la ficha al usarlo (usarPoder) o
// al conocer el resultado de la tirada (efectosDelResultado). La pantalla solo
// pinta y aplica: no decide ninguna regla.
//
// Todo entra explícito: la ficha, los modificadores ya montados (equipo,
// especie, estados de combate…, que no están todos en la ficha) y lo que el
// jugador ha elegido en el modal. Nada se lee de fuera.
import type { Accion } from "./acciones";
import { aplicados, salud } from "./derivados";
import type { ModificadorConFuente } from "./modificadores";
import {
  bloqueoPorFatiga,
  costeFatiga,
  cruzaSobrecarga,
  derivacionDeFicha,
  efectosDeCasillas,
  enEspecialidadDePoder,
  maxPuntosConCargas,
  pagoConCargas,
  resolverPoder,
  tiradaDePoder,
  togglesDeFatiga,
  valoresHabilidad,
  type CosteFatiga,
  type Derivacion,
  type PoderDisponible,
  type PoderResuelto,
  type ToggleFatiga,
} from "./poderes";
import type { Grado } from "./psionica";
import type { Sheet } from "./sheet";
import { fatigaEfectiva } from "./vitalidad";
import { FUENTES_EXTERNAS_FATIGA } from "../catalog/psionica";

export type SeleccionPoder = {
  elecciones: Record<string, string>;
  casillas: string[]; // casillas de fatiga marcadas (toggle)
  puntosCargas: number; // Derivación Psiónica
  pesoKg?: number; // Proeza
};

export const SELECCION_PODER_VACIA: SeleccionPoder = { elecciones: {}, casillas: [], puntosCargas: 0 };

export type EntradaPoder = {
  ficha: Sheet;
  modificadores: ModificadorConFuente[];
  poder: PoderDisponible;
  seleccion: SeleccionPoder;
};

export type PoderPreparado = {
  poder: PoderDisponible;
  resuelto: PoderResuelto;
  seleccion: SeleccionPoder; // con las elecciones efectivas (las no disponibles, corregidas)
  // Coste final: cadena de fatiga y, al final, lo pagado con cargas. null = la
  // fatiga del poder no es un número (se paga a mano).
  coste: CosteFatiga | null;
  casillas: ToggleFatiga[];
  cargas: { derivacion: Derivacion; puntos: number; gastar: number; max: number } | null;
  bloqueo: string | null;
  fatigaActual: number; // efectiva (menos la temporal de Proeza)
  // Tirada lista para el modal, con los ajustes de las casillas ya puestos; null
  // si el poder no tira.
  tirada: Accion | null;
  enEspecialidad: boolean;
  extraProrroga: number; // Proeza: lo que cuesta prolongar un turno
};

// null = el personaje no llega al nivel de la acción.
export function prepararPoder({ ficha, modificadores, poder, seleccion }: EntradaPoder): PoderPreparado | null {
  const resuelto = resolverPoder(poder.accion, {
    nivelPoseido: poder.nivelPoseido,
    elecciones: seleccion.elecciones,
    aplicados: aplicados(ficha, modificadores),
    habilidades: valoresHabilidad(ficha),
    niveles: ficha.psionica,
    disciplina: poder.disciplina,
    pesoKg: seleccion.pesoKg,
  });
  if (!resuelto) return null;
  const marcadas = new Set(seleccion.casillas);

  const sinCargas =
    typeof resuelto.fatiga === "number"
      ? costeFatiga(poder.disciplina, poder.accion.id, resuelto, { externos: FUENTES_EXTERNAS_FATIGA, toggles: marcadas })
      : null;
  const derivacion = derivacionDeFicha(ficha);
  const pago = sinCargas && derivacion ? pagoConCargas(sinCargas, derivacion, seleccion.puntosCargas) : null;
  const coste = pago?.coste ?? sinCargas;
  const fatigaActual = fatigaEfectiva(ficha);
  const bloqueo =
    resuelto.exceso?.bloqueo ?? (coste ? bloqueoPorFatiga(poder.accion, coste.total, Math.max(0, fatigaActual)) : null);

  // Casillas externas marcadas (Xovromium +1, Supresora −2): líneas del desglose.
  const base = tiradaDePoder(poder.accion, resuelto);
  const { ajustes } = efectosDeCasillas(FUENTES_EXTERNAS_FATIGA, marcadas);
  const tirada = base && ajustes.length > 0 ? { ...base, ajustesFijos: [...(base.ajustesFijos ?? []), ...ajustes] } : base;

  return {
    poder,
    resuelto,
    seleccion: { ...seleccion, elecciones: resuelto.elecciones },
    coste,
    casillas: togglesDeFatiga(poder.disciplina, poder.accion.id, resuelto, FUENTES_EXTERNAS_FATIGA),
    cargas:
      derivacion && sinCargas
        ? {
            derivacion,
            puntos: pago?.puntos ?? 0,
            gastar: pago?.cargas ?? 0,
            max: maxPuntosConCargas(sinCargas.total, derivacion),
          }
        : null,
    bloqueo,
    fatigaActual,
    tirada,
    enEspecialidad: enEspecialidadDePoder(ficha, resuelto),
    extraProrroga: resuelto.exceso?.extra ?? 0,
  };
}

// Qué hacer con la sobrecarga pendiente del modal: salta una nueva, se borra la
// anterior (uso nuevo) o se deja como estaba (prolongar sin cruzar el umbral,
// para no perder una salvación aún sin tirar).
export type CambioSobrecarga = { tipo: "salta"; nivel: number } | { tipo: "reiniciar" } | { tipo: "mantener" };

export type EfectosDeUso = {
  fatiga: { pagar: number; temporal: boolean };
  cargas: { instanciaId: string; gastar: number } | null;
  vida: number; // a restar
  sobrecarga: CambioSobrecarga;
  avisos: string[];
};

// Gasto al usar un poder (con tirada o sin ella), falle o no. "prolongar" = otro
// turno de Proeza: cobra solo el extra, sin cargas ni daño propio del uso.
// Umbrales y sobrecarga van contra la fatiga EFECTIVA.
export function usarPoder(
  ficha: Sheet,
  modificadores: ModificadorConFuente[],
  p: PoderPreparado,
  modo: "uso" | "prolongar" = "uso",
): EfectosDeUso {
  const uso = modo === "uso";
  const pagar = uso ? (p.coste?.total ?? 0) : p.extraProrroga;
  const antes = fatigaEfectiva(ficha);
  const despues = antes - pagar;
  const cruza = cruzaSobrecarga(antes, despues, salud(ficha, modificadores).fatiga);

  const propio = uso ? p.resuelto.danioPropio : null;
  const danioPropio = propio && typeof propio.valor === "number" && propio.valor > 0 ? propio.valor : 0;
  // Supresora con fallo crítico: 1 de daño por punto de fatiga gastado.
  const porPunto = efectosDeCasillas(FUENTES_EXTERNAS_FATIGA, new Set(p.seleccion.casillas)).danioPorPunto;
  const danioSupresora = porPunto && pagar > 0 ? pagar : 0;

  const avisos = [
    ...(despues <= 0 && !cruza ? ["Te has quedado sin fatiga: quedas inconsciente al terminar la acción."] : []),
    ...(danioSupresora > 0 ? [`Munición Supresora: recibes ${pagar} de daño ${porPunto} (ya restado).`] : []),
    ...(propio && danioPropio > 0
      ? [
          `Recibes ${danioPropio} de daño ${propio.categoria} (ya restado)${
            p.resuelto.exceso?.enLimite ? " y quedas inconsciente al terminar la acción" : ""
          }.`,
        ]
      : []),
  ];

  return {
    fatiga: { pagar, temporal: p.poder.accion.permiteFatigaTemporal },
    cargas:
      uso && p.cargas && p.cargas.gastar > 0 ? { instanciaId: p.cargas.derivacion.instanciaId, gastar: p.cargas.gastar } : null,
    vida: danioPropio + danioSupresora,
    sobrecarga: cruza
      ? { tipo: "salta", nivel: p.resuelto.nivelEmpleado }
      : uso
        ? { tipo: "reiniciar" }
        : { tipo: "mantener" },
    avisos,
  };
}

// Tras tirar: el daño propio que depende del grado (fracaso crítico del Sondeo
// o de la Precognición).
export function efectosDelResultado(p: PoderPreparado, grado: Grado | null): { vida: number; avisos: string[] } {
  const propio = grado ? p.tirada?.poder?.danioPropio?.[grado] : undefined;
  if (!propio) return { vida: 0, avisos: [] };
  return { vida: propio.valor, avisos: [`Recibes ${propio.valor} de daño ${propio.categoria} (ya restado).`] };
}
