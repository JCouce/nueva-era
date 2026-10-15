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
//   dotesActivas     las compradas que dan efecto: sin requisito roto y sin las que
//                    sustituye una mejorada que también se tiene ("vale la mejor")
//   efectosDeDotes   → { casillas, modificadores, textos }
//   casillasDeDotes / textosDeDotes / modificadoresDeDotes   atajos sobre una ficha
import { ATRIBUTOS } from "./atributos";
import { HABILIDADES } from "./habilidades";
import { dotesConRequisitoRoto, etiquetaEleccion, valoresRequisitoDeFicha, type ValoresRequisito } from "./dotes";
import { dotePorId, mismaDote, normalizarNombre, type DoteComprada } from "./dotesCompradas";
import { DESTINOS_DOTES, OPCIONES_DE_TRAMO } from "../catalog/dotesDestinos";
import type { DoteCatalogo, EfectoDote } from "../catalog/dotesTipos";
import type { CondicionTirada, OpcionCondicion } from "./condiciones";
import type { ModificadorConFuente } from "./modificadores";
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

export type EfectosDeDotes = {
  // Casillas con alcance, al mismo índice que las del equipo y la especie.
  casillas: CondicionTirada[];
  // Bonos siempre activos (sin casilla): Modificador de tirada con origen "dote".
  modificadores: ModificadorConFuente[];
  textos: TextoEnTirada[];
};

export const SIN_EFECTOS_DE_DOTES: EfectosDeDotes = { casillas: [], modificadores: [], textos: [] };

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

export function efectosDeDotes(activas: readonly DoteActiva[]): EfectosDeDotes {
  if (activas.length === 0) return SIN_EFECTOS_DE_DOTES;
  const casillas: CondicionTirada[] = [];
  const modificadores: ModificadorConFuente[] = [];
  const textos: TextoEnTirada[] = [];

  for (const activa of activas) {
    const { dote } = activa;
    const fuente = nombreDe(activa);
    const clave = claveDe(activa);
    // Bonos por opción de una condición que la tirada no tiene: una casilla de opción por
    // grupo (movimiento_oculto), con una opción por bono.
    const porTramo = new Map<string, { casilla: Extract<CondicionTirada, { tipo: "opcion" }> }>();

    dote.efectos.forEach((e, i) => {
      if (dote.motor[i]?.estado !== "construido") return;
      if (e.tipo === "bono") {
        const destino = DESTINOS_DOTES[e.alcance];
        if (destino?.tipo !== "tirada" || typeof e.valor !== "number") return;
        if (e.tramo) {
          const [grupo, opcion] = e.tramo.split(":");
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
                alcance: destino.alcance,
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
          modificadores.push({ tipo: "tirada", alcance: destino.alcance, valor: e.valor, origen: "dote", fuente });
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
          alcance: destino.alcance,
        });
        return;
      }
      if (e.tipo === "texto") {
        const destino = DESTINOS_DOTES[e.lugar];
        if (destino?.tipo !== "tirada") return; // "ficha": vive en la tarjeta de la dote
        const texto = e.condicion ? `${e.condicion}: ${e.texto}` : e.texto;
        const soloEnCritico = e.grados?.includes("critico") ?? false;
        for (const id of destino.textos) textos.push({ en: { tipo: "tiradaId", id }, texto, fuente, soloEnCritico });
      }
    });
  }
  return { casillas, modificadores, textos };
}

// Atajos con los requisitos de la propia ficha (sin especie resuelta aparte).
const deFicha = (sheet: Sheet) => efectosDeDotes(dotesActivas(sheet, valoresRequisitoDeFicha(sheet)));
export const casillasDeDotes = (sheet: Sheet): CondicionTirada[] => deFicha(sheet).casillas;
export const textosDeDotes = (sheet: Sheet): TextoEnTirada[] => deFicha(sheet).textos;
export const modificadoresDeDotes = (sheet: Sheet): ModificadorConFuente[] => deFicha(sheet).modificadores;
