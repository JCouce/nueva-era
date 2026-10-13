// La pestaña Personaje, sin UI (docs/tareas.md, "Pestaña Personaje"):
//
//   pasosPersonaje     Origen → Prioridades → Identidad → Estado, con su estado y
//                      lo que falta. La pasada 2 (envío a revisión) lee `falta`.
//   subPestanaInicial  dónde se abre la pestaña
//   etiquetaRasgo      CREACIÓN / SIEMPRE / TIRADA / TEXTO de un rasgo de especie
//   resumenRasgos      separa los atributos (chips) del resto de rasgos
//   identidadPorDefecto altura y peso por defecto: el punto medio del rango (§14.5)
import { ATRIBUTOS, type AtributoId } from "./atributos";
import { eleccionCompleta, eleccionDeFicha, faltaEnEleccion, type RangoReferencia } from "./especie";
import { repartoCompleto } from "./prioridad";
import type { Sheet } from "./sheet";
import type { MecanismoMotor } from "./motor";
import type { Rasgo } from "../catalog/especies";

export const PASOS_PERSONAJE = ["origen", "prioridades", "identidad", "estado"] as const;
export type PasoPersonajeId = (typeof PASOS_PERSONAJE)[number];

// "fijado": Origen en una ficha aprobada (no se puede cambiar, tampoco está pendiente).
// null: sin marca (Estado siempre; Identidad en una ficha aprobada, que sigue editable).
export type EstadoPaso = "hecho" | "pendiente" | "fijado" | null;

export type PasoPersonaje = {
  id: PasoPersonajeId;
  estado: EstadoPaso;
  // Qué falta para que el paso quede hecho, en el texto que se le enseña al jugador.
  // Vacío salvo con estado "pendiente".
  falta: string[];
};

export function pasosPersonaje({
  sheet,
  nombre,
  aprobada,
}: {
  sheet: Pick<Sheet, "especieId" | "especieOpciones" | "prioridades">;
  nombre: string;
  aprobada: boolean;
}): PasoPersonaje[] {
  const pendiente = (id: PasoPersonajeId, falta: string[]): PasoPersonaje =>
    falta.length ? { id, estado: "pendiente", falta } : { id, estado: "hecho", falta: [] };

  const eleccion = eleccionDeFicha(sheet);
  // Ojo: eleccionCompleta da por buena "sin especie" (se puede mandar), así que
  // manda faltaEnEleccion. Una especie desconocida: se pide elegir de nuevo.
  const faltaOrigen = faltaEnEleccion(eleccion) ?? (eleccionCompleta(eleccion) ? null : "Elige especie");
  const origen: PasoPersonaje = aprobada
    ? { id: "origen", estado: "fijado", falta: [] }
    : pendiente("origen", faltaOrigen ? [faltaOrigen] : []);

  // Identidad solo exige el nombre (decisión del usuario 2026-10-13: no ser exigentes).
  const identidad: PasoPersonaje = aprobada
    ? { id: "identidad", estado: null, falta: [] }
    : pendiente("identidad", nombre.trim() ? [] : ["Ponle nombre"]);

  const estado: PasoPersonaje = { id: "estado", estado: null, falta: [] };

  if (aprobada) return [origen, identidad, estado];
  const prioridades = pendiente(
    "prioridades",
    repartoCompleto(sheet.prioridades) ? [] : ["Reparte las 5 letras de prioridad"],
  );
  return [origen, prioridades, identidad, estado];
}

// Aprobada → Estado (en juego). En creación, el primer paso pendiente; con todo
// hecho, Identidad (lo único que se sigue retocando antes de enviar).
export function subPestanaInicial(pasos: PasoPersonaje[], aprobada: boolean): PasoPersonajeId {
  if (aprobada) return "estado";
  return pasos.find((p) => p.estado === "pendiente")?.id ?? "identidad";
}

// --- Rasgos de especie -------------------------------------------------------

export type EtiquetaRasgo = "creacion" | "siempre" | "tirada" | "texto";

const MECANISMOS_TIRADA: MecanismoMotor[] = ["eleccion_jugador", "ajuste_fijo", "bono_tramo"];
const MECANISMOS_SIEMPRE: MecanismoMotor[] = ["siempre_activo", "suma_derivado"];

// Lee la clasificación del catálogo (MotorMetadata), no la prosa: si un rasgo cambia
// de mecanismo, la etiqueta le sigue. Prioridad: creación > tirada > siempre > texto.
//
// TODO(revisar): quedan como TEXTO, por regla, rasgos cuya prosa sí habla de una
// tirada pero que el catálogo clasifica como nota_fija (Falla metabólica,
// Deslumbramiento, Tensión ósea, Tras esquivar) o como acción nueva (Peaje
// neurológico, Visión UV e Infrarroja). Metabolismo resistente sale TIRADA
// (ajuste_fijo sobre usar_farmaco) aunque no es una tirada propiamente. Ver
// personaje.test.ts.
export function etiquetaRasgo(rasgo: Pick<Rasgo, "creacion" | "motor">): EtiquetaRasgo {
  if (rasgo.creacion) return "creacion";
  const { motor } = rasgo;
  if (motor.some((m) => m.afecta.modo === "accion_existente" && m.mecanismo && MECANISMOS_TIRADA.includes(m.mecanismo)))
    return "tirada";
  // Numérico sin acción: fórmulas de derivados (movimiento, carga) y pasivos aún sin
  // dónde vivir (descanso, regeneración). Siempre activos, aunque no se apliquen todavía.
  if (
    motor.some(
      (m) => (m.mecanismo && MECANISMOS_SIEMPRE.includes(m.mecanismo)) || (m.tipo === "numerico" && m.afecta.modo === "ninguna"),
    )
  )
    return "siempre";
  return "texto";
}

// Un rasgo que solo trae modificadores de atributo (el helper `atributos` del
// catálogo) se pinta como chips, no como rasgo.
export function esRasgoDeAtributos(rasgo: Pick<Rasgo, "modificadores">): boolean {
  return !!rasgo.modificadores?.length && rasgo.modificadores.every((m) => m.tipo === "atributo");
}

export type ChipAtributo = { id: AtributoId; label: string; abbr: string; valor: number };
export type RasgoEtiquetado = Rasgo & { etiqueta: EtiquetaRasgo };

const atributo = (id: AtributoId) => {
  const { label, abbr } = ATRIBUTOS.find((a) => a.id === id)!;
  return { id, label, abbr };
};

export function resumenRasgos(rasgos: Rasgo[]): { atributos: ChipAtributo[]; rasgos: RasgoEtiquetado[] } {
  const atributos = rasgos.filter(esRasgoDeAtributos).flatMap((r) =>
    (r.modificadores ?? []).flatMap((m) =>
      m.tipo === "atributo" ? [{ ...atributo(m.id), valor: m.valor }] : [],
    ),
  );
  return {
    atributos,
    rasgos: rasgos.filter((r) => !esRasgoDeAtributos(r)).map((r) => ({ ...r, etiqueta: etiquetaRasgo(r) })),
  };
}

// --- Identidad -----------------------------------------------------------------

// Altura y peso por defecto (decisión del usuario 2026-10-13, sistema.md §14.5): el
// punto medio del rango de la especie. No se guarda: mientras sheet.altura/peso sean
// null la pantalla enseña esto, así sigue a la especie y a la Fuerza.
export function identidadPorDefecto(rango: RangoReferencia | null): { alturaCm: number | null; pesoKg: number | null } {
  if (!rango) return { alturaCm: null, pesoKg: null };
  const medio = ({ min, max }: { min: number; max: number }) => Math.round((min + max) / 2);
  return { alturaCm: medio(rango.alturaCm), pesoKg: medio(rango.pesoKg) };
}
