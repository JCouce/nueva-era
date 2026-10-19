import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { aplicarJuicio, bloqueJuicio, juzgar, leerJuicios, revisionValida, suma } from "./juez.mjs";
import { leerFrontmatter, leerSeccion } from "../guion/contrato.mjs";
import { decidir } from "../hooks/bloqueos.mjs";

const leer = (rel) => fs.readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

const criterios = ["C1", "C2", "C3", "C4"].map((id) => ({ id, texto: "x", oraculo: "y" }));
const revisarOk = {
  resultados: [
    { id: "tests", estado: "pasa", detalle: "npm test" },
    { id: "tsc", estado: "pasa", detalle: "npx tsc --noEmit" },
    { id: "lint", estado: "no aplica", detalle: "nada" },
    { id: "ficha", estado: "no aplica", detalle: "sheet.ts no cambia" },
    { id: "bd", estado: "no aplica", detalle: "ni schema" },
    { id: "prod", estado: "pasa", detalle: "nada" },
  ],
};
const revision = { vuelta: 0, rama: "fabrica/T-001-x", revisar: revisarOk, alcance: { estado: "pasa", evidencia: "2 archivos" } };
const revisorOk = {
  criterios: [
    { id: "C3", veredicto: "pasa", evidencia: "combate.ts:40" },
    { id: "C4", veredicto: "no aplica", evidencia: "no hay armas de fuego con modos en el catálogo" },
  ],
};
const base = { criterios, vuelta: 0, revision, revisor: revisorOk };
const con = (cambios) => juzgar({ ...base, ...cambios });
const conRevisar = (id, estado, detalle = "roto") => ({
  ...revision,
  revisar: { resultados: revisarOk.resultados.map((r) => (r.id === id ? { id, estado, detalle } : r)) },
});

test("todo pasa → contigo", () => {
  const r = con({});
  assert.equal(r.decision, "contigo");
  assert.equal(r.estado, "contigo");
  assert.equal(r.vueltas, 0);
  assert.deepEqual(r.fallan, []);
  assert.deepEqual(r.veredictos.map((x) => x.fuente), ["script", "alcance", "revisor", "revisor", "script"]);
});

test("algo falla en vuelta 0 y 1 → vuelve, y sube vueltas", () => {
  const revisor = { criterios: [{ id: "C3", veredicto: "falla", evidencia: "dice Modo de disparo" }, revisorOk.criterios[1]] };
  for (const vuelta of [0, 1]) {
    const r = con({ vuelta, revisor });
    assert.equal(r.decision, "vuelve");
    assert.equal(r.estado, "construyendo");
    assert.equal(r.vueltas, vuelta + 1);
    assert.deepEqual(r.fallan, ["C3"]);
  }
});

test("algo falla en la vuelta 2 (tercer intento) → escalado", () => {
  const r = con({ vuelta: 2, revision: conRevisar("tests", "falla") });
  assert.equal(r.decision, "escalado");
  assert.equal(r.vueltas, 2);
  assert.deepEqual(r.fallan, ["C1"]);
});

test("C1: tests o tsc en falla, o sin revisar, falla", () => {
  assert.deepEqual(con({ revision: conRevisar("tsc", "falla") }).fallan, ["C1"]);
  assert.deepEqual(con({ revision: { ...revision, revisar: { error: "no hubo JSON" } } }).fallan, ["C1", "script"]);
  const sinTsc = { ...revision, revisar: { resultados: revisarOk.resultados.filter((r) => r.id !== "tsc") } };
  assert.match(con({ revision: sinTsc }).veredictos[0].evidencia, /no dio "tsc"/);
});

test("C2 lo vota el alcance; sin revisión, C1, C2 y script fallan", () => {
  assert.deepEqual(con({ revision: { ...revision, alcance: { estado: "falla", evidencia: "fuera: x" } } }).fallan, ["C2"]);
  assert.deepEqual(con({ revision: null }).fallan, ["C1", "C2", "script"]);
});

test("el revisor no puede votar C1 ni C2", () => {
  const revisor = { criterios: [...revisorOk.criterios, { id: "C1", veredicto: "pasa", evidencia: "yo lo vi" }] };
  assert.deepEqual(con({ revisor, revision: conRevisar("tests", "falla") }).fallan, ["C1"]);
});

test("criterio sin veredicto, sin evidencia o con veredicto raro → falla", () => {
  assert.deepEqual(con({ revisor: { criterios: [revisorOk.criterios[0]] } }).fallan, ["C4"]);
  assert.deepEqual(con({ revisor: { criterios: [revisorOk.criterios[0], { id: "C4", veredicto: "pasa", evidencia: "  " }] } }).fallan, ["C4"]);
  assert.deepEqual(con({ revisor: { criterios: [revisorOk.criterios[0], { id: "C4", veredicto: "ok", evidencia: "e" }] } }).fallan, ["C4"]);
  assert.deepEqual(con({ revisor: null }).fallan, ["C3", "C4"]);
});

test("veredictos duplicados del revisor: si uno falla, falla", () => {
  const revisor = { criterios: [...revisorOk.criterios, { id: "C3", veredicto: "falla", evidencia: "segundo vistazo" }] };
  assert.deepEqual(con({ revisor }).fallan, ["C3"]);
});

test("push seguro: lint, ficha o prod en falla votan como 'script'; un aviso no", () => {
  assert.deepEqual(con({ revision: conRevisar("lint", "falla") }).fallan, ["script"]);
  assert.deepEqual(con({ revision: conRevisar("ficha", "falla") }).fallan, ["script"]);
  assert.equal(con({ revision: conRevisar("prod", "aviso") }).decision, "contigo");
});

test("tocar la BD escala aunque todo pase", () => {
  const r = con({ revision: conRevisar("bd", "pasa", "migraciones nuevas: 2026_x") });
  assert.equal(r.decision, "escalado");
  assert.match(r.motivo, /toca la BD/);
});

test("bloqueo o duda de diseño → escalado, aunque sea la vuelta 0", () => {
  assert.equal(con({ bloqueo: "la spec pide tocar schema.prisma", revision: null, revisor: null }).decision, "escalado");
  const r = con({ dudaDiseno: "¿la etiqueta va en el catálogo o en la regla?" });
  assert.equal(r.decision, "escalado");
  assert.match(r.motivo, /duda de diseño/);
  assert.equal(con({ bloqueo: "   " }).decision, "contigo");
});

test("vuelta fuera de rango lanza", () => {
  assert.throws(() => con({ vuelta: 3 }), /vuelta/);
  assert.throws(() => con({ vuelta: "0" }), /vuelta/);
});

test("revisionValida exige la misma vuelta y rama", () => {
  assert.equal(revisionValida(revision, { vuelta: 0, rama: "fabrica/T-001-x" }), true);
  assert.equal(revisionValida(revision, { vuelta: 1, rama: "fabrica/T-001-x" }), false);
  assert.equal(revisionValida(revision, { vuelta: 0, rama: "fabrica/T-002-y" }), false);
  assert.equal(revisionValida(null, { vuelta: 0, rama: "x" }), false);
});

test("aplicarJuicio escribe el bloque en Juicio, estado y vueltas, y acumula", () => {
  const plantilla = leer("../contrato/plantilla.md");
  const malo = con({ revision: conRevisar("tests", "falla", "2 tests rojos\nlinea 2") });
  let t = aplicarJuicio(plantilla, malo);
  assert.equal(leerFrontmatter(t).estado, "construyendo");
  assert.equal(leerFrontmatter(t).vueltas, "1/2");
  t = aplicarJuicio(t, con({ vuelta: 1 }));
  assert.equal(leerFrontmatter(t).estado, "contigo");
  assert.equal(leerFrontmatter(t).vueltas, "1/2");
  const juicio = leerSeccion(t, "Juicio");
  assert.match(juicio, /### Intento 1 · vuelve[\s\S]*2 tests rojos\n {2}linea 2[\s\S]*### Intento 2 · contigo/);
  assert.equal(leerSeccion(t, "Revisión"), leerSeccion(plantilla, "Revisión"));
});

test("bloqueJuicio escapa | en la tabla", () => {
  const r = con({ revisor: { criterios: [{ id: "C3", veredicto: "pasa", evidencia: "a | b" }, revisorOk.criterios[1]] } });
  assert.match(bloqueJuicio(r), /\| C3 \| pasa \| revisor \| a \\\| b \|/);
});

// --- el guion (linea.js) no se puede importar: se sacan sus funciones del texto y se comparan con las del juez ---
const guion = leer("../guion/linea.js");
const funcionDelGuion = (nombre) => {
  const m = guion.match(new RegExp(`function ${nombre}\\([^)]*\\) \\{[\\s\\S]*?\\n\\}`));
  assert.ok(m, `linea.js no tiene function ${nombre}`);
  return new Function(`${m[0]}; return ${nombre};`)();
};

test("suma() del guion es la misma que la del juez", () => {
  const sumaGuion = funcionDelGuion("suma");
  for (const s of ["", "abc", '{"vuelta":0,"evidencia":"Modo de ataque: Simple — ñ"}']) {
    assert.equal(sumaGuion(s), suma(s), s);
  }
  assert.equal(suma("abc"), "1a47e90b");
});

test("jsonParaShell: mismo JSON, y el comando del juez pasa el hook aunque la evidencia sea peligrosa", () => {
  const jsonParaShell = funcionDelGuion("jsonParaShell");
  const entrada = {
    vuelta: 1,
    bloqueo: null,
    dudaDiseno: null,
    revisor: {
      criterios: [
        { id: "C3", veredicto: "falla", evidencia: "hace git push y lee .env con DATABASE_URL=x; npm run build; neon.tech; make-master\n'comilla' `tick` $HOME" },
      ],
    },
  };
  const texto = jsonParaShell(entrada);
  assert.deepEqual(JSON.parse(texto), entrada);
  assert.ok(!texto.includes("\n"));
  const comando = `node '/r/fabrica/juez/juez.mjs' '/r/fabrica/trabajos/T-001-x.md' --suma ${suma(texto)} <<'FIN_JUEZ'\n${texto}\nFIN_JUEZ`;
  const r = decidir({ tool_name: "Bash", tool_input: { command: comando }, agent_type: "fabrica-operario", cwd: "/r" });
  assert.equal(r.bloquear, false, r.motivo);
  const crudo = decidir({ tool_name: "Bash", tool_input: { command: JSON.stringify(entrada) }, agent_type: "fabrica-operario", cwd: "/r" });
  assert.equal(crudo.bloquear, true);
});

test("aplicarJuicio anota fin en contigo o escalado (no en vuelve) y el operario", () => {
  const enLinea = "---\nid: T-001\nestado: juicio\nvueltas: 0/2\nrama: r\ninicio: 2026-10-19T10:00:00.000Z\n---\n## Juicio\n";
  const marcas = { ahora: "2026-10-19T10:06:00.000Z", operario: "0/9" };
  const vuelve = leerFrontmatter(aplicarJuicio(enLinea, con({ revision: conRevisar("tests", "falla") }), marcas));
  assert.equal(vuelve.fin, undefined);
  assert.equal(vuelve.operario, "0/9");
  assert.equal(leerFrontmatter(aplicarJuicio(enLinea, con({}), marcas)).fin, marcas.ahora);
  assert.equal(leerFrontmatter(aplicarJuicio(enLinea, con({ dudaDiseno: "x" }), marcas)).fin, marcas.ahora);
});

test("leerJuicios lee de vuelta lo que escribe bloqueJuicio", () => {
  const plantilla = leer("../contrato/plantilla.md");
  assert.deepEqual(leerJuicios(plantilla), []);
  const malo = con({ revision: { ...revision, alcance: { estado: "falla", evidencia: "fuera de \"Puede tocar\": a | b.ts" } } });
  const t = aplicarJuicio(aplicarJuicio(plantilla, malo), con({ vuelta: 1 }));
  const js = leerJuicios(t);
  assert.deepEqual(js.map((j) => [j.intento, j.decision]), [[1, "vuelve"], [2, "contigo"]]);
  assert.equal(js[0].motivo, malo.motivo);
  assert.deepEqual(js[0].veredictos.map((v) => v.id), ["C1", "C2", "C3", "C4", "script"]);
  assert.deepEqual(js[0].veredictos[1], { id: "C2", veredicto: "falla", fuente: "alcance", evidencia: 'fuera de "Puede tocar": a | b.ts' });
});
