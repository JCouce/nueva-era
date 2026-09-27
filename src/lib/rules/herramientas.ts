// Convierte las herramientas activas equipadas (Radar, Escáner Detector,
// Disfraz Holográfico) en su propia tirada — mismo patrón que combate.ts usa
// con las armas: una fila dinámica en vez de una entrada fija en ACCIONES.
//
// Diferencia con combate.ts: ahí una sola fórmula sirve para CUALQUIER arma
// de fuego (misma familia, mismo cálculo). Aquí no hay una fórmula común —
// cada herramienta tiene su propia mecánica, así que se distingue por id de
// catálogo, no por familia entera. La Valija Táctica de Fabricación no
// genera tirada propia: su uso real es la acción sin dado "Reparar y
// Fabricar" (ReparaFabricaModal.tsx, docs/tareas.md tarea 8), no una tirada.
import { equipoPorId, type Equipo, type Herramienta } from "../catalog/equipo";
import type { PiezaEquipada } from "./equipo";
import type { Sheet } from "./sheet";
import type { Accion, AccionDirecta } from "./acciones";

// Qué acción describe cada una, para el label de la fila ("Escanear con
// Radar"). Los tres piden Perspicacia + Tecnociencia — pareja distinta de
// "Buscar/percibir" (Perspicacia + Exploración), así que no son un bono a
// esa tirada, son su propia acción.
const ETIQUETA_ACCION: Record<string, string> = {
  radar: "Escanear con",
  escaner_detector: "Usar",
  disfraz_holografico: "Activar",
};

// Generador por pieza, mismo patrón que REGISTRO_DE_ATAQUE en combate.ts
// (T5, docs/motor.md §Escalabilidad) — aquí no hace falta un registro por
// familia porque solo hay una familia ("herramienta"), y encima no hay una
// fórmula común entre sus piezas: cada una se distingue por su propio id de
// catálogo, no por la familia entera (VTF no genera tirada propia).
function tiradaDeHerramienta(pieza: PiezaEquipada, cat: Herramienta): Accion | null {
  const etiqueta = ETIQUETA_ACCION[cat.id];
  if (!etiqueta) return null; // VTF, o cualquier herramienta futura sin tirada propia

  const nivelInfo = cat.niveles.find((n) => n.nivel === pieza.nivel);
  if (!nivelInfo?.notaTirada) return null;

  return {
    id: `herramienta_${pieza.instanciaId}`,
    label: `${etiqueta} ${cat.label}`,
    grupo: "Herramientas",
    aplicado: "perspicacia",
    habilidad: "tecnociencia",
    nota: nivelInfo.notaTirada,
  };
}

export function accionesDeHerramientas(sheet: Sheet): Accion[] {
  const tiradas: Accion[] = [];
  for (const pieza of sheet.equipo) {
    const cat: Equipo | null = equipoPorId(pieza.catalogoId);
    if (cat?.familia !== "herramienta") continue;
    const tirada = tiradaDeHerramienta(pieza, cat);
    if (tirada) tiradas.push(tirada);
  }
  return tiradas;
}

// Primer caso real de "acción sin dado" generada por equipo (docs/motor.md,
// docs/tareas.md ítem 4): Radar nivel 4 desbloquea "Marcar objetivo" — S9
// (nivelesHasta se queda corto aquí a propósito: no hay nada que acumular de
// niveles 1-3, es una capacidad nueva que nace en el 4) — sin estado que
// rastrear, sin gasto, solo un texto fijo que el jugador aplica a mano en la
// siguiente tirada de ataque contra ese objetivo (decidido 2026-09-24, ver
// docs/checklist-motor-vs-prosa-2026-09-24.md). Si aparece una segunda pieza
// con acción sin dado propia, esto se generaliza a un lookup por catalogoId
// igual que ETIQUETA_ACCION arriba — un solo caso real no lo justifica todavía.
function accionDirectaDeHerramienta(pieza: PiezaEquipada, cat: Herramienta): AccionDirecta | null {
  if (cat.id === "radar" && (pieza.nivel ?? 0) >= 4) {
    return {
      id: `radar_marcar_${pieza.instanciaId}`,
      label: "Marcar objetivo",
      grupo: "Herramientas",
      nota:
        "Acción simple. Mientras el objetivo marcado siga en alcance y a la vista, sufre -1 a sus " +
        "defensas de cobertura y a sus bonificaciones de camuflaje — aplícalo a mano en la tirada " +
        "de ataque contra él.",
      confirmarLabel: "Marcar",
    };
  }
  return null;
}

export function accionesDirectasDeHerramientas(sheet: Sheet): AccionDirecta[] {
  const acciones: AccionDirecta[] = [];
  for (const pieza of sheet.equipo) {
    const cat: Equipo | null = equipoPorId(pieza.catalogoId);
    if (cat?.familia !== "herramienta") continue;
    const accion = accionDirectaDeHerramienta(pieza, cat);
    if (accion) acciones.push(accion);
  }
  return acciones;
}
