// Migraciones de la ficha.
//
// `parseSheet` es tolerante: recorta lo que se sale de rango y descarta lo que
// no reconoce. Eso evita que una ficha vieja rompa la página, pero DESCARTAR EN
// SILENCIO NO ES MIGRAR: si un campo cambia de forma, el jugador pierde datos
// sin enterarse.
//
// Aquí se decide explícitamente qué pasa con cada cambio de formato. Al subir
// SCHEMA_VERSION hay que añadir una entrada y su test.
import { ESPECIES } from "../catalog/especies";
import { MUNICION_GRANADA } from "../catalog/municion";
import { FARMACOS } from "../catalog/medicina";
import { ESPECIALIDADES_ARMA, claveNombreEspecialidad, especialidadPorNombre } from "../catalog/especialidades";
import { HABILIDADES } from "./habilidades";

export type Migracion = {
  desde: number;
  hasta: number;
  descripcion: string;
  migrar: (ficha: Record<string, unknown>) => Record<string, unknown>;
};

// Normaliza para comparar nombres escritos a mano: sin acentos, sin mayúsculas.
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export const MIGRACIONES: Migracion[] = [
  {
    desde: 1,
    hasta: 2,
    descripcion:
      "La especie deja de ser texto libre y pasa a ser una del catálogo, porque ahora aporta modificadores",
    migrar: (ficha) => {
      const escrito = typeof ficha.especie === "string" ? ficha.especie : "";
      const encontrada = ESPECIES.find(
        (e) => normalizar(e.label) === normalizar(escrito),
      );
      const resto = { ...ficha };
      delete resto.especie; // el campo viejo se va: ya no significa nada
      return {
        ...resto,
        // Si lo que había escrito no coincide con ninguna especie conocida, se
        // queda sin asignar y el jugador la elige: es preferible a inventarse
        // una equivalencia y aplicarle modificadores que no le tocan.
        especieId: encontrada?.id ?? null,
      };
    },
  },
  {
    desde: 2,
    hasta: 3,
    descripcion: "Se añade el equipo instalado; las fichas antiguas empiezan sin nada equipado",
    migrar: (ficha) => ({ ...ficha, equipo: Array.isArray(ficha.equipo) ? ficha.equipo : [] }),
  },
  {
    desde: 3,
    hasta: 4,
    descripcion:
      "Creación por prioridad (HOJA2): se añaden las 5 letras de reparto, sin asignar, y " +
      "altura/peso vacíos. El pool de creación pasa a depender de la letra, así que una " +
      "ficha vieja no puede recalcular sola cuánto llevaba gastado — se queda sin letra " +
      "hasta que el jugador la elija.",
    migrar: (ficha) => ({
      ...ficha,
      prioridades: { atributos: null, habilidades: null, dotes: null, psionica: null, recursos: null },
      altura: null,
      peso: null,
    }),
  },
  {
    desde: 4,
    hasta: 5,
    descripcion:
      "Exploración sustituye a Supervivencia (conflictos C4/C12 de docs/sistema.md): " +
      "Supervivencia no se usaba en ninguna regla y Exploración la necesitaba para " +
      "desbloquear Iniciativa y Alerta. Se renombra la habilidad entera — lo que el " +
      "jugador tuviera comprado en Supervivencia pasa tal cual a Exploración, no se pierde.",
    migrar: (ficha) => {
      const habilidades = { ...(ficha.habilidades as Record<string, unknown> | undefined) };
      if ("supervivencia" in habilidades) {
        habilidades.exploracion = habilidades.supervivencia;
        delete habilidades.supervivencia;
      }
      return { ...ficha, habilidades };
    },
  },
  {
    desde: 5,
    hasta: 6,
    descripcion:
      "Se añade RECURSOS (cargas de batería/munición gastadas y recargadas en partida, " +
      "docs/tareas.md fase 6b); las fichas antiguas empiezan sin ninguno — se auto-puebla " +
      "solo la próxima vez que se equipe o desequipe algo (equipar()/desequipar() ya " +
      "reconcilian, ver lib/rules/recursos.ts).",
    migrar: (ficha) => ({ ...ficha, recursos: Array.isArray(ficha.recursos) ? ficha.recursos : [] }),
  },
  {
    desde: 6,
    hasta: 7,
    descripcion:
      "Se añade el pool de Materiales (Fabricar y Reparar, docs/tareas.md tarea 8): las " +
      "fichas antiguas empiezan a 0 en los 3 tiers. Quien tuviera Materiales equipados como " +
      "pieza suelta (el modelo viejo, un Consumible en sheet.equipo) los conserva ahí tal " +
      "cual — no hay forma de saber cuántas unidades representaba una sola pieza equipada, " +
      "así que no se convierte automáticamente al pool nuevo.",
    migrar: (ficha) => ({
      ...ficha,
      materiales: { sencillos: 0, sofisticados: 0, avanzados: 0 },
    }),
  },
  {
    desde: 7,
    hasta: 8,
    descripcion:
      "Las granadas dejan de ser una pieza equipada (una instancia por compra) y pasan a un " +
      "recurso con cantidad, igual que Materiales — pero aquí SÍ se convierte automáticamente: " +
      "a diferencia de Materiales (donde una pieza equipada no representaba un número de " +
      "unidades conocido), aquí cada instancia equipada de un tipo concreto es inequívocamente " +
      "1 unidad de esa granada. Se agrupan por catalogoId y se retiran de sheet.equipo.",
    migrar: (ficha) => {
      const equipo = Array.isArray(ficha.equipo) ? ficha.equipo : [];
      const idsGranada = new Set(MUNICION_GRANADA.map((g) => g.id));
      const granadas: Record<string, number> = {};
      const resto: unknown[] = [];
      for (const p of equipo) {
        const catalogoId = (p as { catalogoId?: unknown } | null)?.catalogoId;
        if (typeof catalogoId === "string" && idsGranada.has(catalogoId)) {
          granadas[catalogoId] = (granadas[catalogoId] ?? 0) + 1;
        } else {
          resto.push(p);
        }
      }
      return { ...ficha, equipo: resto, granadas };
    },
  },
  {
    desde: 8,
    hasta: 9,
    descripcion:
      "Vida y fatiga pasan de un número derivado y estático a un recurso persistente " +
      "(vidaActual/fatigaActual), pedido del usuario 2026-09-27: se guarda un centinela " +
      "(999) que parseSheet recorta de inmediato al máximo real de salud() — así una ficha " +
      "vieja arranca a tope sin duplicar aquí la fórmula de vida/fatiga.",
    migrar: (ficha) => ({ ...ficha, vidaActual: 999, fatigaActual: 999 }),
  },
  {
    desde: 9,
    hasta: 10,
    descripcion:
      "Los fármacos dejan de ser una pieza equipada (una instancia por compra) y pasan a un " +
      "recurso con cantidad, igual que las granadas en la v8: cada instancia equipada de un " +
      "fármaco concreto es inequívocamente 1 unidad de ese fármaco, así que se convierte " +
      "automáticamente. Se agrupan por catalogoId y se retiran de sheet.equipo.",
    migrar: (ficha) => {
      const equipo = Array.isArray(ficha.equipo) ? ficha.equipo : [];
      const idsFarmaco = new Set(FARMACOS.map((f) => f.id));
      const farmacos: Record<string, number> = {};
      const resto: unknown[] = [];
      for (const p of equipo) {
        const catalogoId = (p as { catalogoId?: unknown } | null)?.catalogoId;
        if (typeof catalogoId === "string" && idsFarmaco.has(catalogoId)) {
          farmacos[catalogoId] = (farmacos[catalogoId] ?? 0) + 1;
        } else {
          resto.push(p);
        }
      }
      return { ...ficha, equipo: resto, farmacos };
    },
  },
  {
    desde: 10,
    hasta: 11,
    descripcion:
      "Se añade el stock de munición especial (docs/tareas.md, 2026-09-28): las fichas " +
      "antiguas empiezan sin ninguna.",
    migrar: (ficha) => ({ ...ficha, municionEspecial: {} }),
  },
  {
    desde: 11,
    hasta: 12,
    descripcion:
      "Se añaden los niveles de disciplina psiónica (docs/sistema.md §10.6): las fichas " +
      "antiguas empiezan sin ninguna.",
    migrar: (ficha) => ({ ...ficha, psionica: {} }),
  },
  {
    desde: 12,
    hasta: 13,
    descripcion:
      "Se añade la fatiga temporal de Proeza (docs/sistema.md §10.6): las fichas antiguas " +
      "empiezan sin ninguna.",
    migrar: (ficha) => ({ ...ficha, fatigaTemporal: 0 }),
  },
  {
    desde: 13,
    hasta: 14,
    descripcion:
      "Se añaden las opciones de especie (casta y linaje, docs/sistema.md §14.1): las fichas " +
      "antiguas empiezan sin ninguna. Las especies provisionales conservan su id (humano, " +
      "arkoru); sus números pasan a ser los del documento real, sin migrar nada (§14.2).",
    migrar: (ficha) => ({ ...ficha, especieOpciones: {} }),
  },
  {
    desde: 14,
    hasta: 15,
    descripcion:
      "Las piezas equipadas admiten la marca `viaEspecie` (kerzul del Arköru sin tope de " +
      "rareza, docs/sistema.md §14.6). Es opcional: ninguna pieza existente la lleva, así " +
      "que no se mueve nada.",
    migrar: (ficha) => ({ ...ficha }),
  },
  {
    desde: 15,
    hasta: 16,
    descripcion:
      "Se añaden las dotes compradas (docs/sistema.md §9.1): las fichas antiguas empiezan " +
      "sin ninguna. Las ya aprobadas no reciben el pool de su letra: compran con XP (§9.4).",
    migrar: (ficha) => ({ ...ficha, dotes: [] }),
  },
  {
    desde: 16,
    hasta: 17,
    descripcion:
      "Las especialidades pasan de texto libre a ids del catálogo (catalog/especialidades.ts, " +
      "docs/sistema.md §3): cada texto se casa por nombre normalizado (sin tildes ni " +
      "mayúsculas, singular/plural) con una especialidad de ESA habilidad. Lo que no casa se " +
      "quita de la habilidad y se guarda en avisoEspecialidades para que el jugador elija la " +
      "buena. La elección de Crítico Mejorado (texto libre) se casa igual con una especialidad " +
      "de arma; si no casa, la dote se descarta y también queda en el aviso.",
    migrar: (ficha) => {
      const avisos: string[] = [];
      const rHabilidades = (ficha.habilidades ?? {}) as Record<string, unknown>;
      const habilidades: Record<string, unknown> = { ...rHabilidades };
      for (const h of HABILIDADES) {
        const entry = rHabilidades[h.id];
        if (!entry || typeof entry !== "object") continue;
        const textos = (entry as { especialidades?: unknown }).especialidades;
        if (!Array.isArray(textos)) continue;
        const ids: string[] = [];
        for (const t of textos) {
          if (typeof t !== "string" || !t.trim()) continue;
          const esp = especialidadPorNombre(h.id, t);
          if (esp) {
            if (!ids.includes(esp.id)) ids.push(esp.id);
          } else avisos.push(`${h.label}: ${t.trim()}`);
        }
        habilidades[h.id] = { ...(entry as object), especialidades: ids };
      }

      const dotes = Array.isArray(ficha.dotes)
        ? ficha.dotes.flatMap((d) => {
            const { id, eleccion } = (d ?? {}) as { id?: unknown; eleccion?: unknown };
            if (id !== "dote_critico_mejorado" || typeof eleccion !== "string") return [d];
            const clave = claveNombreEspecialidad(eleccion);
            const esp = ESPECIALIDADES_ARMA.find(
              (e) => claveNombreEspecialidad(e.label) === clave || claveNombreEspecialidad(e.id) === clave,
            );
            if (esp) return [{ ...(d as object), eleccion: esp.id }];
            avisos.push(`Crítico Mejorado: ${eleccion.trim()} (dote quitada)`);
            return [];
          })
        : ficha.dotes;

      return { ...ficha, habilidades, dotes, avisoEspecialidades: avisos };
    },
  },
  {
    desde: 17,
    hasta: 18,
    descripcion:
      "Aumentos (A0, docs/sistema.md §11.3): las piezas equipadas admiten `eleccion` (opcional, " +
      "ninguna existente la lleva) y se añade bolsaAumentosGastada a 0: hasta ahora la bolsa " +
      "del humano solo se enseñaba, nadie ha gastado nada de ella.",
    migrar: (ficha) => ({ ...ficha, bolsaAumentosGastada: 0 }),
  },
];

// Lleva una ficha cruda hasta la versión indicada aplicando los pasos que le
// falten. No valida ni normaliza: de eso se encarga `parseSheet` después.
export function migrar(
  raw: unknown,
  hasta: number,
): { ficha: Record<string, unknown>; aplicadas: string[] } {
  if (!raw || typeof raw !== "object") return { ficha: {}, aplicadas: [] };

  let ficha = { ...(raw as Record<string, unknown>) };
  // Una ficha sin número de versión es anterior al versionado: se trata como v1.
  let version = typeof ficha.schemaVersion === "number" ? ficha.schemaVersion : 1;
  const aplicadas: string[] = [];

  while (version < hasta) {
    const paso = MIGRACIONES.find((m) => m.desde === version);
    if (!paso) break; // no hay camino: `parseSheet` rellenará con los valores por defecto
    ficha = paso.migrar(ficha);
    version = paso.hasta;
    ficha.schemaVersion = version;
    aplicadas.push(paso.descripcion);
  }

  return { ficha, aplicadas };
}
