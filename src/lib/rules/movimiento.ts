// Convierte Movilidad Aérea equipada en su propia tirada ("Volar") — mismo
// patrón que herramientas.ts. Máxima Potencia NO es una acción aparte: es la
// misma tirada de Volar jugada a lo grande (acción Compleja + 2 cargas en
// vez de Simple + 1) — vive como el toggle "maxima_potencia" dentro de
// `condiciones`, resuelto por resolverVuelo() (acciones.ts) a partir del
// margen ya calculado. No hay un segundo tipo "acción sin dado" para esto
// (ver docs/tareas.md, "Movilidad Aérea", decisión 2026-09-27).
import { equipoPorId, type Equipo, type MejoraMovimiento } from "../catalog/equipo";
import type { PiezaEquipada } from "./equipo";
import type { Sheet } from "./sheet";
import type { Accion } from "./acciones";
import type { CondicionTirada } from "./condiciones";
import { origenDePieza } from "./origen";
import { velocidadConUmbrales, type MovimientoPorUmbral } from "./estados";

const SIN_UMBRALES: Pick<MovimientoPorUmbral, "mediaVelocidad"> = { mediaVelocidad: [] };

function tiradaDeVolar(
  pieza: PiezaEquipada,
  cat: MejoraMovimiento,
  umbrales: Pick<MovimientoPorUmbral, "mediaVelocidad">,
): Accion | null {
  if (cat.id !== "movilidad_aerea") return null;
  const nivelInfo = cat.niveles.find((n) => n.nivel === pieza.nivel);
  if (!nivelInfo?.velocidadM) return null;
  // La media velocidad de Malherido/Exhausto (§7, S26), con la misma cuenta que el vuelo de
  // Personaje → Estado (FichaResuelta.vuelo): velocidadConUmbrales. La nota lo dice en la tirada.
  const velocidadBase = velocidadConUmbrales(nivelInfo.velocidadM, umbrales);
  const notaMedia =
    velocidadBase !== nivelInfo.velocidadM
      ? `Media velocidad (${umbrales.mediaVelocidad.join(" y ")}): ${velocidadBase} m en vez de ${nivelInfo.velocidadM} m.`
      : null;
  const nota = [nivelInfo.notaTirada, notaMedia].filter(Boolean).join(" ") || undefined;

  const condiciones: CondicionTirada[] = [
    {
      id: "maxima_potencia",
      tipo: "toggle",
      etiqueta: "Máxima Potencia (acción Compleja, 2 cargas)",
      // No toca el modificador de la tirada — Máxima Potencia no cambia
      // Reflejos+Tecnociencia, solo dobla el payout en metros (ver `vuelo`
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
    habilidad: "tecnociencia",
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

// Esquiva en vuelo: con Tecnociencia en vez de Atletismo y la maniobrabilidad de la pieza
// (Murillo, 2026-10-26). Casilla "En vuelo" de la fila, como "Levitando" (la app no sabe si
// vuelas). Si la esquiva ya trae otra habilidad (Levitar), gana el vuelo: es la que cambia
// el número (S101).
export function conEsquivaEnVuelo(sheet: Sheet, t: Accion): Accion {
  if (t.id !== "defensa") return t;
  for (const pieza of sheet.equipo) {
    const cat = equipoPorId(pieza.catalogoId);
    if (cat?.familia !== "movimiento" || cat.id !== "movilidad_aerea") continue;
    const valor = cat.niveles.find((n) => n.nivel === pieza.nivel)?.maniobrabilidad;
    if (valor === undefined) continue;
    return {
      ...t,
      habilidadAlternativa: {
        habilidad: "tecnociencia",
        etiqueta: `En vuelo: Tecnociencia, ${String(valor).replace("-", "−")}`,
        ajuste: { valor, fuente: `Maniobrabilidad (${cat.label})` },
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
