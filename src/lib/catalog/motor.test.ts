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
  type Implante,
} from "./equipo";
import { ARMAMENTO_PESADO } from "./armamentoPesado";
import { MUNICION_GRANADA } from "./municion";
import { ESPECIES, type Rasgo } from "./especies";

// Las 5 familias que envuelven `niveles: NivelModulo[]` — los efectos reales
// (modificadores, condiciones, notaTirada) viven por nivel, no en la pieza
// contenedora, así que el MotorMetadata también (docs/motor.md, decisión al
// dar de alta este test).
type ConNiveles = MejoraEstandar | Subsistema | MejoraMovimiento | MejoraDeArma | Herramienta | Implante;

function tieneNiveles(pieza: Equipo): pieza is ConNiveles {
  return (
    pieza.familia === "mejoraEstandar" ||
    pieza.familia === "subsistema" ||
    pieza.familia === "movimiento" ||
    pieza.familia === "mejoraArma" ||
    pieza.familia === "herramienta" ||
    pieza.familia === "implante"
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

// Especies (docs/sistema.md §14): cada rasgo de especie, casta y linaje declara
// su MotorMetadata. Excepción: los rasgos de creación (costes, bolsa de aumentos)
// quedan fuera del modelo (motor.md, "Lo que queda fuera del modelo") y deben
// llegar con `motor` vacío, para que nadie les cuelgue uno a medias.
test("cada rasgo de especie, casta y linaje declara su MotorMetadata completo", () => {
  const errores: string[] = [];
  const revisa = (etiqueta: string, rasgos: Rasgo[]) => {
    for (const r of rasgos) {
      if (r.creacion) {
        if (r.motor.length > 0) errores.push(`${etiqueta}/${r.id}: rasgo de creación con "motor"`);
      } else {
        validaMotor(`${etiqueta}/${r.id}`, r.motor, errores);
      }
    }
  };
  for (const e of ESPECIES) {
    revisa(e.id, e.rasgos);
    for (const c of e.castas ?? []) revisa(`${e.id}/${c.id}`, c.rasgos);
    for (const l of e.linajes?.opciones ?? []) revisa(`${e.id}/${l.id}`, l.rasgos);
  }
  assert.equal(errores.length, 0, errores.join("\n"));
});
