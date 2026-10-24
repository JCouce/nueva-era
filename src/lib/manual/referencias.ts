import { EQUIPO, type Equipo } from "../catalog/equipo";
import { DOTES } from "../catalog/dotes";
import { ESPECIES } from "../catalog/especies";
import { DISCIPLINAS } from "../catalog/psionica";
import { FARMACOS } from "../catalog/medicina";
import { MATERIALES } from "../catalog/herramientas";
import { MUNICION_ESPECIAL } from "../catalog/municion";
import { PREFIJO_MEJORA_MUNICION } from "../catalog/mejorasArma";
import { HABILIDADES } from "../rules/habilidades";
import { slugificar } from "./encabezados";

// Elemento del catálogo → apartado del manual (documento + ancla). Se resuelve solo,
// por nombre, contra los encabezados y las filas de tabla de los documentos de su
// familia; lo que no casa solo (o casa mal) va en EXCEPCIONES. Un elemento sin
// referencia no es un error: la ficha simplemente no enseña el botón.

// Sin especialidades: en Habilidades son viñetas dentro de su habilidad, no apartados,
// y la ficha no tiene vista de detalle para ellas.
export type TipoElemento = "equipo" | "dote" | "especie" | "disciplina" | "habilidad";

// Compuesta porque los ids no tienen por qué ser únicos entre catálogos:
// `equipo:pistola_mosquito`, `dote:dote_burla`…
export type ClaveManual = `${TipoElemento}:${string}`;

export const claveManual = (tipo: TipoElemento, id: string): ClaveManual => `${tipo}:${id}`;

export type Referencia = { slug: string; ancla: string; titulo: string };

export type ElementoManual = { clave: ClaveManual; label: string; documentos: string[] };

// Lo mínimo de un documento que hace falta para casar (AnclasDocumento lo cumple).
export type AnclasParaCasar = {
  encabezados: readonly { id: string; texto: string }[];
  filas: readonly { id: string; base: string; titulo: string }[];
};

const DOCUMENTO_AUMENTOS = new Set<Equipo["familia"]>(["operacionGenetica", "implante"]);

// "Adaptador: munición perforante" es nombre nuestro; en el manual se busca la munición.
function nombreEnElManual(e: Equipo): string {
  if (!e.id.startsWith(PREFIJO_MEJORA_MUNICION)) return e.label;
  const municion = MUNICION_ESPECIAL.find((m) => `${PREFIJO_MEJORA_MUNICION}${m.id}` === e.id);
  return municion?.label ?? e.label;
}

export function elementosDelCatalogo(): ElementoManual[] {
  const de = (tipo: TipoElemento, documentos: string[]) => (e: { id: string; label: string }) => ({
    clave: claveManual(tipo, e.id),
    label: e.label,
    documentos,
  });
  return [
    ...EQUIPO.map((e) =>
      de("equipo", [DOCUMENTO_AUMENTOS.has(e.familia) ? "aumentos" : "equipamiento"])({
        id: e.id,
        label: nombreEnElManual(e),
      }),
    ),
    ...DOTES.map(de("dote", ["dotes"])),
    ...ESPECIES.map(de("especie", ["especies"])),
    ...DISCIPLINAS.map(de("disciplina", ["psionica"])),
    ...HABILIDADES.map(de("habilidad", ["habilidades"])),
  ];
}

// `null`: casa solo pero mal, y en el manual no hay sitio correcto al que llevarlo.
export type Excepcion = { documento: string; ancla: string } | null;

const en = (documento: string, ancla: string): Excepcion => ({ documento, ancla });

// Fármacos y materiales no tienen apartado propio (son párrafos sueltos o filas sin
// nombre): van al apartado que los agrupa.
const alGrupo = (ids: readonly { id: string }[], documento: string, ancla: string) =>
  Object.fromEntries(ids.map((e) => [claveManual("equipo", e.id), en(documento, ancla)]));

// Buscadas a mano en docs/fuente/. Un test comprueba que cada ancla existe: si un sync
// renombra un apartado, falla y se corrige aquí.
export const EXCEPCIONES: Readonly<Partial<Record<ClaveManual, Excepcion>>> = {
  // La tabla los llama Plasma SC y Plasma SA; la prosa, Plasma SG y Plasma AR.
  "equipo:escopeta_plasma_sc": en("equipamiento", "plasma-sc"),
  "equipo:fusil_asalto_plasma_sa": en("equipamiento", "plasma-sa"),
  // Erratas o grafías distintas en la fuente.
  "equipo:inyector_hipodermico": en("equipamiento", "inyecctor-hipodermico-nivel-1-2"),
  "equipo:lanzagranadas_integrado": en("equipamiento", "lanza-granadas-integrado"),
  "equipo:lanzacohetes_rt": en("equipamiento", "lanza-cohetes-rt"),
  "equipo:lanzamisiles_at": en("equipamiento", "lanza-misiles-at"),
  "especie:arkoru": en("especies", "arkor"),
  "disciplina:hipercognicion": en("psionica", "hipercongnicion"),
  // "Escudo" casaría por prefijo con "Escudo Deflector": es la fila de la tabla de escudos.
  "equipo:escudo_estandar": en("equipamiento", "escudo"),
  // TODO(revisar): el encabezado "Valija Táctica de Fabricación (VTF)" no sale como
  // encabezado (pandoc lo pega a "Herramientas y Accesorios"); su texto cuelga de ahí.
  "equipo:valija_tactica_fabricacion": en("equipamiento", "herramientas-y-accesorios"),
  // Armas de Kerzul: filas de su tabla, que las nombra sin "de Kerzul" (y por eso las
  // que repiten nombre de un arma básica llevan sufijo).
  "equipo:kerzul_punal": en("equipamiento", "punal"),
  "equipo:kerzul_espada_hacha_pico": en("equipamiento", "espada-hacha-o-pico-de-guerra"),
  "equipo:kerzul_espadon_hacha_armas": en("equipamiento", "espadon-o-hacha-de-armas"),
  "equipo:kerzul_maza": en("equipamiento", "maza"),
  "equipo:kerzul_baston_combate": en("equipamiento", "baston-de-combate-2"),
  "equipo:kerzul_lanza_corta": en("equipamiento", "lanza-corta-2"),
  "equipo:kerzul_lanza_larga": en("equipamiento", "lanza-larga-2"),
  "equipo:kerzul_martillo_enastado": en("equipamiento", "martillo-enastado-2"),
  "equipo:kerzul_alabarda": en("equipamiento", "alabarda-2"),
  ...alGrupo(FARMACOS, "equipamiento", "farmacos"),
  ...alGrupo(MATERIALES, "equipamiento", "materiales"),
};

// Orden de casado, primero en orden de documento dentro de cada paso:
// 1. encabezado con el id exacto del nombre ("Hipercognición" → `hipercognicion`);
// 2. encabezado que empieza por él ("Burla" → `burla-coste-2`);
// 3. fila de tabla cuya primera celda es el nombre ("Mosquito" → fila `mosquito`).
export function casar(label: string, doc: AnclasParaCasar): { ancla: string; titulo: string } | null {
  const slug = slugificar(label);
  const exacto = doc.encabezados.find((e) => e.id === slug);
  if (exacto) return { ancla: exacto.id, titulo: exacto.texto };
  const prefijo = doc.encabezados.find((e) => e.id.startsWith(`${slug}-`));
  if (prefijo) return { ancla: prefijo.id, titulo: prefijo.texto };
  const fila = doc.filas.find((f) => f.base === slug);
  if (fila) return { ancla: fila.id, titulo: fila.titulo };
  return null;
}

export function tituloDeAncla(doc: AnclasParaCasar, ancla: string): string | null {
  return (
    doc.encabezados.find((e) => e.id === ancla)?.texto ??
    doc.filas.find((f) => f.id === ancla)?.titulo ??
    null
  );
}

export function resolverReferencias(
  elementos: readonly ElementoManual[],
  documentos: ReadonlyMap<string, AnclasParaCasar>,
  excepciones: Readonly<Partial<Record<ClaveManual, Excepcion>>> = EXCEPCIONES,
): Map<ClaveManual, Referencia> {
  const salida = new Map<ClaveManual, Referencia>();
  for (const el of elementos) {
    if (el.clave in excepciones) {
      const ex = excepciones[el.clave];
      const doc = ex ? documentos.get(ex.documento) : undefined;
      const titulo = ex && doc ? tituloDeAncla(doc, ex.ancla) : null;
      if (ex && titulo !== null) salida.set(el.clave, { slug: ex.documento, ancla: ex.ancla, titulo });
      continue;
    }
    for (const slug of el.documentos) {
      const doc = documentos.get(slug);
      const casado = doc ? casar(el.label, doc) : null;
      if (casado) {
        salida.set(el.clave, { slug, ...casado });
        break;
      }
    }
  }
  return salida;
}
