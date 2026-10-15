// Lo que las dotes ponen en las tiradas (docs/sistema.md §9.3, tanda D2a): casillas,
// bonos fijos y textos en tiradas que ya existen. Mismo patrón que la especie (E4,
// especie.ts): las casillas entran en el índice de condiciones, los bonos fijos como
// Modificador de tirada (origen "dote") y los textos en `textosTirada`; resolverFicha
// lo junta y conExtrasDeFicha / montarTirada lo pintan sin saber de dónde viene.
//
// Solo se construye lo que el catálogo marca `construido` en su MotorMetadata (el
// generador decide qué es eso, contra catalog/dotesDestinos.ts): un efecto pendiente de
// otra tanda no hace nada aquí aunque su destino exista.
//
// Tiradas generadas por arma (D2b-1): el alcance "familia:<f>" pasa a AlcanceModificador
// "familiaArma" (con el empleo si la dote filtra el arma), las casillas van al mismo índice
// y los textos con destino de familia. Un efecto con requisito por rama (Asesino…) solo sale
// si la ficha cumple el de su rama. Aparte, lo que no es casilla ni texto:
//   bonosTramo  bono por tramo de distancia (Tirador de Larga Distancia y su Avanzado, este
//               solo en especialidad; vale el mejor de los dos)
//   criticos    crítico fijo en los ataques de la especialidad elegida (Crítico Mejorado)
//
//   dotesActivas     las compradas que dan efecto: sin requisito roto y sin las que
//                    sustituye una mejorada que también se tiene ("vale la mejor")
//   efectosDeDotes   → { casillas, modificadores, textos, bonosTramo, criticos }
//   casillasDeDotes / textosDeDotes / modificadoresDeDotes   atajos sobre una ficha
import { ATRIBUTOS } from "./atributos";
import { HABILIDADES } from "./habilidades";
import {
  cumpleRequisitoDote,
  dotesConRequisitoRoto,
  especialidadArmaPropia,
  etiquetaEleccion,
  valoresRequisitoDeFicha,
  type ValoresRequisito,
} from "./dotes";
import { dotePorId, mismaDote, normalizarNombre, type DoteComprada } from "./dotesCompradas";
import { DESTINOS_DOTES, OPCIONES_DE_TRAMO } from "../catalog/dotesDestinos";
import { DOTES } from "../catalog/dotes";
import { especialidadPorId, type EspecialidadId } from "../catalog/especialidades";
import type { DoteCatalogo, EfectoDote } from "../catalog/dotesTipos";
import type { BonoPorTramo, CondicionTirada, OpcionCondicion, TramoDistancia } from "./condiciones";
import type { AlcanceModificador, ModificadorConFuente } from "./modificadores";
import type { TextoEnTirada } from "./especie";
import type { Sheet } from "./sheet";

export type DoteActiva = { dote: DoteCatalogo; compra: DoteComprada };

// `valores`: los de los requisitos (FichaResuelta.requisitosDotes). null = sin mirar
// requisitos: NPC del máster (§9.4, "sin requisitos ni coste").
//
// Requisito no cumplido (marca de D1, dotesConRequisitoRoto): la dote NO da efecto
// mientras esté marcada (supuesto S34, docs/sistema.md). Sin cascada: una dote cuyo
// requisito es otra dote marcada sigue contando como cumplido, igual que la marca.
//
// Vale la mejor (§9.1): si se tienen la básica y la mejorada (`sustituye`, también en
// cadena: Constante → Mejorado → básica), solo da efecto la mejor. Una mejorada con el
// requisito roto no sustituye a nada: vuelve a valer la básica.
export function dotesActivas(sheet: Sheet, valores: ValoresRequisito | null): DoteActiva[] {
  const rotas = valores ? dotesConRequisitoRoto(sheet, valores).map((r) => r.dote) : [];
  const compradas = sheet.dotes.flatMap((compra): DoteActiva[] => {
    const dote = dotePorId(compra.id);
    if (!dote || rotas.some((r) => mismaDote(r, compra))) return [];
    return [{ dote, compra }];
  });
  const sustituidas = new Set<string>();
  for (const { dote } of compradas) {
    const vistas = new Set<string>();
    for (let s = dote.sustituye; s && !vistas.has(s); s = dotePorId(s)?.sustituye ?? null) {
      vistas.add(s);
      sustituidas.add(s);
    }
  }
  return compradas.filter(({ dote }) => !sustituidas.has(dote.id));
}

// Bono por tramo de distancia de una dote, con el alcance de las tiradas que lo reciben
// (conExtrasDeFicha lo añade a su `bonosTramo`).
export type BonoTramoDeDote = { alcance: AlcanceModificador; bono: BonoPorTramo };
// Crítico fijo (Crítico Mejorado): `margen` éxitos en los ataques con arma de esa especialidad.
export type CriticoDeDote = { especialidad: EspecialidadId; margen: number; fuente: string };

export type EfectosDeDotes = {
  // Casillas con alcance, al mismo índice que las del equipo y la especie.
  casillas: CondicionTirada[];
  // Bonos siempre activos (sin casilla): Modificador de tirada con origen "dote".
  modificadores: ModificadorConFuente[];
  textos: TextoEnTirada[];
  bonosTramo: BonoTramoDeDote[];
  criticos: CriticoDeDote[];
};

export const SIN_EFECTOS_DE_DOTES: EfectosDeDotes = { casillas: [], modificadores: [], textos: [], bonosTramo: [], criticos: [] };

const TRAMOS: readonly TramoDistancia[] = ["bocajarro", "corta", "media", "larga"];

// El alcance del efecto: el del destino y, si la dote filtra el arma por empleo
// (Desenfundado Rápido: a una mano), ese empleo en el alcance de familia.
function alcanceDe(destino: AlcanceModificador, e: { filtroArma?: { empleo?: "una mano" | "dos manos" } }): AlcanceModificador {
  const empleo = e.filtroArma?.empleo;
  return empleo && destino.tipo === "familiaArma" ? { ...destino, empleo } : destino;
}

// "Vale la mejor" entre bonos por tramo que no se suman (`noAcumulaCon`, en cualquiera de
// los dos sentidos): misma clave para la dote y las que excluye, en ese alcance y tramo.
function claveExcluyente(dote: DoteCatalogo, e: Extract<EfectoDote, { tipo: "bono" }>): string | undefined {
  const otras = new Set(e.noAcumulaCon ?? []);
  for (const d of DOTES)
    for (const o of d.efectos)
      if (o.tipo === "bono" && o.alcance === e.alcance && o.tramo === e.tramo && o.noAcumulaCon?.includes(dote.id)) otras.add(d.id);
  if (otras.size === 0) return undefined;
  return [dote.id, ...otras].sort().join("|");
}

// "Especialidad Médica: Ceguera y sordera"; sin elección, el nombre a secas.
function nombreDe({ dote, compra }: DoteActiva): string {
  const el = etiquetaEleccion(dote, compra.eleccion);
  return el ? `${dote.label}: ${el}` : dote.label;
}

// Prefijo estable de los ids de casilla: el id de la dote, y la elección si es repetible
// (una casilla por pareja comprada de Especialidad Médica, §9.3).
function claveDe({ dote, compra }: DoteActiva): string {
  if (!dote.repetible || !compra.eleccion) return dote.id;
  return `${dote.id}_${normalizarNombre(compra.eleccion).replace(/[^a-z0-9]+/g, "_")}`;
}

const etiquetaUmbral = (s: { tipo: "atributo" | "habilidad"; id: string }) =>
  (s.tipo === "atributo" ? ATRIBUTOS : HABILIDADES).find((x) => x.id === s.id)?.label ?? s.id;

// La parte del umbral que todavía no aplica la app (D2d, valor por umbral de ficha):
// el bono hermano con `siMin` del mismo alcance y casilla, para avisar en la etiqueta.
function avisoUmbral(dote: DoteCatalogo, e: Extract<EfectoDote, { tipo: "bono" }>): string {
  const hermano = dote.efectos.find(
    (o): o is Extract<EfectoDote, { tipo: "bono" }> =>
      o.tipo === "bono" && o.alcance === e.alcance && o.condicion === e.condicion && typeof o.valor === "object" && "siMin" in o.valor,
  );
  if (!hermano || typeof hermano.valor !== "object" || !("siMin" in hermano.valor) || !hermano.valor.siMin) return "";
  const s = hermano.valor.siMin;
  return `; +${s.valor} con ${etiquetaUmbral(s)} ≥ ${s.min}, súmalo a mano`;
}

// `valores`: los de los requisitos, para el requisito por rama (null = NPC, sin mirar).
export function efectosDeDotes(activas: readonly DoteActiva[], valores: ValoresRequisito | null): EfectosDeDotes {
  if (activas.length === 0) return SIN_EFECTOS_DE_DOTES;
  const casillas: CondicionTirada[] = [];
  const modificadores: ModificadorConFuente[] = [];
  const textos: TextoEnTirada[] = [];
  const bonosTramo: BonoTramoDeDote[] = [];
  const criticos: CriticoDeDote[] = [];
  const compradas = activas.map((a) => a.compra);

  for (const activa of activas) {
    const { dote, compra } = activa;
    const fuente = nombreDe(activa);
    const clave = claveDe(activa);
    // Bonos por opción de una condición que la tirada no tiene: una casilla de opción por
    // grupo (movimiento_oculto), con una opción por bono.
    const porTramo = new Map<string, { casilla: Extract<CondicionTirada, { tipo: "opcion" }> }>();

    dote.efectos.forEach((e, i) => {
      if (dote.motor[i]?.estado !== "construido") return;
      // Requisito por rama: el efecto de la rama que la ficha no cumple no sale (§9.5).
      if ("requisitoAlcance" in e && e.requisitoAlcance && valores && !cumpleRequisitoDote(e.requisitoAlcance, valores, compradas)) return;
      if (e.tipo === "margen_critico") {
        // Crítico Mejorado: la especialidad elegida al comprar, mientras siga siendo propia y
        // de la rama que cumple (S43; NPC sin mirar).
        const esp = compra.eleccion ? especialidadPorId(compra.eleccion) : undefined;
        if (DESTINOS_DOTES[e.alcance]?.tipo !== "especialidadArmaElegida" || !esp) return;
        if (valores && !especialidadArmaPropia(dote, esp.id, valores, compradas)) return;
        criticos.push({ especialidad: esp.id, margen: e.valor, fuente });
        return;
      }
      if (e.tipo === "bono") {
        const destino = DESTINOS_DOTES[e.alcance];
        if (destino?.tipo !== "tirada" || typeof e.valor !== "number") return;
        const alcance = alcanceDe(destino.alcance, e);
        if (e.tramo) {
          const [grupo, opcion] = e.tramo.split(":");
          // Tramo de distancia de los disparos: bono por tramo, no casilla.
          if (grupo === "tramo") {
            if (!TRAMOS.includes(opcion as TramoDistancia)) return;
            const excluyente = claveExcluyente(dote, e);
            bonosTramo.push({
              alcance,
              bono: {
                fuente,
                porTramo: { [opcion]: e.valor },
                ...(e.soloEspecialidad && { soloEnEspecialidad: true as const }),
                ...(excluyente && { excluyente }),
              },
            });
            return;
          }
          const def = OPCIONES_DE_TRAMO[grupo];
          if (!def) return;
          let g = porTramo.get(grupo);
          if (!g) {
            g = {
              casilla: {
                id: `${clave}_${grupo}`,
                tipo: "opcion",
                etiqueta: `${def.etiqueta} (${fuente})`,
                opciones: [{ id: "ninguna", etiqueta: def.ninguna, valor: 0 }],
                porDefecto: "ninguna",
                alcance,
              },
            };
            porTramo.set(grupo, g);
            casillas.push(g.casilla);
          }
          const op: OpcionCondicion = { id: opcion, etiqueta: def.opciones[opcion] ?? opcion, valor: e.valor };
          g.casilla.opciones.push(op);
          // La etiqueta dice cuánto compensa: "reduce 2" o "reduce hasta 4" si varía por opción.
          const valores = g.casilla.opciones.slice(1).map((o) => o.valor);
          const max = Math.max(...valores);
          const cuanto = valores.every((v) => v === max) ? `${max}` : `hasta ${max}`;
          g.casilla.etiqueta = `${def.etiqueta} ${cuanto} (${fuente})`;
          return;
        }
        // Siempre activo y sin especialidad: bono fijo, sale en el desglose con la dote.
        if (e.condicion === null && !destino.especialidad) {
          modificadores.push({ tipo: "tirada", alcance, valor: e.valor, origen: "dote", fuente });
          return;
        }
        // Casilla. Con especialidad, aunque el bono sea siempre activo: la tirada no sabe
        // con cuál vas, así que la marca el jugador (decisión del usuario, D2a).
        const condicion = e.condicion ?? "tirando con la especialidad";
        const texto = destino.especialidad ? `${destino.especialidad}: ${condicion}` : condicion;
        casillas.push({
          id: `${clave}_${i}`,
          tipo: "toggle",
          etiqueta: `${texto} (${fuente}${avisoUmbral(dote, e)})`,
          valorActivo: e.valor,
          alcance,
        });
        return;
      }
      if (e.tipo === "texto") {
        const destino = DESTINOS_DOTES[e.lugar];
        if (destino?.tipo !== "tirada") return; // "ficha": vive en la tarjeta de la dote
        const texto = e.condicion ? `${e.condicion}: ${e.texto}` : e.texto;
        const soloEnCritico = e.grados?.includes("critico") ?? false;
        const alcance = alcanceDe(destino.alcance, e);
        if (alcance.tipo === "familiaArma") textos.push({ en: alcance, texto, fuente, soloEnCritico });
        else for (const id of destino.textos) textos.push({ en: { tipo: "tiradaId", id }, texto, fuente, soloEnCritico });
      }
    });
  }
  return { casillas, modificadores, textos, bonosTramo, criticos };
}

// Atajos con los requisitos de la propia ficha (sin especie resuelta aparte).
const deFicha = (sheet: Sheet) => {
  const valores = valoresRequisitoDeFicha(sheet);
  return efectosDeDotes(dotesActivas(sheet, valores), valores);
};
export const casillasDeDotes = (sheet: Sheet): CondicionTirada[] => deFicha(sheet).casillas;
export const textosDeDotes = (sheet: Sheet): TextoEnTirada[] => deFicha(sheet).textos;
export const modificadoresDeDotes = (sheet: Sheet): ModificadorConFuente[] => deFicha(sheet).modificadores;
