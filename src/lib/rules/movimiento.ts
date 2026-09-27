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

function tiradaDeVolar(pieza: PiezaEquipada, cat: MejoraMovimiento): Accion | null {
  if (cat.id !== "movilidad_aerea") return null;
  const nivelInfo = cat.niveles.find((n) => n.nivel === pieza.nivel);
  if (!nivelInfo?.velocidadM) return null;

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
    nota: nivelInfo.notaTirada,
    recursoInstanciaId: pieza.instanciaId,
    condiciones,
    vuelo: { velocidadBase: nivelInfo.velocidadM, bonusCritico: nivelInfo.bonusCriticoM ?? 0 },
    ajustesFijos: nivelInfo.maniobrabilidad
      ? [{ valor: nivelInfo.maniobrabilidad, fuente: `Maniobrabilidad (${cat.label})` }]
      : [],
  };
}

export function accionesDeMovimiento(sheet: Sheet): Accion[] {
  const acciones: Accion[] = [];
  for (const pieza of sheet.equipo) {
    const cat: Equipo | null = equipoPorId(pieza.catalogoId);
    if (cat?.familia !== "movimiento") continue;
    const accion = tiradaDeVolar(pieza, cat);
    if (accion) acciones.push(accion);
  }
  return acciones;
}
