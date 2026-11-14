// Estar escondido (T4 del cuestionario de cierre, usuario 2026-11-13: eq-25, eq-26, eq-30, eq-31,
// eq-33, do-01, di-09).
//
// La app solo conoce la tirada de quien se esconde (docs/traspaso.md §8): su total se guarda como
// número en un estado (EstadoActivo.valor) y el máster lo compara a ojo con la Alerta de los
// suyos. Aquí vive:
//   - Lo que deja una tirada o una acción como estado con número (Sigilo, Arma escondida,
//     Disfrazado) o con modo (Camuflaje): `Accion.estadoAlTirar`, `AccionDirecta.estadoAlUsar`.
//   - La ocultación por sentido de una pieza (Camuflaje Trifásico: `NivelModulo.ocultacion`), que
//     se suma al Sigilo al enseñarlo, nunca al número guardado.
//   - Lo que te resta atacar estando en Sigilo (`Accion.sigiloAlAtacar`): el ruido del disparo,
//     que fija un amortiguador (Silenciador), y lo que delata al arma (luminiscencia).
//   - La fila «Esconder arma» (Reflejos + Sigilo con Juego de Manos).
// Lo aplica el servidor con la ficha guardada (aplicarConsecuenciaPropiaAction), con registro y
// deshacer, como lo que una acción te hace a ti (consecuenciasPropias.ts).
import type { Sheet } from "./sheet";
import type { Accion, AccionDirecta } from "./acciones";
import { ID_EN_COMPARTIMENTO, ID_ARMA_A_ESCONDER, ID_ESCONDER_ARMA } from "./acciones";
import type { CondicionTirada, OpcionCondicion } from "./condiciones";
import type { EstadoActivo } from "./estados";
import type { OperacionEstado } from "./vidaPorEstados";
import { nivelesHasta, ultimoQueDefine } from "./equipo";
import { recursoDe } from "./recursos";
import { origenDePieza } from "./origen";
import { bloqueoCamuflajeIntegrado, subsistemaIntegrado } from "./integracionTactica";
import { MAX_NOTA_ESTADO, MAX_VALOR_ESTADO } from "./estadosFicha";
import { equipoPorId } from "../catalog/equipo";
import { PELEA } from "../catalog/armasMelee";
import {
  ESTADO_ARMA_ESCONDIDA_ID,
  ESTADO_CAMUFLAJE_ID,
  ESTADO_SIGILO_ID,
  estadoPorId,
} from "../catalog/estados";

// --- Sentidos y ocultación de una pieza -------------------------------------------------------

export const SENTIDOS = ["visual", "termica", "acustica"] as const;
export type Sentido = (typeof SENTIDOS)[number];
export const ETIQUETA_SENTIDO: Record<Sentido, string> = { visual: "visual", termica: "térmica", acustica: "acústica" };
export type CoberturaSentidos = Partial<Record<Sentido, number>>;

// Un modo activo de ocultación (estático, dinámico) con su duración y su cobertura por sentido;
// `pasiva`, la que da la pieza sin activarla mientras le quede carga.
export type ModoOcultacion = { id: string; etiqueta: string; turnos: number; duracion: string; cobertura: CoberturaSentidos };
export type Ocultacion = { modos: ModoOcultacion[]; pasiva?: CoberturaSentidos };

// La ocultación que lleva la ficha ahora: la pieza (la primera equipada con `ocultacion`), el modo
// activo si el estado Camuflaje está puesto y la pasiva si la pieza tiene carga.
export type OcultacionDeFicha = {
  fuente: string;
  nivel: number;
  activo: ModoOcultacion | null;
  pasiva: CoberturaSentidos | null;
};

// E5b: sin pieza propia, el Camuflaje Trifásico integrado en el Chasis Osteomuscular (con su nivel y
// sin batería: la pasiva vale siempre), salvo que una armadura más pesada lo bloquee.
// TODO(revisar) (S111): la pasiva del integrado sin carga que mirar («mientras mantenga una carga
// mínima») se toma como siempre activa: se alimenta del cuerpo.
function ocultacionDePieza(sheet: Sheet): { fuente: string; nivel: number; instanciaId: string; datos: Ocultacion } | null {
  for (const pieza of sheet.equipo) {
    if (pieza.nivel === undefined) continue;
    const cat = equipoPorId(pieza.catalogoId);
    if (!cat || !("niveles" in cat)) continue;
    const datos = ultimoQueDefine(nivelesHasta(cat.niveles, pieza.nivel), "ocultacion")?.ocultacion;
    if (datos) return { fuente: cat.label, nivel: pieza.nivel, instanciaId: pieza.instanciaId, datos };
  }
  const integrado = subsistemaIntegrado(sheet, "camuflaje_trifasico");
  if (!integrado || bloqueoCamuflajeIntegrado(sheet)) return null;
  const datos = ocultacionDeNivel(integrado.catalogoId, integrado.nivel);
  return datos ? { fuente: `${integrado.label} integrado`, nivel: integrado.nivel, instanciaId: integrado.pieza.instanciaId, datos } : null;
}

// La ocultación de un nivel de una pieza del catálogo (la del nivel más alto hasta él que la trae).
export function ocultacionDeNivel(catalogoId: string, nivel: number): Ocultacion | null {
  const cat = equipoPorId(catalogoId);
  if (!cat || !("niveles" in cat)) return null;
  return ultimoQueDefine(nivelesHasta(cat.niveles, nivel), "ocultacion")?.ocultacion ?? null;
}

// Los modos activos de la pieza de ocultación de la ficha (para el selector de «Activar camuflaje»).
export function modosDeOcultacion(sheet: Sheet): ModoOcultacion[] {
  return ocultacionDePieza(sheet)?.datos.modos ?? [];
}

export function ocultacionDeFicha(sheet: Sheet, estados: readonly EstadoActivo[]): OcultacionDeFicha | null {
  const p = ocultacionDePieza(sheet);
  if (!p) return null;
  const puesto = estados.find((e) => e.estadoId === ESTADO_CAMUFLAJE_ID);
  const activo = puesto ? (p.datos.modos.find((m) => m.id === puesto.gradoId) ?? null) : null;
  // «Siempre que el sistema mantenga una carga mínima en espera»: sin recurso guardado, cuenta llena.
  const conCarga = (recursoDe(sheet, p.instanciaId)?.actual ?? 1) > 0;
  return { fuente: p.fuente, nivel: p.nivel, activo, pasiva: conCarga ? (p.datos.pasiva ?? null) : null };
}

// Lo que la ocultación suma a cada sentido. El modo activo sustituye a la pasiva en los sentidos
// que cubre; null si no suma nada.
// TODO(revisar): la fuente no dice si la pasiva se suma a la activa; se toma la activa sola.
export function coberturaPorSentido(o: OcultacionDeFicha | null): Record<Sentido, number> | null {
  if (!o) return null;
  const suma = Object.fromEntries(
    SENTIDOS.map((s) => [s, o.activo?.cobertura[s] ?? o.pasiva?.[s] ?? 0]),
  ) as Record<Sentido, number>;
  return SENTIDOS.some((s) => suma[s] > 0) ? suma : null;
}

// «14 · visual 17 · térmica 17 · acústica 18»: el número guardado y, por sentido, con lo que la
// ocultación suma encima. Sin ocultación, solo el número.
export function textoSigiloPorSentido(valor: number, o: OcultacionDeFicha | null): string {
  const c = coberturaPorSentido(o);
  if (!c) return `${valor}`;
  return [`${valor}`, ...SENTIDOS.map((s) => `${ETIQUETA_SENTIDO[s]} ${valor + c[s]}`)].join(" · ");
}

// --- Lo que una tirada o una acción deja como estado ------------------------------------------

// El total de la tirada pasa a ser el número del estado (la dificultad para detectarte). Tirar
// otra vez lo sustituye. `notaDe`: la condición de opción cuya elegida da la nota (qué arma).
export type EstadoAlTirar = { estadoId: string; turnos?: number; notaDe?: string };

// Una tirada cuyo total se guarda como número (Sigilo, Arma escondida, Disfrazado) no se tira
// contra dificultad: el número es tuyo y lo compara el máster. Sin ella, ni grado ni «fracaso».
export function seTiraSinDificultad(t: Pick<Accion, "estadoAlTirar">): boolean {
  return t.estadoAlTirar !== undefined;
}

export function estadoPorTirada(
  t: Pick<Accion, "estadoAlTirar" | "condiciones">,
  total: number,
  eleccion: string | null,
): EstadoActivo | null {
  const e = t.estadoAlTirar;
  if (!e || !estadoPorId(e.estadoId) || total <= 0) return null;
  const condicion = e.notaDe ? t.condiciones?.find((c) => c.id === e.notaDe) : undefined;
  const nota = condicion?.tipo === "opcion" ? condicion.opciones.find((o) => o.id === eleccion)?.etiqueta : undefined;
  return {
    estadoId: e.estadoId,
    gradoId: "activo",
    rondasRestantes: e.turnos ?? null,
    valor: Math.min(MAX_VALOR_ESTADO, total),
    ...(nota && { nota: nota.slice(0, MAX_NOTA_ESTADO) }),
  };
}

// Una acción sin dado que pone un estado según la opción elegida (Activar camuflaje: estático o
// dinámico, con la duración de su nivel) o siempre el mismo, `fijo` (el recordatorio «Bajo Ultra
// Estimulante» al usar la dosis, fa-03). `turnos` null: hasta quitarlo.
type GradoAlUsar = { gradoId: string; turnos: number | null };
export type EstadoAlUsar =
  | { estadoId: string; condicion: string; opciones: Record<string, GradoAlUsar> }
  | { estadoId: string; fijo: GradoAlUsar };

// La condición del modal cuya opción elige el grado (null en uno `fijo`).
export const condicionDeEstadoAlUsar = (e: EstadoAlUsar): string | null => ("condicion" in e ? e.condicion : null);

export function estadoPorUso(a: Pick<AccionDirecta, "estadoAlUsar">, opcion: string | null): EstadoActivo | null {
  const e = a.estadoAlUsar;
  const elegida = !e ? undefined : "fijo" in e ? e.fijo : opcion ? e.opciones[opcion] : undefined;
  if (!e || !elegida || !estadoPorId(e.estadoId)?.grados.some((g) => g.id === elegida.gradoId)) return null;
  return { estadoId: e.estadoId, gradoId: elegida.gradoId, rondasRestantes: elegida.turnos };
}

// «Sigilo 14.» / «Arma escondida (Mosquito): dificultad 12.»
export function textoEstadoPuesto(e: EstadoActivo): string {
  const estado = estadoPorId(e.estadoId);
  const nombre = `${estado?.label ?? e.estadoId}${e.nota ? ` (${e.nota})` : ""}`;
  if (e.valor === undefined) {
    const grado = estado && estado.grados.length > 1 ? estado.grados.find((g) => g.id === e.gradoId)?.label : undefined;
    return `Te pones ${nombre}${grado ? `, ${grado.toLowerCase()}` : ""}.`;
  }
  return `${nombre}: ${estado?.valor?.etiqueta ? `${estado.valor.etiqueta} ` : ""}${e.valor}.`;
}

// --- Atacar estando en Sigilo -----------------------------------------------------------------

// Lo que el ruido de un disparo resta a tu Sigilo (usuario, 2026-11-13: «−6 al disparar»).
export const RUIDO_DISPARO = 6;

// `ruido`: lo que resta el ruido del ataque (null: no hace ruido, el cuerpo a cuerpo). Un
// amortiguador fija ese ruido a su número (Silenciador: 2); con varios, vale el más bajo.
// `extras`: lo que delata al arma aparte del ruido (luminiscencia), que se suma.
// TODO(revisar): con más de un amortiguador, si se apilan o vale el mejor (hoy solo existe el
// Silenciador).
export type SigiloAlAtacar = {
  ruido: number | null;
  amortiguadores: { fuente: string; ruido: number }[];
  extras: { fuente: string; motivo: string; valor: number }[];
};

export type RestaDeSigilo = { total: number; partes: { texto: string; valor: number }[] };

export function restaDeSigilo(s: SigiloAlAtacar): RestaDeSigilo {
  const partes: RestaDeSigilo["partes"] = [];
  if (s.ruido !== null) {
    const amortiguador = s.amortiguadores.reduce<SigiloAlAtacar["amortiguadores"][number] | null>(
      (mejor, a) => (!mejor || a.ruido < mejor.ruido ? a : mejor),
      null,
    );
    const ruido = amortiguador ? Math.min(s.ruido, amortiguador.ruido) : s.ruido;
    if (ruido > 0) partes.push({ texto: amortiguador ? `ruido, con ${amortiguador.fuente}` : "ruido", valor: ruido });
  }
  for (const e of s.extras) if (e.valor > 0) partes.push({ texto: `${e.motivo} (${e.fuente})`, valor: e.valor });
  return { total: partes.reduce((t, p) => t + p.valor, 0), partes };
}

const textoPartes = (r: RestaDeSigilo) => r.partes.map((p) => `${p.valor} de ${p.texto}`).join(", ");

// Aviso en la propia tirada de ataque, solo si algo cambia el −6 de siempre (amortiguador o lo
// que delata al arma): «En sigilo, atacar te resta 8: 2 de ruido, con Silenciador, 6 de …».
export function textoSigiloAlAtacar(s: SigiloAlAtacar): string | null {
  if (s.amortiguadores.length === 0 && s.extras.length === 0) return null;
  const r = restaDeSigilo(s);
  return `En sigilo, atacar con esta arma te resta ${r.total}: ${textoPartes(r)}.`;
}

// Lo que pasa con tu Sigilo al atacar: el estado con el número rebajado o, a 0 o menos, fuera
// («Ya no estás en sigilo»). null si no estás en Sigilo o el ataque no resta nada.
export function sigiloTrasAtacar(
  estados: readonly EstadoActivo[],
  s: SigiloAlAtacar | undefined,
): { op: OperacionEstado; mensaje: string } | null {
  const puesto = estados.find((e) => e.estadoId === ESTADO_SIGILO_ID);
  if (!s || !puesto || puesto.valor === undefined) return null;
  const r = restaDeSigilo(s);
  if (r.total <= 0) return null;
  const nuevo = puesto.valor - r.total;
  const porque = `−${r.total}: ${textoPartes(r)}`;
  if (nuevo <= 0) return { op: { tipo: "quitar", estadoId: ESTADO_SIGILO_ID }, mensaje: `Ya no estás en sigilo (${porque}).` };
  return {
    op: { tipo: "poner", estado: { ...puesto, valor: nuevo } },
    mensaje: `Sigilo ${puesto.valor} → ${nuevo} (${porque}).`,
  };
}

// ¿Este ataque te tocaría el Sigilo? Para que la pantalla solo llame al servidor cuando toca.
export function atacarTocaSigilo(estados: readonly EstadoActivo[], t: Pick<Accion, "sigiloAlAtacar">): boolean {
  return sigiloTrasAtacar(estados, t.sigiloAlAtacar) !== null;
}

// --- Esconder arma ----------------------------------------------------------------------------

// «Esconder arma» (eq-30, eq-31): Reflejos + Sigilo con Juego de Manos (la fuente del 2026-11-14 pone
// «ocultar objetos pequeños en la ropa» en Juego de Manos; usuario, 2026-11-14), con un selector de tus armas
// de una mano (cada una con su bono para esconderla: Mosquito +2) y, con Compartimento Oculto,
// su casilla (+3; nivel 2, +4) y la opción de otro objeto. El total queda como «Arma escondida»
// con la dificultad y el arma en la nota. null sin nada que esconder.
// TODO(revisar): esconder otra arma sustituye a la anterior (un solo estado de cada).
export function accionEsconderArma(sheet: Sheet): Accion | null {
  const opciones: OpcionCondicion[] = [];
  let compartimento: CondicionTirada | null = null;
  for (const pieza of sheet.equipo) {
    const cat = equipoPorId(pieza.catalogoId);
    if (!cat) continue;
    // Sin escudos ni golpes a mano vacía (Puñetazo, Patada: PELEA), que no son algo que esconder.
    const escondible =
      cat.familia === "arma" || (cat.familia === "armaMelee" && !cat.defensa && !PELEA.some((p) => p.id === cat.id));
    if (escondible && cat.empleo === "una mano") {
      opciones.push({ id: pieza.instanciaId, etiqueta: cat.label, valor: cat.bonoEsconder ?? 0 });
      continue;
    }
    if (compartimento || pieza.nivel === undefined || !("niveles" in cat)) continue;
    const bono = ultimoQueDefine(nivelesHasta(cat.niveles, pieza.nivel), "bonoEsconder")?.bonoEsconder;
    if (bono === undefined) continue;
    compartimento = {
      id: ID_EN_COMPARTIMENTO,
      tipo: "toggle",
      etiqueta: `En el ${cat.label}`,
      valorActivo: bono,
      origen: origenDePieza("equipo", cat, pieza.instanciaId),
    };
  }
  if (compartimento) opciones.push({ id: "otro", etiqueta: "Otro objeto", valor: 0 });
  if (opciones.length === 0) return null;
  return {
    id: ID_ESCONDER_ARMA,
    label: "Esconder arma",
    grupo: "Acciones",
    aplicado: "reflejos",
    habilidad: "sigilo",
    especialidadesAccion: ["juego_de_manos"],
    nota: "El total queda como «Arma escondida»: la dificultad para descubrirla en un cacheo o un escáner",
    condiciones: [
      { id: ID_ARMA_A_ESCONDER, tipo: "opcion", etiqueta: "Qué escondes", opciones, porDefecto: opciones[0].id },
      ...(compartimento ? [compartimento] : []),
    ],
    estadoAlTirar: { estadoId: ESTADO_ARMA_ESCONDIDA_ID, notaDe: ID_ARMA_A_ESCONDER },
  };
}
