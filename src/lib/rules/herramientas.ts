// Convierte las herramientas activas equipadas (Radar, Escáner Detector,
// Disfraz Holográfico) en su propia tirada — mismo patrón que combate.ts usa
// con las armas: una fila dinámica en vez de una entrada fija en ACCIONES.
//
// Diferencia con combate.ts: ahí una sola fórmula sirve para CUALQUIER arma
// de fuego (misma familia, mismo cálculo). Aquí no hay una fórmula común —
// cada herramienta tiene su propia mecánica, así que se distingue por id de
// catálogo, no por familia entera. La Valija Táctica de Fabricación no
// genera tirada propia: no trae ningún bono numérico limpio que mecanizar
// (ver catalog/herramientas.ts) — se usa la tirada fija "tecnica" tal cual.
import { equipoPorId, type Equipo, type Herramienta } from "../catalog/equipo";
import type { PiezaEquipada } from "./equipo";
import type { Sheet } from "./sheet";
import type { Accion } from "./acciones";

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
