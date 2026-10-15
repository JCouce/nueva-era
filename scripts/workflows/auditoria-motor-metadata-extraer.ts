// Extracción puntual para auditar si motorMetadata/modificadores de cada
// pieza (y cada nivel dentro de una pieza) coinciden con su descripción en
// prosa. NO es parte del build ni de los tests — alimenta el Workflow de
// auditoría (.claude/workflows/auditoria-motor-metadata.js, que trae su
// propio comentario con el cómo-se-usa y las mejores prácticas completas)
// vía `args`. Solo lectura del catálogo, no muta nada.
//
// Uso: node --import ./scripts/test-resolver.mjs scripts/workflows/auditoria-motor-metadata-extraer.ts \
//        [salida.json] [--familia equipo|dote|todo] [--estado construido|pendiente] [--tanda D2a|D2b-1|D2b-2|D2c|D2d]
//
//   --familia  qué catálogo recorre (por defecto "todo": equipo + dotes).
//   --estado / --tanda  solo dotes: se queda con las dotes que tengan al menos un
//              efecto en ese estado / tanda. "D2a" = los efectos construidos. El item
//              lleva el MotorMetadata entero de la dote (contexto para el auditor).
//
// Dotes (D2a): `detalle` = la prosa de docs/dotes.md; `modificadores`/`condiciones`/
// `notaTirada` = lo que la app pone de verdad en las tiradas, sacado de
// rules/dotesEfectos.ts con una ficha que solo tiene esa dote (sin mirar requisitos;
// con elección, la primera opción); `efectos` = todos los efectos del catálogo.
import { writeFileSync } from "node:fs";
import { DOTES } from "../../src/lib/catalog/dotes";
import { TANDAS_DOTES } from "../../src/lib/catalog/dotesDestinos";
import { dotesActivas, efectosDeDotes } from "../../src/lib/rules/dotesEfectos";
import { defaultSheet } from "../../src/lib/rules/sheet";
import {
  EQUIPO,
  type Equipo,
  type MejoraEstandar,
  type Subsistema,
  type MejoraMovimiento,
  type MejoraDeArma,
  type Herramienta,
} from "../../src/lib/catalog/equipo";

// Mismo type guard que catalog/motor.test.ts — las 5 familias con niveles.
type ConNiveles = MejoraEstandar | Subsistema | MejoraMovimiento | MejoraDeArma | Herramienta;

function tieneNiveles(pieza: Equipo): pieza is ConNiveles {
  return (
    pieza.familia === "mejoraEstandar" ||
    pieza.familia === "subsistema" ||
    pieza.familia === "movimiento" ||
    pieza.familia === "mejoraArma" ||
    pieza.familia === "herramienta"
  );
}

type ItemAuditoria = {
  piezaId: string;
  piezaLabel: string;
  familia: string;
  nivel: number | null;
  detalle: string[];
  modificadores: unknown[];
  ajusteTramo: unknown;
  ajusteAtaque: unknown;
  condiciones: unknown;
  notaTirada: unknown;
  motor: unknown[];
  efectos?: unknown[];
};

const argv = process.argv.slice(2);
const opcion = (nombre: string) => {
  const i = argv.indexOf(`--${nombre}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const familia = opcion("familia") ?? "todo";
const estado = opcion("estado");
const tanda = opcion("tanda");
if (!["equipo", "dote", "todo"].includes(familia)) throw new Error(`--familia ${familia}: equipo | dote | todo`);
if (estado && !["construido", "pendiente"].includes(estado)) throw new Error(`--estado ${estado}: construido | pendiente`);
if (tanda && tanda !== "D2a" && !(TANDAS_DOTES as readonly string[]).includes(tanda))
  throw new Error(`--tanda ${tanda}: D2a | ${TANDAS_DOTES.join(" | ")}`);

const items: ItemAuditoria[] = [];
const excluidas: string[] = [];

for (const pieza of familia === "dote" ? [] : EQUIPO) {
  if (tieneNiveles(pieza)) {
    for (const nivel of pieza.niveles) {
      items.push({
        piezaId: pieza.id,
        piezaLabel: pieza.label,
        familia: pieza.familia,
        nivel: nivel.nivel,
        detalle: nivel.detalle ?? [],
        modificadores: nivel.modificadores ?? [],
        ajusteTramo: nivel.ajusteTramo ?? null,
        ajusteAtaque: nivel.ajusteAtaque ?? null,
        condiciones: nivel.condiciones ?? null,
        notaTirada: nivel.notaTirada ?? null,
        motor: nivel.motor ?? [],
      });
    }
    continue;
  }

  if (pieza.familia === "granada") {
    // MunicionGranada no tiene campo de prosa (no hay `descripcion`): sus
    // campos (dificultadArrojada, danio, areaEfecto...) SON la regla, no una
    // frase a contrastar contra el motor. Las 14 granadas comparten además
    // el mismo MotorMetadata (MOTOR_GRANADA en municion.ts) — no hay nada
    // que un agente pueda "leer en prosa" para esta familia. Fuera del
        // alcance de esta auditoría a propósito, no un olvido.
    excluidas.push(`${pieza.id} (familia "granada": sin campo de prosa que auditar)`);
    continue;
  }

  const conDescripcion = pieza as Equipo & { descripcion?: string; especial?: string | null; modificadores?: unknown[]; motor?: unknown[] };
  if (typeof conDescripcion.descripcion !== "string") {
    excluidas.push(`${pieza.id} (familia "${pieza.familia}": sin campo "descripcion" reconocido)`);
    continue;
  }

  const especial = typeof conDescripcion.especial === "string" ? [conDescripcion.especial] : [];
  items.push({
    piezaId: pieza.id,
    piezaLabel: pieza.label,
    familia: pieza.familia,
    nivel: null,
    detalle: [conDescripcion.descripcion, ...especial],
    modificadores: conDescripcion.modificadores ?? [],
    ajusteTramo: null,
    ajusteAtaque: null,
    condiciones: null,
    notaTirada: null,
    motor: conDescripcion.motor ?? [],
  });
}

// ── Dotes ──────────────────────────────────────────────────────────────
let dotesFuera = 0;
for (const dote of familia === "equipo" ? [] : DOTES) {
  const casa = dote.motor.some(
    (m) =>
      (!estado || m.estado === estado) &&
      (!tanda || (tanda === "D2a" ? m.estado === "construido" : m.estado === "pendiente" && m.bloqueoPor === tanda)),
  );
  if (!casa || dote.efectos.length === 0) {
    dotesFuera++;
    continue;
  }
  const el = dote.eleccion;
  const eleccion = !el ? undefined : el.opciones === "especialidades_arma" ? "<especialidad de arma>" : el.opciones[0];
  const sheet = { ...defaultSheet(), dotes: [{ id: dote.id, ...(eleccion && { eleccion }) }] };
  const { casillas, modificadores, textos } = efectosDeDotes(dotesActivas(sheet, null));
  items.push({
    piezaId: dote.id,
    piezaLabel: dote.label,
    familia: "dote",
    nivel: null,
    detalle: [dote.texto],
    modificadores,
    ajusteTramo: null,
    ajusteAtaque: null,
    condiciones: casillas.length ? casillas : null,
    notaTirada: textos.length
      ? textos.map((t) => `${t.en.tipo === "tiradaId" ? t.en.id : t.en.tipo}${t.soloEnCritico ? " (crítico)" : ""}: ${t.texto}`).join(" | ")
      : null,
    motor: dote.motor,
    efectos: dote.efectos,
  });
}

const sinMotor = items.filter((i) => i.motor.length === 0);
const salida = argv[0] && !argv[0].startsWith("--") ? argv[0] : "catalogo-motor.json";
writeFileSync(salida, JSON.stringify(items, null, 2));

console.log(`Filtro: familia ${familia}${estado ? `, estado ${estado}` : ""}${tanda ? `, tanda ${tanda}` : ""}.`);
console.log(`EQUIPO: ${familia === "dote" ? 0 : EQUIPO.length} piezas recorridas. DOTES: ${familia === "equipo" ? 0 : DOTES.length - dotesFuera} de ${DOTES.length} dentro del filtro.`);
console.log(`${items.length} items de auditoría extraídos (piezas planas + niveles).`);
console.log(`${sinMotor.length} sin "motor" definido: ${sinMotor.map((i) => `${i.piezaId}${i.nivel ? "#" + i.nivel : ""}`).join(", ") || "(ninguno)"}`);
console.log(`${excluidas.length} piezas excluidas del alcance:`);
for (const e of excluidas) console.log(`  - ${e}`);
console.log(`Escrito en ${salida}`);
