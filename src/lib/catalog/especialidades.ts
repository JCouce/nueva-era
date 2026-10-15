// Catálogo de especialidades por habilidad. Fuente: docs/fuente/habilidades.md (la línea
// "Especialidades:" de cada habilidad), docs/sistema.md §3. Lista cerrada: la ficha guarda
// ids (sheet.habilidades[x].especialidades) y una especialidad nueva es una fila más aquí.
//
// Ids estables, snake_case sin tildes: son los que guardan las fichas y los que citan los
// requisitos de dote (docs/modelado-dotes.json), así que no se renombran sin migración.
//
// Interpretación y Sigilo no traen lista en la fuente: no admiten especialidades (y se
// tiran con el valor entero, supuesto S39 de sistema.md; ver derivados.ts, valorEfectivo).
import type { HabilidadId } from "../rules/habilidades";

export const ESPECIALIDADES = [
  // Actitud
  { id: "empatia", label: "Empatía", habilidad: "actitud" },
  { id: "humor", label: "Humor", habilidad: "actitud" },
  { id: "intimidacion", label: "Intimidación", habilidad: "actitud" },
  { id: "liderazgo", label: "Liderazgo", habilidad: "actitud" },
  { id: "manipulacion", label: "Manipulación", habilidad: "actitud" },
  { id: "negociacion", label: "Negociación", habilidad: "actitud" },
  // Atletismo. La fuente lista "Salto" y luego describe Salto Horizontal y Vertical: una
  // sola especialidad.
  { id: "acrobacias", label: "Acrobacias", habilidad: "atletismo" },
  { id: "carrera", label: "Carrera", habilidad: "atletismo" },
  { id: "equilibrio", label: "Equilibrio", habilidad: "atletismo" },
  { id: "escalada", label: "Escalada", habilidad: "atletismo" },
  { id: "escapismo", label: "Escapismo", habilidad: "atletismo" },
  { id: "lanzamiento", label: "Lanzamiento", habilidad: "atletismo" },
  { id: "nado", label: "Nado", habilidad: "atletismo" },
  { id: "salto", label: "Salto", habilidad: "atletismo" },
  // Biociencia (Biónica es de aquí, no de Tecnociencia: sistema.md §10.6)
  { id: "bionica", label: "Biónica", habilidad: "biociencia" },
  { id: "bioquimica", label: "Bioquímica", habilidad: "biociencia" },
  { id: "biotecnologia", label: "Biotecnología", habilidad: "biociencia" },
  { id: "ingenieria_genetica", label: "Ingeniería Genética", habilidad: "biociencia" },
  { id: "medicina", label: "Medicina", habilidad: "biociencia" },
  // Combate Melee
  { id: "armas_cortas", label: "Armas Cortas", habilidad: "combate_melee" },
  { id: "armas_de_asta", label: "Armas de Asta", habilidad: "combate_melee" },
  { id: "escudos", label: "Escudos", habilidad: "combate_melee" },
  { id: "espadas_y_dagas", label: "Espadas y Dagas", habilidad: "combate_melee" },
  { id: "flagelos", label: "Flagelos", habilidad: "combate_melee" },
  { id: "pelea", label: "Pelea", habilidad: "combate_melee" },
  // Combate a Distancia. La fuente dice "Armas de Fuego Larga" (sic): la etiqueta va en
  // plural como su pareja "Cortas".
  { id: "armas_arrojadizas", label: "Armas Arrojadizas", habilidad: "combate_distancia" },
  { id: "armas_elasticas", label: "Armas Elásticas", habilidad: "combate_distancia" },
  { id: "armas_de_fuego_cortas", label: "Armas de Fuego Cortas", habilidad: "combate_distancia" },
  { id: "armas_de_fuego_largas", label: "Armas de Fuego Largas", habilidad: "combate_distancia" },
  { id: "armas_pesadas", label: "Armas Pesadas", habilidad: "combate_distancia" },
  // Cultura
  { id: "economia", label: "Economía", habilidad: "cultura" },
  { id: "historia", label: "Historia", habilidad: "cultura" },
  { id: "linguistica", label: "Lingüística", habilidad: "cultura" },
  { id: "sociedad", label: "Sociedad", habilidad: "cultura" },
  // Exploración (sustituye a la habilidad Supervivencia, que aquí es especialidad: C4/C12)
  { id: "investigacion", label: "Investigación", habilidad: "exploracion" },
  { id: "tactica", label: "Táctica", habilidad: "exploracion" },
  { id: "supervivencia", label: "Supervivencia", habilidad: "exploracion" },
  // Tecnociencia
  { id: "astrografia", label: "Astrografía", habilidad: "tecnociencia" },
  { id: "fisica", label: "Física", habilidad: "tecnociencia" },
  { id: "informatica", label: "Informática", habilidad: "tecnociencia" },
  { id: "mecanica", label: "Mecánica", habilidad: "tecnociencia" },
  { id: "quimica", label: "Química", habilidad: "tecnociencia" },
] as const satisfies readonly { id: string; label: string; habilidad: HabilidadId }[];

export type Especialidad = (typeof ESPECIALIDADES)[number];
export type EspecialidadId = Especialidad["id"];

export const ESPECIALIDAD_IDS = ESPECIALIDADES.map((e) => e.id) as unknown as [EspecialidadId, ...EspecialidadId[]];

const POR_ID = new Map<string, Especialidad>(ESPECIALIDADES.map((e) => [e.id, e]));

export function especialidadPorId(id: string): Especialidad | undefined {
  return POR_ID.get(id);
}

export function especialidadesDe(habilidad: HabilidadId): readonly Especialidad[] {
  return ESPECIALIDADES.filter((e) => e.habilidad === habilidad);
}

// Habilidad sin lista en la fuente (Interpretación, Sigilo): no admite especialidades.
export function admiteEspecialidades(habilidad: HabilidadId): boolean {
  return ESPECIALIDADES.some((e) => e.habilidad === habilidad);
}

export function esEspecialidadDe(habilidad: HabilidadId, id: string): id is EspecialidadId {
  return especialidadPorId(id)?.habilidad === habilidad;
}

export function etiquetaEspecialidad(id: string): string {
  return especialidadPorId(id)?.label ?? id;
}

// Las especialidades "de arma" (Crítico Mejorado, docs/dotes.md): todas las de Combate
// Melee y Combate a Distancia. Pelea cuenta (arma desarmada) y Escudos también (golpean):
// confirmado por el usuario (S43).
export const ESPECIALIDADES_ARMA: readonly Especialidad[] = ESPECIALIDADES.filter(
  (e) => e.habilidad === "combate_melee" || e.habilidad === "combate_distancia",
);

// Para casar texto escrito a mano con el catálogo (migración de fichas de texto libre):
// minúsculas, sin tildes, espacios/"_"/"-" iguales y sin la "s" final de cada palabra,
// para que "Armas de Fuego Larga" y "Escudo" casen con su especialidad.
export function claveNombreEspecialidad(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((w) => (w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w))
    .join("_");
}

// La especialidad de esa habilidad cuyo nombre (o id) casa con el texto, o undefined.
export function especialidadPorNombre(habilidad: HabilidadId, texto: string): Especialidad | undefined {
  const clave = claveNombreEspecialidad(texto);
  if (!clave) return undefined;
  return especialidadesDe(habilidad).find(
    (e) => claveNombreEspecialidad(e.label) === clave || claveNombreEspecialidad(e.id) === clave,
  );
}
