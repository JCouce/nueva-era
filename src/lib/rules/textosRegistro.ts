// Textos del centro de mando del máster (E1c): cómo se lee una entrada del registro
// ("Aturdido (Fracaso) a Kira y Tarsis · 1 ronda"), las duraciones y la hora relativa.
// Solo presentación: qué se guarda y cómo se deshace vive en registro.ts.
import { describirEstadosActivos, duracionDe, type DuracionEstado, type EstadoActivo } from "./estados";
import { listaLegible, type DatosRegistro } from "./registro";

const NUMERO = new Intl.NumberFormat("es-ES");
export const formatoNumero = (n: number) => NUMERO.format(n);

// "+50" / "−20" (signo menos tipográfico, como en la maqueta).
export const conSigno = (n: number) => `${n < 0 ? "−" : "+"}${formatoNumero(Math.abs(n))}`;

// El primer nombre: "Kira Vasq" → "Kira". El registro y los chips de objetivo lo usan.
export function nombreCorto(nombre: string): string {
  return nombre.trim().split(/\s+/)[0] || nombre;
}

export function etiquetaDuracion(d: DuracionEstado): string {
  switch (d.tipo) {
    case "rondas":
      return `${d.rondas} ${d.rondas === 1 ? "ronda" : "rondas"}`;
    case "escena":
      return "hasta fin de escena";
    case "hastaQuitarlo":
      return "hasta quitarlo";
  }
}

// Para los chips de estado: "2r", "escena"; null si dura hasta quitarlo.
export function etiquetaDuracionCorta(d: DuracionEstado): string | null {
  if (d.tipo === "rondas") return `${d.rondas}r`;
  return d.tipo === "escena" ? "escena" : null;
}

// "Aturdido (Fracaso)", o solo "Derribado" si el estado tiene un único grado.
export function etiquetaEstado(e: EstadoActivo): string {
  return describirEstadosActivos([e])[0].label;
}

export type PersonajeDeEntrada = { id: string; nombre: string | null };

const TIPO_LEGIBLE: Record<string, string> = {
  xp: "XP",
  creditos: "créditos",
  estado_poner: "estado",
  estado_quitar: "quitar estado",
  fin_escena: "fin de escena",
  limpiar_estados: "limpiar estados",
  vida: "vida",
};

// Un objetivo de la pestaña Vida en los textos: el NPC con su nombre entero ("Guardia
// corporativo"), el jugador con el corto, como en el resto del registro.
export const nombreDeObjetivo = (o: { nombre: string; npc: boolean }) => (o.npc ? o.nombre : nombreCorto(o.nombre));

// "−3 vida a Javi y Guardia corporativo", "+2 fatiga a Javi".
export function textoAjusteVida(recurso: "vida" | "fatiga", delta: number, objetivos: { nombre: string; npc: boolean }[]): string {
  return `${conSigno(delta)} ${recurso} a ${listaLegible(objetivos.map(nombreDeObjetivo))}`;
}

export function textoEntradaRegistro(
  tipo: string,
  datos: DatosRegistro | null,
  personajes: PersonajeDeEntrada[],
): string {
  const nombres = new Map(personajes.map((p) => [p.id, p.nombre === null ? "(borrado)" : nombreCorto(p.nombre)]));
  const nombre = (id: string) => nombres.get(id) ?? "(borrado)";
  const de = (ids: string[]) => listaLegible([...new Set(ids)].map(nombre));

  if (!datos) return `Acción de ${TIPO_LEGIBLE[tipo] ?? tipo} en un formato antiguo`;

  if (datos.tipo === "xp" || datos.tipo === "creditos") {
    const unidad = datos.tipo === "xp" ? "XP" : "créditos";
    const deltas = datos.cambios.map((c) => c.despues - c.antes);
    if (deltas.length > 0 && deltas.every((d) => d === deltas[0])) {
      return `${conSigno(deltas[0])} ${unidad} a ${de(datos.cambios.map((c) => c.characterId))}`;
    }
    // Entradas de antes de E1c, cuando quitar recortaba a 0 y cada uno movía distinto.
    const partes = datos.cambios.map((c) => `${nombre(c.characterId)} ${conSigno(c.despues - c.antes)}`);
    return `${unidad === "XP" ? "XP" : "Créditos"}: ${partes.join(", ")}`;
  }

  if (datos.tipo === "vida") return textoAjusteVida(datos.recurso, datos.delta, datos.cambios);

  if (datos.tipo === "fin_escena") {
    return `Fin de escena: limpiados los estados de ${de(datos.cambios.map((c) => c.characterId))}`;
  }
  if (datos.tipo === "limpiar_estados") {
    return `Estados limpiados: ${de(datos.cambios.map((c) => c.characterId))}`;
  }

  // Poner o quitar: se agrupa por lo que se puso (el mismo estado, grado y duración a
  // varios es una sola frase).
  const grupos = new Map<string, string[]>();
  for (const c of datos.cambios) {
    const estado = datos.tipo === "estado_poner" ? c.despues : c.antes;
    const clave = estado
      ? datos.tipo === "estado_poner"
        ? `${etiquetaEstado(estado)}${estado.forzado ? " forzado (inmune)" : ""} a {} · ${etiquetaDuracion(duracionDe(estado))}`
        : `Quitado ${etiquetaEstado(estado)} a {}`
      : `${datos.tipo === "estado_poner" ? "Puesto" : "Quitado"} ${c.estadoId} a {}`;
    grupos.set(clave, [...(grupos.get(clave) ?? []), c.characterId]);
  }
  return [...grupos].map(([plantilla, ids]) => plantilla.replace("{}", de(ids))).join("; ");
}

// "Ahora", "Hace 5 min", "Hace 2 h", "Hace 3 días".
export function haceCuanto(desdeMs: number, ahoraMs: number): string {
  const s = Math.max(0, Math.floor((ahoraMs - desdeMs) / 1000));
  if (s < 45) return "Ahora";
  const min = Math.max(1, Math.round(s / 60));
  if (min < 60) return `Hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Hace ${h} h`;
  const dias = Math.floor(h / 24);
  return `Hace ${dias} ${dias === 1 ? "día" : "días"}`;
}
