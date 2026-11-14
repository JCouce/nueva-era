// Convierte Propulsión Aérea (antes Movilidad Aérea; id interno `movilidad_aerea`) equipada en
// su propia tirada ("Volar") — mismo patrón que herramientas.ts. Máxima Potencia NO es una acción
// aparte: es la misma tirada de Volar jugada a lo grande (acción Compleja + 2 cargas en vez de
// Simple + 1) — vive como el toggle "maxima_potencia" dentro de `condiciones`, resuelto por
// resolverVuelo() (acciones.ts) a partir del margen ya calculado. No hay un segundo tipo "acción
// sin dado" para esto (ver docs/tareas.md, "Movilidad Aérea", decisión 2026-09-27).
//
// Foto de Drive 2026-11-14: las maniobras simples no tiran; las complejas, Reflejos + Pilotaje
// (Exoarmadura). Dos filas por pieza (usuario, 2026-11-14): «Volar» es la maniobra simple, una
// acción sin dado que gasta la carga (accionesDirectasDeMovimiento), y «Volar: maniobra compleja»
// es la tirada de siempre.
import { equipoPorId, type Equipo, type MejoraMovimiento } from "../catalog/equipo";
import type { PiezaEquipada } from "./equipo";
import type { Sheet } from "./sheet";
import type { Accion, AccionDirecta } from "./acciones";
import type { CondicionTirada } from "./condiciones";
import { origenDePieza } from "./origen";
import { recursoDe } from "./recursos";
import { velocidadConUmbrales, type MovimientoPorUmbral } from "./estados";
import { eleccionDePieza, nivelConEleccion } from "./eleccionNivel";
import type { CompensaManiobra } from "./dotesEfectos";

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
  const nota =
    [
      "Virajes cerrados, curvas pronunciadas, cambios de rasante o esquivar obstáculos; también una maniobra simple que el mal tiempo o un entorno confinado vuelven compleja.",
      nivelInfo.notaTirada,
      sinElegir,
      notaMedia,
    ]
      .filter(Boolean)
      .join(" ") || undefined;

  const condiciones: CondicionTirada[] = [
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
    label: "Volar: maniobra compleja",
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

// «Volar» con maniobra simple (línea recta, subir o bajar en vertical sin cambios bruscos): sin
// tirada, recorres la velocidad entera (el doble con Máxima Potencia). Gasta como la compleja: 1
// carga, 2 con Máxima Potencia (gastoDeDirecta).
function volarSinTirada(
  sheet: Sheet,
  pieza: PiezaEquipada,
  cat: MejoraMovimiento,
  umbrales: Pick<MovimientoPorUmbral, "mediaVelocidad">,
): AccionDirecta | null {
  if (cat.id !== "movilidad_aerea") return null;
  const nivelInfo = nivelConEleccion(pieza, cat);
  if (!nivelInfo?.velocidadM) return null;
  const velocidad = velocidadConUmbrales(nivelInfo.velocidadM, umbrales);
  const media =
    velocidad !== nivelInfo.velocidadM ? ` (media velocidad: ${umbrales.mediaVelocidad.join(" y ")})` : "";
  const recurso = recursoDe(sheet, pieza.instanciaId);
  const sinElegir = eleccionDePieza(pieza)?.aviso ?? null;
  return {
    id: `volar_simple_${pieza.instanciaId}`,
    label: "Volar",
    grupo: "Acciones",
    economia: "Simple",
    confirmarLabel: "Volar",
    nota:
      `Maniobra simple: línea recta, o subir o bajar en vertical sin cambios bruscos. Sin tirada: recorres ${velocidad} m${media}. ` +
      `Gasta 1 carga${recurso ? ` (quedan ${recurso.actual}/${recurso.max})` : ""}. Si la maniobra es compleja, «Volar: maniobra compleja».` +
      (sinElegir ? ` ${sinElegir}` : ""),
    condiciones: [
      {
        id: "maxima_potencia",
        tipo: "toggle",
        etiqueta: "Máxima Potencia (acción Compleja, 2 cargas)",
        valorActivo: 0,
        valorInactivo: 0,
        gastoActivo: 1,
        nota: `Dobla el desplazamiento: ${velocidad * 2} m.`,
      },
    ],
    gastoRecurso: { instanciaId: pieza.instanciaId, cantidad: 1 },
  };
}

// Esquiva en vuelo: con Pilotaje (Exoarmadura) en vez de Atletismo y la maniobrabilidad de la
// pieza (Murillo, 2026-10-26; foto de Drive 2026-11-14, antes Tecnociencia). Casilla "En vuelo"
// de la fila, como "Levitando" (la app no sabe si vuelas). Si la esquiva ya trae otra habilidad
// (Levitar), gana el vuelo: es la que cambia el número (S101). El crítico da una reacción para
// desplazarte una casilla, «al igual que la esquiva en tierra»: texto (el tablero no es de la app).
// `compensa` (FichaResuelta.compensaManiobraVuelo): Piloto y As de Exoarmadura anulan hasta 2 / 3
// de esa maniobrabilidad, nunca más de lo que resta (usuario, 2026-11-14).
export function conEsquivaEnVuelo(sheet: Sheet, t: Accion, compensa: CompensaManiobra | null = null): Accion {
  if (t.id !== "defensa") return t;
  for (const pieza of sheet.equipo) {
    const cat = equipoPorId(pieza.catalogoId);
    if (cat?.familia !== "movimiento" || cat.id !== "movilidad_aerea") continue;
    const valor = nivelConEleccion(pieza, cat)?.maniobrabilidad;
    if (valor === undefined) continue;
    const anula = compensa ? Math.min(compensa.valor, Math.max(0, -valor)) : 0;
    return {
      ...t,
      habilidadAlternativa: {
        habilidad: "pilotaje",
        especialidad: "exoarmadura",
        etiqueta: `En vuelo: Exoarmadura, ${String(valor + anula).replace("-", "−")}`,
        ajuste: { valor, fuente: `Maniobrabilidad (${cat.label})` },
        ...(compensa &&
          anula > 0 && {
            compensacion: { valor: anula, fuente: compensa.fuente, ...(compensa.origen && { origen: compensa.origen }) },
          }),
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

// Las acciones sin dado de movimiento: «Volar» con maniobra simple. Con los umbrales, como arriba.
export function accionesDirectasDeMovimiento(
  sheet: Sheet,
  umbrales: Pick<MovimientoPorUmbral, "mediaVelocidad"> = SIN_UMBRALES,
): AccionDirecta[] {
  const acciones: AccionDirecta[] = [];
  for (const pieza of sheet.equipo) {
    const cat: Equipo | null = equipoPorId(pieza.catalogoId);
    if (cat?.familia !== "movimiento") continue;
    const accion = volarSinTirada(sheet, pieza, cat, umbrales);
    if (accion) acciones.push({ ...accion, origen: origenDePieza("equipo", cat, pieza.instanciaId) });
  }
  return acciones;
}
