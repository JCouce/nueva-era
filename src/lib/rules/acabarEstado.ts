// El botón de un estado recordatorio (fa-03, usuario 2026-11-14). «Bajo Ultra Estimulante» y «Bajo
// Xovromium» no hacen nada por sí mismos; cuando el efecto se acaba, el jugador pulsa «Se acabó:
// aplicar el bajón» en el modal del estado y la app, en una sola acción (una entrada del registro,
// un Deshacer), le quita el recordatorio, le resta la fatiga y le pone el bajón. Qué pasa lo dice el
// catálogo (Estado.alAcabar); esto es el motor genérico. Lo aplica el servidor
// (aplicarConsecuenciaPropiaAction, tipo «acabar», con acabarEstadoDePersonaje).
//
// La fatiga, como la pestaña Vida y la fatiga de las consecuencias propias: con un combate en curso,
// a la foto que enseña la Mesa; si no, a la ficha. Sin pasar de 0: el bajón no se puede rechazar,
// así que con menos fatiga de la que cuesta se pierde la que quede (no se bloquea como al prolongar,
// que es opcional). Lo cobrado va en el `restado` del último cambio de la entrada: Deshacer lo
// devuelve junto con los estados (planDeshacerEstados).
import { estadoPorId } from "../catalog/estados";
import { estadoActivoCon, type EstadoActivo } from "./estados";
import {
  aplicarOperacionEstado,
  type CambioEstadoPersonaje,
  type FotoCombatiente,
  type FotoCombatienteNueva,
  type OperacionEstado,
} from "./vidaPorEstados";
import type { Sheet } from "./sheet";

export type FinDeEstado = { estadoId: string; fuente: string; fatiga: number; pone: EstadoActivo[] };

export function finDeEstado(
  estados: readonly EstadoActivo[],
  estadoId: string,
): ({ ok: true } & FinDeEstado) | { ok: false; error: string } {
  const cat = estadoPorId(estadoId);
  const regla = cat?.alAcabar;
  if (!cat || !regla) return { ok: false, error: "Ese estado no tiene nada que aplicar al acabarse." };
  if (!estados.some((e) => e.estadoId === estadoId)) return { ok: false, error: `Ya no llevas ${cat.label}.` };
  // Los bajones duran hasta quitarlos (la app no tiene reloj; su texto dice cuánto).
  const pone = regla.pone.flatMap((p) =>
    estadoPorId(p.estadoId)?.grados.some((g) => g.id === p.gradoId) ? [estadoActivoCon(p.estadoId, p.gradoId, { tipo: "hastaQuitarlo" })] : [],
  );
  return { ok: true, estadoId, fuente: cat.label, fatiga: regla.fatiga, pone };
}

export type FinAplicado = {
  estados: EstadoActivo[];
  sheet: Sheet;
  // Todas las fotos abiertas que se pasaron, con su máximo recalculado y el cobro en la de la Mesa.
  combatientes: FotoCombatienteNueva[];
  // Lo que guarda la entrada del registro: quitar el recordatorio y poner cada bajón.
  cambios: CambioEstadoPersonaje[];
  cobrado: number;
  // La fatiga en juego tras cobrar (la de la foto en combate).
  fatigaDespues: number;
};

// `fotos`: las del personaje en combates abiertos (como cambiarEstadosDePersonajes); `enMesa`: la
// del combate en curso que vale (fotoEnMesa), o null fuera de combate. null si ya no lleva el
// recordatorio.
export function aplicarFinDeEstado(
  personaje: { id: string; sheet: Sheet; estados: EstadoActivo[] },
  fin: FinDeEstado,
  fotos: FotoCombatiente[] = [],
  enMesa: string | null = null,
): FinAplicado | null {
  if (!personaje.estados.some((e) => e.estadoId === fin.estadoId)) return null;
  const ops: OperacionEstado[] = [{ tipo: "quitar", estadoId: fin.estadoId }, ...fin.pone.map((estado) => ({ tipo: "poner" as const, estado }))];
  let actual = personaje;
  let nuevas: FotoCombatienteNueva[] = [];
  const cambios: CambioEstadoPersonaje[] = [];
  for (const op of ops) {
    const fotosActuales = cambios.length === 0 ? fotos : nuevas;
    const r = aplicarOperacionEstado(actual, op, fotosActuales);
    if (!r) continue;
    actual = { ...actual, sheet: r.vida.sheet, estados: r.estados };
    nuevas = r.vida.combatientes;
    cambios.push(r.cambio);
  }
  const ultimo = cambios[cambios.length - 1];
  const foto = enMesa ? nuevas.find((c) => c.id === enMesa) : undefined;
  if (foto) {
    const cobrado = Math.min(fin.fatiga, Math.max(0, foto.fatigaActual));
    const fatigaDespues = foto.fatigaActual - cobrado;
    const ya = ultimo.combatientes.some((c) => c.id === foto.id);
    cambios[cambios.length - 1] = {
      ...ultimo,
      combatientes: ya
        ? ultimo.combatientes.map((c) => (c.id === foto.id ? { ...c, restado: { ...c.restado, fatiga: c.restado.fatiga + cobrado } } : c))
        : [...ultimo.combatientes, { id: foto.id, restado: { vida: 0, fatiga: cobrado } }],
    };
    return {
      estados: actual.estados,
      sheet: actual.sheet,
      combatientes: nuevas.map((c) => (c.id === foto.id ? { ...c, fatigaActual: fatigaDespues } : c)),
      cambios,
      cobrado,
      fatigaDespues,
    };
  }
  const cobrado = Math.min(fin.fatiga, Math.max(0, actual.sheet.fatigaActual));
  const fatigaDespues = actual.sheet.fatigaActual - cobrado;
  cambios[cambios.length - 1] = { ...ultimo, restado: { ...ultimo.restado, fatiga: ultimo.restado.fatiga + cobrado } };
  return {
    estados: actual.estados,
    sheet: cobrado > 0 ? { ...actual.sheet, fatigaActual: fatigaDespues } : actual.sheet,
    combatientes: nuevas,
    cambios,
    cobrado,
    fatigaDespues,
  };
}

// «Bajo Ultra Estimulante: se acabó. Pierdes 2 de fatiga y te pones Bajón del Ultra.»
export function textoFinDeEstado(fin: FinDeEstado, aplicado: Pick<FinAplicado, "cobrado" | "fatigaDespues">): string {
  const nombres = fin.pone.map((e) => estadoPorId(e.estadoId)?.label ?? e.estadoId);
  const partes = [
    aplicado.cobrado > 0 ? `pierdes ${aplicado.cobrado} de fatiga` : null,
    nombres.length > 0 ? `te pones ${nombres.join(" y ")}` : null,
  ].filter(Boolean);
  const falta = fin.fatiga - aplicado.cobrado;
  return [
    `${fin.fuente}: se acabó.`,
    partes.length > 0 ? `${partes.join(" y ").replace(/^./, (c) => c.toUpperCase())}.` : null,
    falta > 0 ? `No te quedaba fatiga para pagar ${falta} más.` : null,
    aplicado.cobrado > 0 && aplicado.fatigaDespues <= 0 ? "Te has quedado sin fatiga: quedas inconsciente." : null,
  ]
    .filter(Boolean)
    .join(" ");
}
