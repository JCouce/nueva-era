import type {
  DuracionEstado,
  EstadoActivoDescrito,
  InmuneAlAplicar,
  Inmunidad,
  RecursoMaster,
  RecursoVital,
  VitalDeObjetivo,
} from "@/lib/rules";

// Un objetivo del panel de mando: un jugador en la Mesa; en el combate (E1d) también
// un NPC de la cola, que solo admite estados (xp y créditos null).
export type ObjetivoMando = {
  id: string;
  nombre: string;
  tipo: "pj" | "npc";
  xp: number | null;
  creditos: number | null;
  estados: EstadoActivoDescrito[];
  // A7: estados a los que es inmune (Ojo Biónico 2-4, Regeneración), para marcarlo en la rejilla.
  inmunidades: Inmunidad[];
  // Lo que ajusta la pestaña Vida: la ficha en la Mesa (o la foto si está en un combate
  // en curso), la foto en el combate. `tope`: hasta dónde cura (VitalDeObjetivo).
  vida: VitalDeObjetivo;
  fatiga: VitalDeObjetivo;
};

// `inmunes` (A7, solo al aplicar un estado): a quién no se le puso por inmune.
export type ResultadoMando = { ok: true; registroId: string | null; inmunes?: InmuneAlAplicar[] } | { ok: false; error: string };

export type EstadoAAplicar = { estadoId: string; gradoId: string; duracion: DuracionEstado };

// Lo que hace el panel, inyectado por quien lo monta: la Mesa llama a las acciones de
// personaje; el combate (E1d) podrá mandar a los NPC por su propio camino.
export type AccionesMando = {
  // `forzar` (A7): "Aplicar igualmente" a los inmunes.
  aplicarEstado: (ids: string[], estado: EstadoAAplicar, forzar?: boolean) => Promise<ResultadoMando>;
  quitarEstado: (ids: string[], estadoId: string) => Promise<ResultadoMando>;
  darRecurso: (recurso: RecursoMaster, ids: string[], cantidad: number, motivo?: string) => Promise<ResultadoMando>;
  // `delta` con signo: negativo = daño.
  ajustarVida: (recurso: RecursoVital, ids: string[], delta: number) => Promise<ResultadoMando>;
};

// El aviso (toast) que sale tras cada acción, con "Deshacer" si dejó entrada.
export type AvisoMando = { id: number; mensaje: string; registroId: string | null; tono: "ok" | "aviso" };
