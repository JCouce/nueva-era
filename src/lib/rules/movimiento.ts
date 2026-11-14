// Convierte Propulsión Aérea (antes Movilidad Aérea; id interno `movilidad_aerea`) equipada en
// su propia tirada ("Volar") — mismo patrón que herramientas.ts. Máxima Potencia NO es una acción
// aparte: es la misma tirada de Volar jugada a lo grande (acción Compleja + 2 cargas en vez de
// Simple + 1) — vive como el toggle "maxima_potencia" dentro de `condiciones`, resuelto por
// resolverVuelo() (acciones.ts) a partir del margen ya calculado. No hay un segundo tipo "acción
// sin dado" para esto (ver docs/tareas.md, "Movilidad Aérea", decisión 2026-09-27).
//
// Foto de Drive 2026-11-14: las maniobras simples no tiran; las complejas, Reflejos + Pilotaje
// (Exoarmadura). Casilla «Maniobra compleja» en la misma fila: sin marcar, la tirada no cuenta y
// recorres la velocidad entera (resolverVuelo con `maniobraCompleja` false).
import { equipoPorId, type Equipo, type MejoraMovimiento } from "../catalog/equipo";
import type { PiezaEquipada } from "./equipo";
import type { Sheet } from "./sheet";
import type { Accion } from "./acciones";
import type { CondicionTirada } from "./condiciones";
import { origenDePieza } from "./origen";
import { velocidadConUmbrales, type MovimientoPorUmbral } from "./estados";
import { eleccionDePieza, nivelConEleccion } from "./eleccionNivel";

export const ID_MANIOBRA_COMPLEJA = "maniobra_compleja";

const SIN_UMBRALES: Pick<MovimientoPorUmbral, "mediaVelocidad"> = { mediaVelocidad: [] };

function tiradaDeVolar(
  pieza: PiezaEquipada,
  cat: MejoraMovimiento,
  umbrales: Pick<MovimientoPorUmbral, "mediaVelocidad">,
): Accion | null {
  if (cat.id !== "movilidad_aerea") return null;
  // Con la Progresión elegida (eq-36) ya puesta; sin elegir, la tabla y el aviso en la nota.
  const nivelInfo = nivelConEleccion(pieza, cat);
  if (!nivelInfo?.velocidadM) return null;
  const sinElegir = eleccionDePieza(pieza)?.aviso ?? null;
  // La media velocidad de Malherido/Exhausto (§7, S26), con la misma cuenta que el vuelo de
  // Personaje → Estado (FichaResuelta.vuelo): velocidadConUmbrales. La nota lo dice en la tirada.
  const velocidadBase = velocidadConUmbrales(nivelInfo.velocidadM, umbrales);
  const notaMedia =
    velocidadBase !== nivelInfo.velocidadM
      ? `Media velocidad (${umbrales.mediaVelocidad.join(" y ")}): ${velocidadBase} m en vez de ${nivelInfo.velocidadM} m.`
      : null;
  const nota = [nivelInfo.notaTirada, sinElegir, notaMedia].filter(Boolean).join(" ") || undefined;

  const condiciones: CondicionTirada[] = [
    {
      id: ID_MANIOBRA_COMPLEJA,
      tipo: "toggle",
      etiqueta: "Maniobra compleja",
      valorActivo: 0,
      valorInactivo: 0,
      nota:
        "Virajes cerrados, curvas pronunciadas, cambios de rasante o esquivar obstáculos; también una simple que el mal tiempo o un entorno confinado vuelven compleja. Sin marcar (línea recta, subir o bajar en vertical), no hace falta tirar.",
    },
    {
      id: "maxima_potencia",
      tipo: "toggle",
      etiqueta: "Máxima Potencia (acción Compleja, 2 cargas)",
      // No toca el modificador de la tirada — Máxima Potencia no cambia
      // Reflejos + Pilotaje, solo dobla el payout en metros (ver `vuelo`
      // más abajo y resolverVuelo()).
      valorActivo: 0,
      valorInactivo: 0,
      // 1 carga normal, 2 en Máxima Potencia (docs/prompt-gasto-recursos.md,
      // Fase 1) — "Volar" no tiene `ataque`, así que este toggle es la ÚNICA
      // fuente de gasto de gastoTotal() para esta tirada.
      gastoActivo: 2,
      gastoInactivo: 1,
      nota: `Dobla el desplazamiento; en crítico, +${nivelInfo.bonusCriticoM ?? 0} m adicionales.`,
    },
  ];

  return {
    id: `volar_${pieza.instanciaId}`,
    label: "Volar",
    grupo: "Acciones",
    aplicado: "reflejos",
    habilidad: "pilotaje",
    especialidadesAccion: ["exoarmadura"],
    nota,
    recursoInstanciaId: pieza.instanciaId,
    recursoUnidad: "cargas",
    condiciones,
    // TODO(revisar): S26 parte la velocidad, no dice nada del +N m del crítico de Máxima
    // Potencia; se deja entero.
    vuelo: { velocidadBase, bonusCritico: nivelInfo.bonusCriticoM ?? 0 },
    ajustesFijos: nivelInfo.maniobrabilidad
      ? [{ valor: nivelInfo.maniobrabilidad, fuente: `Maniobrabilidad (${cat.label})` }]
      : [],
  };
}

// Esquiva en vuelo: con Pilotaje (Exoarmadura) en vez de Atletismo y la maniobrabilidad de la
// pieza (Murillo, 2026-10-26; foto de Drive 2026-11-14, antes Tecnociencia). Casilla "En vuelo"
// de la fila, como "Levitando" (la app no sabe si vuelas). Si la esquiva ya trae otra habilidad
// (Levitar), gana el vuelo: es la que cambia el número (S101). El crítico da una reacción para
// desplazarte una casilla, «al igual que la esquiva en tierra»: texto (el tablero no es de la app).
export function conEsquivaEnVuelo(sheet: Sheet, t: Accion): Accion {
  if (t.id !== "defensa") return t;
  for (const pieza of sheet.equipo) {
    const cat = equipoPorId(pieza.catalogoId);
    if (cat?.familia !== "movimiento" || cat.id !== "movilidad_aerea") continue;
    const valor = nivelConEleccion(pieza, cat)?.maniobrabilidad;
    if (valor === undefined) continue;
    return {
      ...t,
      habilidadAlternativa: {
        habilidad: "pilotaje",
        especialidad: "exoarmadura",
        etiqueta: `En vuelo: Exoarmadura, ${String(valor).replace("-", "−")}`,
        ajuste: { valor, fuente: `Maniobrabilidad (${cat.label})` },
        efectoCritico: "En vuelo: puedes gastar una reacción para desplazarte una casilla.",
        origen: origenDePieza("equipo", cat, pieza.instanciaId),
      },
    };
  }
  return t;
}

// `umbrales`: lo que hacen los umbrales de §7 al movimiento (FichaResuelta.umbrales.movimiento);
// la ficha resuelta las expone ya con ellos (FichaResuelta.accionesMovimiento). Sin él, sin umbrales.
export function accionesDeMovimiento(sheet: Sheet, umbrales: Pick<MovimientoPorUmbral, "mediaVelocidad"> = SIN_UMBRALES): Accion[] {
  const acciones: Accion[] = [];
  for (const pieza of sheet.equipo) {
    const cat: Equipo | null = equipoPorId(pieza.catalogoId);
    if (cat?.familia !== "movimiento") continue;
    const accion = tiradaDeVolar(pieza, cat, umbrales);
    if (accion) acciones.push({ ...accion, origen: origenDePieza("equipo", cat, pieza.instanciaId) });
  }
  return acciones;
}
