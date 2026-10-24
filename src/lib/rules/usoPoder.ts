// Usar un poder psiónico, sin UI: lo que el modal enseña antes de usarlo
// (prepararPoder) y lo que hay que aplicar a la ficha al usarlo (usarPoder) o
// al conocer el resultado de la tirada (efectosDelResultado), y el peaje neurológico
// del Maolher que deja ese uso (tirarPeaje). La pantalla solo
// pinta y aplica: no decide ninguna regla.
//
// Todo entra explícito: la ficha, los modificadores ya montados (equipo,
// especie, estados de combate…, que no están todos en la ficha) y lo que el
// jugador ha elegido en el modal. Nada se lee de fuera.
import { ACCIONES, type Accion, type Resultado } from "./acciones";
import { aplicados, salud } from "./derivados";
import type { ModificadorConFuente } from "./modificadores";
import {
  eleccionSinTocar,
  montarTirada,
  SIN_ELECCION,
  tirarMontada,
  type FichaParaTirada,
  type TiradaMontada,
} from "./montaje";
import type { FichaResuelta } from "./fichaResuelta";
import {
  bloqueoPorFatiga,
  costeFatiga,
  cruzaSobrecarga,
  bonoAlcanceDeFicha,
  derivacionDeFicha,
  gradoDeTirada,
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
import type { Grado, NivelesPsionica } from "./psionica";
import type { Sheet } from "./sheet";
import type { TextoEnTirada } from "./especie";
import { conTextosEnTirada, contextoDe, textosDe, textosSinDado } from "./textosTirada";
import { consultaIndiceCondiciones, type IndiceCondiciones } from "./equipo";
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
  // FichaResuelta.psionica.paraEfectos (Resonancia +1 de especie incluida, tope 6).
  niveles: NivelesPsionica;
  poder: PoderDisponible;
  seleccion: SeleccionPoder;
  // Los textos de la ficha que cuelgan de tiradas (FichaResuelta.textosTirada, ya calculados):
  // aquí se eligen los de este poder (por el id de su acción) y van a la nota o al crítico de su
  // tirada, o a sus notas si no tira (D2c-2: Onda Residual en Expansión). La UI solo los pasa.
  textos?: TextoEnTirada[];
  // FichaResuelta.indiceCondiciones: las casillas con alcance que casan con la tirada del poder
  // (A2b de aumentos: las de aplicado, como Prefrontal en un poder de Voluntad, y las de
  // "todas", como Conectividad Callosa), igual que conExtrasDeFicha en cualquier otra tirada.
  indiceCondiciones?: IndiceCondiciones;
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
  // La tirada montada como abre el modal, sin tocar nada (lo que enseña la fila: su
  // `modificador`, con los umbrales de §7 dentro); null si no tira.
  montada: TiradaMontada | null;
  extraProrroga: number; // Proeza: lo que cuesta prolongar un turno
};

// null = el personaje no llega al nivel de la acción.
export function prepararPoder({
  ficha,
  modificadores,
  niveles,
  poder,
  seleccion,
  textos = [],
  indiceCondiciones,
}: EntradaPoder): PoderPreparado | null {
  const sinTextos = resolverPoder(poder.accion, {
    nivelPoseido: poder.nivelPoseido,
    elecciones: seleccion.elecciones,
    aplicados: aplicados(ficha, modificadores),
    habilidades: valoresHabilidad(ficha),
    niveles,
    disciplina: poder.disciplina,
    pesoKg: seleccion.pesoKg,
    bonoAlcance: bonoAlcanceDeFicha(ficha) ?? undefined,
  });
  if (!sinTextos) return null;
  const marcadas = new Set(seleccion.casillas);

  const sinCargas =
    typeof sinTextos.fatiga === "number"
      ? costeFatiga(poder.disciplina, poder.accion.id, sinTextos, { externos: FUENTES_EXTERNAS_FATIGA, toggles: marcadas })
      : null;
  const derivacion = derivacionDeFicha(ficha);
  const pago = sinCargas && derivacion ? pagoConCargas(sinCargas, derivacion, seleccion.puntosCargas) : null;
  const coste = pago?.coste ?? sinCargas;
  const fatigaActual = fatigaEfectiva(ficha);
  const bloqueo =
    poder.bloqueo ??
    sinTextos.exceso?.bloqueo ??
    (coste ? bloqueoPorFatiga(poder.accion, coste.total, Math.max(0, fatigaActual)) : null);

  // Casillas externas marcadas (Xovromium +1, Supresora −2): líneas del desglose.
  const base = tiradaDePoder(poder.accion, sinTextos);
  const { ajustes } = efectosDeCasillas(FUENTES_EXTERNAS_FATIGA, marcadas);
  const conAjustes = base && ajustes.length > 0 ? { ...base, ajustesFijos: [...(base.ajustesFijos ?? []), ...ajustes] } : base;
  // Textos de la ficha para este poder: a su tirada como en cualquier otra (conExtrasDeFicha);
  // sin tirada, a las notas de la ventana (CabeceraPoder), sin distinguir el crítico.
  const ctx = contextoDe({
    id: poder.accion.id,
    grupo: "Psiónica",
    habilidad: conAjustes?.habilidad ?? null,
    ...(conAjustes && { aplicado: conAjustes.aplicado, condiciones: conAjustes.condiciones }),
  });
  const propios = textosDe(textos, ctx, false);
  const extra = conAjustes && indiceCondiciones ? consultaIndiceCondiciones(indiceCondiciones, ctx) : [];
  const conCasillas =
    conAjustes && extra.length > 0 ? { ...conAjustes, condiciones: [...(conAjustes.condiciones ?? []), ...extra] } : conAjustes;
  const tirada = conCasillas && conTextosEnTirada(conCasillas, propios);
  const resuelto: PoderResuelto =
    !conAjustes && propios.length > 0
      ? { ...sinTextos, notas: [...sinTextos.notas, ...textosSinDado(propios).map((texto) => ({ texto, lugar: "tirada" as const }))] }
      : sinTextos;
  const enEspecialidad = enEspecialidadDePoder(ficha, resuelto);

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
    enEspecialidad,
    montada: tirada ? montarTirada({ ficha, modificadores }, tirada, eleccionSinTocar(tirada)) : null,
    extraProrroga: resuelto.exceso?.extra ?? 0,
  };
}

// Qué hacer con la sobrecarga pendiente del modal: salta una nueva, se borra la
// anterior (uso nuevo) o se deja como estaba (prolongar sin cruzar el umbral,
// para no perder una salvación aún sin tirar).
export type CambioSobrecarga = { tipo: "salta"; nivel: number } | { tipo: "reiniciar" } | { tipo: "mantener" };

// Peaje neurológico (Maolher, §14.9) de este uso: salvación de Fortaleza contra
// `dificultad`; `puntos` = fatiga pagada, que es el daño si falla.
export type PeajeDeUso = { dificultad: number; puntos: number };

export type EfectosDeUso = {
  fatiga: { pagar: number; temporal: boolean };
  cargas: { instanciaId: string; gastar: number } | null;
  vida: number; // a restar
  sobrecarga: CambioSobrecarga;
  // null sin el rasgo o sin fatiga pagada. Va después de la sobrecarga.
  peaje: PeajeDeUso | null;
  avisos: string[];
};

// Lo de la ficha resuelta que hace falta para usar un poder.
export type FichaParaUso = Pick<FichaResuelta, "ficha" | "modificadores" | "peajeNeurologico">;

// Gasto al usar un poder (con tirada o sin ella), falle o no. "prolongar" = otro
// turno de Proeza: cobra solo el extra, sin cargas ni daño propio del uso.
// Umbrales y sobrecarga van contra la fatiga EFECTIVA.
// `ahorro`: lo que la casilla de ahorro de la tirada (Mielinización Central, A2b) no gastó en
// las casillas (TiradaMontada.ahorroSinUsar); se resta del uso, sin bajar de 0.
export function usarPoder(f: FichaParaUso, p: PoderPreparado, modo: "uso" | "prolongar" = "uso", ahorro = 0): EfectosDeUso {
  const { ficha, modificadores } = f;
  const uso = modo === "uso";
  const pagar = uso ? Math.max(0, (p.coste?.total ?? 0) - ahorro) : p.extraProrroga;
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
    peaje: peajeDeUso(f, p, pagar),
    avisos,
  };
}

// §14.9: se tira siempre que se pague fatiga, aunque el poder falle. `pagar` ya va sin
// lo que pagan las cargas de Derivación (si todo va con cargas, no hay peaje) y con la
// parte que Proeza manda a fatiga temporal (también es fatiga pagada). Prolongar
// Proeza paga peaje por su extra, con el mismo nivel empleado (usuario, E5).
// TODO(revisar): un poder con fatiga no numérica (se paga a mano) no llega aquí
// (AccionesTab no llama a usarPoder sin coste): el peaje de ese gasto, también a mano.
function peajeDeUso(f: FichaParaUso, p: PoderPreparado, pagar: number): PeajeDeUso | null {
  if (!f.peajeNeurologico || pagar <= 0) return null;
  return { dificultad: f.peajeNeurologico.dificultadBase + p.resuelto.nivelEmpleado, puntos: pagar };
}

// La salvación del peaje: la Salvación de Fortaleza montada como una normal (umbrales,
// estados… de la ficha), sin casillas marcadas. Sin blindaje: el daño no se absorbe (M16).
export function montarPeaje(ficha: FichaParaTirada): TiradaMontada {
  const salv = ACCIONES.find((a) => a.id === "salv_fortaleza")!;
  return montarTirada(ficha, salv, SIN_ELECCION);
}

export type ResultadoPeaje = {
  resultado: Resultado;
  danio: number; // a restar de la vida
  categoria: "no letal" | "letal" | null;
  aviso: string | null;
};

// Éxito (o crítico): nada. Fracaso: un nivel no letal por punto de fatiga pagado.
// Fracaso crítico: los mismos, letales.
export function danioDePeaje(puntos: number, grado: Grado): Omit<ResultadoPeaje, "resultado"> {
  if (grado === "exito" || grado === "critico" || puntos <= 0) return { danio: 0, categoria: null, aviso: null };
  const categoria = grado === "fracasoCritico" ? "letal" : "no letal";
  return { danio: puntos, categoria, aviso: `Peaje neurológico: recibes ${puntos} de daño ${categoria}.` };
}

export function tirarPeaje(ficha: FichaParaTirada, peaje: PeajeDeUso, dado: number): ResultadoPeaje {
  const resultado = tirarMontada(montarPeaje(ficha), dado, peaje.dificultad);
  return { resultado, ...danioDePeaje(peaje.puntos, gradoDeTirada(resultado)!) };
}

// Tras tirar: el daño propio que depende del grado (fracaso crítico del Sondeo
// o de la Precognición).
export function efectosDelResultado(p: PoderPreparado, grado: Grado | null): { vida: number; avisos: string[] } {
  const propio = grado ? p.tirada?.poder?.danioPropio?.[grado] : undefined;
  if (!propio) return { vida: 0, avisos: [] };
  return { vida: propio.valor, avisos: [`Recibes ${propio.valor} de daño ${propio.categoria} (ya restado).`] };
}
