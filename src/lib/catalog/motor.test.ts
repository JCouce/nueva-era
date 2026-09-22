import { test } from "node:test";
import assert from "node:assert/strict";
import { motorMetadataSchema, erroresDeMotorMetadata, type MotorMetadata } from "../rules/motor";
import {
  EQUIPO,
  type Equipo,
  type MejoraEstandar,
  type Subsistema,
  type MejoraMovimiento,
  type MejoraDeArma,
  type Herramienta,
} from "./equipo";
import { ARMAMENTO_PESADO } from "./armamentoPesado";
import { MUNICION_GRANADA } from "./municion";

// Las 5 familias que envuelven `niveles: NivelModulo[]` — los efectos reales
// (modificadores, condiciones, notaTirada) viven por nivel, no en la pieza
// contenedora, así que el MotorMetadata también (docs/motor.md, decisión al
// dar de alta este test).
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

function validaMotor(etiqueta: string, motor: MotorMetadata[] | undefined, errores: string[]) {
  if (!motor || motor.length === 0) {
    errores.push(`${etiqueta}: falta "motor" (o está vacío)`);
    return;
  }
  motor.forEach((m, i) => {
    const parsed = motorMetadataSchema.safeParse(m);
    if (!parsed.success) {
      const detalle = parsed.error.issues.map((issue) => `${issue.path.join(".") || "(raíz)"} ${issue.message}`).join("; ");
      errores.push(`${etiqueta} efecto ${i}: ${detalle}`);
      return;
    }
    for (const cruzado of erroresDeMotorMetadata(parsed.data)) {
      errores.push(`${etiqueta} efecto ${i}: ${cruzado}`);
    }
  });
}

function recorre(nombre: string, piezas: readonly Equipo[], errores: string[]) {
  for (const pieza of piezas) {
    if (tieneNiveles(pieza)) {
      for (const nivel of pieza.niveles) {
        validaMotor(`${nombre}/${pieza.id} nivel ${nivel.nivel}`, nivel.motor, errores);
      }
    } else {
      validaMotor(`${nombre}/${pieza.id}`, pieza.motor, errores);
    }
  }
}

// Deliberadamente fuera de este barrido: catalog/especies.ts. motor.md
// diseñó MotorMetadata pensando en equipo — especies es además scaffolding
// provisional a la espera del documento de Fase 5 (ver su cabecera), así
// que ni siquiera está claro que el schema le valga tal cual. Se evalúa
// aparte el día que haga falta, no se fuerza aquí.
const MAX_ERRORES_EN_MENSAJE = 60;

test("cada efecto de cada pieza del catálogo de equipo declara su MotorMetadata completo", () => {
  const errores: string[] = [];
  recorre("EQUIPO", EQUIPO, errores);
  recorre("ARMAMENTO_PESADO", ARMAMENTO_PESADO, errores);
  recorre("MUNICION_GRANADA", MUNICION_GRANADA, errores);

  const resto = errores.length - MAX_ERRORES_EN_MENSAJE;
  const mensaje = [
    `${errores.length} pieza(s)/nivel(es) sin MotorMetadata completo:`,
    ...errores.slice(0, MAX_ERRORES_EN_MENSAJE),
    ...(resto > 0 ? [`… y ${resto} más`] : []),
  ].join("\n");

  assert.equal(errores.length, 0, mensaje);
});
