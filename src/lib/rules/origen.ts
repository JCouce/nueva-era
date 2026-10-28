// De qué ítem viene un aporte (docs/aportes/plan.md §1.1, §1.3 y fase 2): el dato que el
// generador ya conoce al crear el aporte, para que nadie tenga que reconstruirlo después con
// etiquetas. Sin imports a propósito: lo importan los módulos más bajos de la cadena.
//
//   tipo         la familia del ítem. "accion" = lo trae la propia tirada de catálogo (o
//                el arma que la genera, cuando es suya), no un ítem aparte; "estado" = lo
//                pone el máster o sale de la vida y la fatiga (estados derivados).
//   id           id de catálogo del ítem: pieza, aumento, dote, rasgo de especie, fármaco,
//                poder, estado. Las dotes con elección llevan la elección en el id
//                ("dote_bioma_predilecto:Selva densa"), como fuentesDeCapa1 (capa1.ts).
//   label        el nombre que se enseña ("Mira Telescópica", "Bioma Predilecto: Selva densa").
//   instanciaId  la pieza equipada concreta (PiezaEquipada.instanciaId), si la hay.
export type TipoOrigenAporte = "equipo" | "aumento" | "poder" | "dote" | "especie" | "farmaco" | "estado" | "accion";

export type OrigenAporte = {
  tipo: TipoOrigenAporte;
  id: string;
  label: string;
  instanciaId?: string;
};

// Clave estable de un ítem, para deduplicar aportes por ítem (aportesDeTirada).
export const claveOrigen = (o: OrigenAporte): string => `${o.tipo}:${o.id}:${o.instanciaId ?? ""}`;

// Una pieza equipada (equipo o aumento): el nombre del catálogo, sin nivel.
export const origenDePieza = (
  tipo: "equipo" | "aumento",
  cat: { id: string; label: string },
  instanciaId: string,
): OrigenAporte => ({ tipo, id: cat.id, label: cat.label, instanciaId });
