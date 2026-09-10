// Convierte las herramientas activas equipadas (Radar, Escáner Detector,
// Disfraz Holográfico) en su propia tirada — mismo patrón que combate.ts usa
// con las armas: una fila dinámica en vez de una entrada fija en TIRADAS.
//
// Diferencia con combate.ts: ahí una sola fórmula sirve para CUALQUIER arma
// de fuego (misma familia, mismo cálculo). Aquí no hay una fórmula común —
// cada herramienta tiene su propia mecánica, así que se distingue por id de
// catálogo, no por familia entera. La Valija Táctica de Fabricación no
// genera tirada propia: no trae ningún bono numérico limpio que mecanizar
// (ver catalog/herramientas.ts) — se usa la tirada fija "tecnica" tal cual.
import { equipoPorId } from "../catalog/equipo";
import type { Sheet } from "./sheet";
import type { Tirada } from "./tiradas";

// Qué acción describe cada una, para el label de la fila ("Escanear con
// Radar"). Los tres piden Perspicacia + Tecnociencia — pareja distinta de
// "Buscar/percibir" (Perspicacia + Exploración), así que no son un bono a
// esa tirada, son su propia acción.
const ETIQUETA_ACCION: Record<string, string> = {
  radar: "Escanear con",
  escaner_detector: "Usar",
  disfraz_holografico: "Activar",
};

export function tiradasDeHerramientas(sheet: Sheet): Tirada[] {
  const tiradas: Tirada[] = [];
  for (const pieza of sheet.equipo) {
    const cat = equipoPorId(pieza.catalogoId);
    if (cat?.familia !== "herramienta") continue;
    const etiqueta = ETIQUETA_ACCION[cat.id];
    if (!etiqueta) continue; // VTF, o cualquier herramienta futura sin tirada propia

    const nivelInfo = cat.niveles.find((n) => n.nivel === pieza.nivel);
    if (!nivelInfo?.notaTirada) continue;

    tiradas.push({
      id: `herramienta_${pieza.instanciaId}`,
      label: `${etiqueta} ${cat.label}`,
      grupo: "Herramientas",
      aplicado: "perspicacia",
      habilidad: "tecnociencia",
      nota: nivelInfo.notaTirada,
    });
  }
  return tiradas;
}
