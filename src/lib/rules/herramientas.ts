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
import { equipoPorId, RAREZA_ORDEN, type Equipo, type Herramienta, type Rareza } from "../catalog/equipo";
import { acumulaPorClave, dificultadFabricacion, nivelesHasta, nivelVtf, ultimoQueDefine, type PiezaEquipada } from "./equipo";
import type { Sheet } from "./sheet";
import type { Accion, AccionDirecta } from "./acciones";
import type { CondicionTirada } from "./condiciones";
import type { MaterialTier } from "./recursos";
import { origenDePieza } from "./origen";

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
// La fuente no nombra especialidad en ninguna: Tecnociencia (o la más alta de
// `habilidadesTirada`, Escáner 2) entera (docs/sistema.md §3).
function tiradaDeHerramienta(sheet: Sheet, pieza: PiezaEquipada, cat: Herramienta): Accion | null {
  const etiqueta = ETIQUETA_ACCION[cat.id];
  if (!etiqueta) return null; // VTF, o cualquier herramienta futura sin tirada propia

  const nivelInfo = cat.niveles.find((n) => n.nivel === pieza.nivel);
  if (!nivelInfo?.notaTirada) return null;
  // Dificultad del documento y variantes con la suya (S94): las condiciones sin alcance de los
  // niveles hasta el actual, acumuladas por id (el Radar 4 hereda la penetración del 3).
  const niveles = nivelesHasta(cat.niveles, nivelInfo.nivel);
  const dificultad = ultimoQueDefine(niveles, "dificultadTirada")?.dificultadTirada;
  const estadoAlTirar = ultimoQueDefine(niveles, "estadoAlTirar")?.estadoAlTirar;
  const condiciones = acumulaPorClave(
    niveles.map((n) => (n.condiciones ?? []).filter((c) => !c.alcance)),
    (c) => c.id,
  );

  return {
    id: `herramienta_${pieza.instanciaId}`,
    label: `${etiqueta} ${cat.label}`,
    grupo: "Herramientas",
    aplicado: "perspicacia",
    habilidad: (nivelInfo.habilidadesTirada ?? ["tecnociencia"]).reduce((mejor, h) =>
      sheet.habilidades[h].valor > sheet.habilidades[mejor].valor ? h : mejor,
    ),
    nota: nivelInfo.notaTirada,
    ...(dificultad !== undefined && { dificultadSugerida: dificultad }),
    ...(condiciones.length > 0 && { condiciones }),
    ...(estadoAlTirar && { estadoAlTirar }),
  };
}

export function accionesDeHerramientas(sheet: Sheet): Accion[] {
  const tiradas: Accion[] = [];
  for (const pieza of sheet.equipo) {
    const cat: Equipo | null = equipoPorId(pieza.catalogoId);
    if (cat?.familia !== "herramienta") continue;
    const tirada = tiradaDeHerramienta(sheet, pieza, cat);
    if (tirada) tiradas.push({ ...tirada, origen: origenDePieza("equipo", cat, pieza.instanciaId) });
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
    if (accion) acciones.push({ ...accion, origen: origenDePieza("equipo", cat, pieza.instanciaId) });
  }
  return acciones;
}

// Reparar (Reparar y Fabricar; docs/fuente/equipamiento.md, VTF, «Reparaciones»): Perspicacia + la
// habilidad técnica aplicable, con la dificultad de fabricar −4 (VTF 2+: Poco Habitual como
// Común). El material se elige antes de tirar, así que la tirada ya sabe con cuál se repara.
export const ID_CASILLA_MATERIALES_REPARAR = "reparar_materiales";

// El bono de los Materiales al reparar (di-32, usuario 2026-11-13): «con la valija», +2 con
// Sofisticados en objetos comunes y poco habituales; «con una multiherramienta», +4 con Avanzados
// en objetos de hasta rareza extraña. Casilla que solo sale si llevas la valija y el material y
// la rareza casan. TODO(revisar): la multiherramienta se lee como la propia VTF (su nivel 3 la
// llama así); no hay otra pieza con ese nombre en el catálogo.
const BONO_MATERIAL: Partial<Record<MaterialTier, { valor: number; hastaRareza: Rareza; etiqueta: string }>> = {
  sofisticados: { valor: 2, hastaRareza: "Poco Habitual", etiqueta: "Con la valija y Materiales Sofisticados" },
  avanzados: { valor: 4, hastaRareza: "Extraño", etiqueta: "Con la multiherramienta y Materiales Avanzados" },
};

function casillaMaterialReparar(sheet: Sheet, rareza: Rareza, tier: MaterialTier): CondicionTirada | null {
  const bono = BONO_MATERIAL[tier];
  const vtf = sheet.equipo.find((p) => p.catalogoId === "valija_tactica_fabricacion");
  const cat = vtf ? equipoPorId(vtf.catalogoId) : null;
  if (!bono || !vtf || !cat || RAREZA_ORDEN.indexOf(rareza) > RAREZA_ORDEN.indexOf(bono.hastaRareza)) return null;
  return {
    id: ID_CASILLA_MATERIALES_REPARAR,
    tipo: "toggle",
    etiqueta: bono.etiqueta,
    valorActivo: bono.valor,
    origen: origenDePieza("equipo", cat, vtf.instanciaId),
  };
}

export function tiradaDeReparar(
  sheet: Sheet,
  pieza: { instanciaId: string; titulo: string; rareza: Rareza | null },
  tier: MaterialTier,
): Accion {
  const rareza = pieza.rareza ?? "Común";
  const casilla = casillaMaterialReparar(sheet, rareza, tier);
  return {
    id: `reparar_${pieza.instanciaId}`,
    label: `Reparar: ${pieza.titulo}`,
    grupo: "Acciones",
    aplicado: "perspicacia",
    habilidad: "tecnociencia",
    nota:
      "Perspicacia + Tecnociencia, o la habilidad técnica aplicable. Dificultad 7 para lo común, " +
      "+2 por cada rango de rareza superior, -4 por ser reparación. El material se gasta salga " +
      "lo que salga.",
    dificultadSugerida: dificultadFabricacion(rareza, nivelVtf(sheet)) - 4,
    ...(casilla && { condiciones: [casilla] }),
  };
}
