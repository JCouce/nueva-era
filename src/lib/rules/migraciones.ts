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
