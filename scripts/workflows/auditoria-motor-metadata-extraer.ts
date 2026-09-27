// Extracción puntual para auditar si motorMetadata/modificadores de cada
// pieza (y cada nivel dentro de una pieza) coinciden con su descripción en
// prosa. NO es parte del build ni de los tests — alimenta el Workflow de
// auditoría (.claude/workflows/auditoria-motor-metadata.js, que trae su
// propio comentario con el cómo-se-usa y las mejores prácticas completas)
// vía `args`. Solo lectura del catálogo, no muta nada.
//
// Uso: node --import ./scripts/test-resolver.mjs scripts/workflows/auditoria-motor-metadata-extraer.ts [salida.json]
import { writeFileSync } from "node:fs";
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
};

const items: ItemAuditoria[] = [];
const excluidas: string[] = [];

for (const pieza of EQUIPO) {
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

const sinMotor = items.filter((i) => i.motor.length === 0);
const salida = process.argv[2] ?? "catalogo-motor.json";
writeFileSync(salida, JSON.stringify(items, null, 2));

console.log(`EQUIPO: ${EQUIPO.length} piezas totales.`);
console.log(`${items.length} items de auditoría extraídos (piezas planas + niveles).`);
console.log(`${sinMotor.length} sin "motor" definido: ${sinMotor.map((i) => `${i.piezaId}${i.nivel ? "#" + i.nivel : ""}`).join(", ") || "(ninguno)"}`);
console.log(`${excluidas.length} piezas excluidas del alcance:`);
for (const e of excluidas) console.log(`  - ${e}`);
console.log(`Escrito en ${salida}`);
