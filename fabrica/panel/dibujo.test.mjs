import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { cambiarEstado, ponerCampo } from "../guion/contrato.mjs";
import { aplicarJuicio, juzgar } from "../juez/juez.mjs";
import { dibujar, duracion, largo, truncar } from "./dibujo.mjs";

const plantilla = fs.readFileSync(fileURLToPath(new URL("../contrato/plantilla.md", import.meta.url)), "utf8");
const RAMA = "fabrica/T-001-modo-de-ataque";
const H0 = Date.parse("2026-10-19T10:00:00.000Z");
const iso = (ms) => new Date(ms).toISOString();

let t0 = ponerCampo(plantilla, "id", "T-001");
t0 = ponerCampo(t0, "titulo", 'El selector de modo melee se llama "Modo de ataque"');
t0 = ponerCampo(t0, "rama", RAMA);
t0 = t0.replace("| C3 | | |", "| C3 | etiqueta melee | test |\n| C4 | etiqueta fuego | test |");

const criterios = ["C1", "C2", "C3", "C4"].map((id) => ({ id }));
const revisarOk = {
  resultados: [
    { id: "tests", estado: "pasa", detalle: "npm test" },
    { id: "tsc", estado: "pasa", detalle: "tsc" },
    { id: "bd", estado: "no aplica", detalle: "nada" },
  ],
};
const revision = (vuelta, alcance = { estado: "pasa", evidencia: "2 archivos" }) => ({ vuelta, rama: RAMA, revisar: revisarOk, alcance });
const revisorOk = { criterios: [{ id: "C3", veredicto: "pasa", evidencia: "e" }, { id: "C4", veredicto: "pasa", evidencia: "e" }] };
const fueraC2 = { estado: "falla", evidencia: 'fuera de "Puede tocar": src/app/x.tsx' };

// El recorrido real: estados con el CLI de contrato (cambiarEstado) y juicios con el juez.
function enLinea() {
  let t = cambiarEstado(t0, "encolado").texto;
  t = cambiarEstado(t, "inspeccion", ["encolado"], { ahora: iso(H0), operario: "0/1" }).texto;
  t = cambiarEstado(t, "construyendo", null, { operario: "0/3" }).texto;
  return cambiarEstado(t, "revision", null, { operario: "0/4" }).texto;
}
function juicio(t, vuelta, opciones, ms) {
  return aplicarJuicio(t, juzgar({ criterios, vuelta, revisor: revisorOk, ...opciones }), { ahora: iso(ms), operario: "0/7" });
}
const intento2 = () => cambiarEstado(juicio(enLinea(), 0, { revision: revision(0, fueraC2) }, H0 + 300e3), "construyendo").texto;

const pinta = (texto, extra = {}) => dibujar({ texto, ahora: H0 + 372e3, ancho: 76, ...extra });

test("duracion y truncar", () => {
  assert.equal(duracion(45e3), "45s");
  assert.equal(duracion(372e3), "6m12s");
  assert.equal(duracion(3_780e3), "1h03m");
  assert.equal(truncar("abcdef", 4), "abc…");
  assert.equal(truncar("abc", 4), "abc");
});

test("construyendo, intento 2: estaciones, nota, criterios del último juicio y cronómetro", () => {
  const l = pinta(intento2());
  assert.match(l[0], /^ T-001 · El selector .* ⏱ 6m12s$/);
  assert.equal(l[2], "  ✓ Inspección ── ✓ Worktree ── ⠋ Construcción ── · Revisión ── · Juez");
  assert.equal(l[3].indexOf("intento 2/3"), l[2].indexOf("Construcción"));
  const texto = l.join("\n");
  assert.match(texto, /Criterios {3}C1 ✓ {3}C2 ✗ fuera: src\/app\/x\.tsx {3}C3 ✓ {3}C4 ✓/);
  assert.match(texto, /Última {6}juez #1: vuelve \(falla C2\)/);
  assert.match(texto, /Operario {4}0\/7 fallos/);
});

test("en revisión, la revisión por script de este intento adelanta C1 y C2", () => {
  const t = cambiarEstado(intento2(), "revision").texto;
  const l = dibujar({ texto: t, revision: revision(1), ahora: H0, ancho: 76 }).join("\n");
  assert.match(l, /✓ Construcción ── ⠋ Revisión/);
  assert.match(l, /C1 ✓ {3}C2 ✓ {3}C3 · {3}C4 ·/);
  // La de la vuelta anterior no cuenta: se ven los veredictos del juicio 1.
  assert.match(dibujar({ texto: t, revision: revision(0), ahora: H0, ancho: 76 }).join("\n"), /C2 ✗/);
});

test("escalado: juez en amarillo, motivo y cronómetro parado en fin", () => {
  let t = intento2();
  t = juicio(t, 1, { revision: revision(1, fueraC2) }, H0 + 400e3);
  t = juicio(t, 2, { revision: revision(2, fueraC2) }, H0 + 500e3);
  const l = dibujar({ texto: t, ahora: H0 + 9_999e3, ancho: 100, color: false }).join("\n");
  assert.match(l, /⏱ 8m20s/);
  assert.match(l, /✓ Revisión ── ✗ Juez/);
  assert.match(l, /escalado: falla C2 en el tercer intento/);
  assert.match(l, /juez #3: escalado \(falla C2\)/);
});

test("contigo: todo verde y te toca a ti", () => {
  const l = pinta(juicio(enLinea(), 0, { revision: revision(0) }, H0 + 200e3)).join("\n");
  assert.match(l, /✓ Inspección ── ✓ Worktree ── ✓ Construcción ── ✓ Revisión ── ✓ Juez/);
  assert.match(l, /te toca: revisar y push/);
  assert.match(l, /⏱ 3m20s/);
});

test("spec tras la inspección: vuelve al jefe; spec sin encolar no tiene cronómetro", () => {
  let t = cambiarEstado(t0, "encolado").texto;
  t = cambiarEstado(t, "inspeccion", null, { ahora: iso(H0) }).texto;
  t = cambiarEstado(t, "spec", null, { ahora: iso(H0 + 60e3) }).texto;
  const l = pinta(t).join("\n");
  assert.match(l, /✗ Inspección ── · Worktree/);
  assert.match(l, /vuelve al jefe/);
  assert.doesNotMatch(pinta(t0)[0], /⏱/);
});

test("a menos de 60 columnas las estaciones van en vertical; ninguna línea se pasa del ancho", () => {
  const l = pinta(intento2(), { ancho: 50 });
  assert.ok(l.includes("  ⠋ Construcción  intento 2/3"), l.join("\n"));
  assert.ok(l.includes("  · Juez"));
  const estados = [t0, enLinea(), intento2(), juicio(enLinea(), 0, { revision: revision(0) }, H0)];
  for (const texto of estados) {
    for (let ancho = 30; ancho <= 130; ancho += 7) {
      for (const linea of pinta(texto, { ancho, pie: "q para salir · fabrica/trabajos/T-001-modo-de-ataque.md" })) {
        assert.ok(largo(linea) <= ancho, `${ancho}: ${linea}`);
      }
    }
  }
});

test("color solo si se pide; el spinner avanza con el cuadro", () => {
  assert.ok(!pinta(intento2()).join("").includes("\x1b["));
  assert.ok(pinta(intento2(), { color: true }).join("").includes("\x1b[36m"));
  assert.match(pinta(intento2(), { cuadro: 1 })[2], /⠙ Construcción/);
});
