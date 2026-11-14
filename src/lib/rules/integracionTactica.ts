// Integración táctica del Chasis Osteomuscular (E5b del sync Drive 2026-11-14; docs/sistema.md §11.1
// y S111; decisión del usuario 2026-11-14): desde el nivel 2, un subsistema de las armaduras anclado
// en el cuerpo, a elegir entre el Proyector de Pulso y el Camuflaje Trifásico.
//
//   - La elección es la del nivel (`VarianteImplante.subsistemaIntegrado`), guardada en
//     PiezaEquipada.eleccion como el modelo del Brazo Biónico: sin campos nuevos en la ficha.
//   - Nivel del subsistema: el del Chasis (N2 → 2, N3 → 3, N4 → 4), sin pasar del máximo del catálogo.
//   - Mismas filas que el subsistema de la armadura (combate.ts), con una pieza «virtual»: el
//     catalogoId del subsistema y la instanciaId del implante. Cada uso o activación cuesta
//     FATIGA_INTEGRADO de fatiga en vez de cargas: sin célula, sin contador de disparos.
//   - El origen de todo es el implante: el Shock del cuerpo lo apaga o lo penaliza (habilitacionEnFicha,
//     conPiezasAfectadas), como a cualquier otra cosa del Chasis.
//   - No ocupa ranura de la armadura ni cuenta como subsistema suyo: no está instalado en ella.
// TODO(revisar) (S111): la fuente dice «de hasta nivel N»; la app le da siempre el nivel del Chasis
// (no se compra aparte ni se elige uno menor). Al subir de nivel se vuelve a elegir, como el Brazo.
import { equipoPorId } from "../catalog/equipo";
import type { SubsistemaIntegrable } from "../catalog/aumentos";
import { aumentoPorId, nivelDeImplante } from "./aumentos";
import type { PiezaEquipada } from "./equipo";
import { origenDePieza, type OrigenAporte } from "./origen";
import type { Sheet } from "./sheet";

export const FATIGA_INTEGRADO = 2;

export type SubsistemaIntegrado = {
  catalogoId: SubsistemaIntegrable;
  // «Proyector de Pulso»
  label: string;
  // El del subsistema: el del implante, topado en el máximo del catálogo.
  nivel: number;
  // «Chasis Osteomuscular 3»
  fuente: string;
  // La pieza con la que se generan sus filas: catalogoId del subsistema, instanciaId del implante.
  pieza: PiezaEquipada;
  // El implante.
  origen: OrigenAporte;
};

export function subsistemasIntegrados(sheet: Pick<Sheet, "equipo">): SubsistemaIntegrado[] {
  return sheet.equipo.flatMap((p): SubsistemaIntegrado[] => {
    const cat = aumentoPorId(p.catalogoId);
    if (cat?.familia !== "implante" || p.nivel === undefined) return [];
    const variante = nivelDeImplante(cat, p.nivel)?.variantes?.find((v) => v.id === p.eleccion);
    const id = variante?.subsistemaIntegrado;
    const sub = id ? equipoPorId(id) : null;
    if (!id || sub?.familia !== "subsistema") return [];
    const nivel = Math.min(p.nivel, Math.max(...sub.niveles.map((n) => n.nivel)));
    return [
      {
        catalogoId: id,
        label: sub.label,
        nivel,
        fuente: `${cat.label} ${p.nivel}`,
        pieza: { instanciaId: p.instanciaId, catalogoId: id, nivel },
        origen: origenDePieza("aumento", cat, p.instanciaId),
      },
    ];
  });
}

export const subsistemaIntegrado = (sheet: Pick<Sheet, "equipo">, catalogoId: SubsistemaIntegrable): SubsistemaIntegrado | null =>
  subsistemasIntegrados(sheet).find((s) => s.catalogoId === catalogoId) ?? null;

// «Integrado en Chasis Osteomuscular 3: 2 de fatiga por uso, sin cargas.»
export const notaIntegrado = (s: SubsistemaIntegrado, uso: string) =>
  `Integrado en ${s.fuente} (nivel ${s.nivel}): ${uso} cuesta ${FATIGA_INTEGRADO} de fatiga, sin cargas.`;
