import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { leerObra, leerVotos, limpiarEntregas, rutaEntrega, validarVotos } from "./entregas.mjs";
import { decidir } from "../hooks/bloqueos.mjs";

const carpeta = () => {
  const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "entregas-")), "fabrica", "trabajos");
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, "T-001-x.md");
};
const escribir = (contrato, tipo, datos) =>
  fs.writeFileSync(rutaEntrega(contrato, tipo, "T-001"), typeof datos === "string" ? datos : JSON.stringify(datos));
const yo = { id: "T-001", vuelta: 1 };
const votosOk = {
  id: "T-001",
  vuelta: 1,
  criterios: [{ id: "C3", veredicto: "pasa", evidencia: "recursos.ts:40" }],
  dudaDiseno: null,
  hallazgos: ["un aviso"],
};

test("rutaEntrega va junto al contrato y empieza por punto", () => {
  assert.equal(rutaEntrega("/r/fabrica/trabajos/T-001-x.md", "votos", "T-001"), "/r/fabrica/trabajos/.votos-T-001.json");
});

test("leerVotos: sin archivo, JSON roto, de otro trabajo o de otra vuelta → error con motivo claro", () => {
  const c = carpeta();
  assert.match(leerVotos(c, yo).error, /no dejó sus votos en \.votos-T-001\.json/);
  escribir(c, "votos", "{roto");
  assert.match(leerVotos(c, yo).error, /no es JSON válido/);
  escribir(c, "votos", { ...votosOk, id: "T-002" });
  assert.match(leerVotos(c, yo).error, /es de "T-002"/);
  escribir(c, "votos", { ...votosOk, vuelta: 0 });
  assert.match(leerVotos(c, yo).error, /vuelta 0, no de la 1/);
  escribir(c, "votos", votosOk);
  const r = leerVotos(c, yo);
  assert.equal(r.error, null);
  assert.deepEqual(r.votos.criterios, votosOk.criterios);
  assert.deepEqual(r.votos.hallazgos, ["un aviso"]);
});

test("validarVotos: forma del archivo entero", () => {
  assert.match(validarVotos({ ...votosOk, criterios: "C3 pasa" }, yo).error, /criterios/);
  assert.match(validarVotos({ ...votosOk, criterios: [{ veredicto: "pasa" }] }, yo).error, /sin "id"/);
  assert.match(validarVotos({ ...votosOk, dudaDiseno: 3 }, yo).error, /dudaDiseno/);
  assert.equal(validarVotos({ ...votosOk, dudaDiseno: "¿catálogo o regla?" }, yo).votos.dudaDiseno, "¿catálogo o regla?");
  // Un veredicto raro no invalida el archivo: lo falla el juez solo en ese criterio.
  assert.equal(validarVotos({ ...votosOk, criterios: [{ id: "C3", veredicto: "ok", evidencia: "" }] }, yo).error, null);
});

test("leerObra: sin archivo no hay bloqueo; con él, para (aunque sea ilegible)", () => {
  const c = carpeta();
  assert.equal(leerObra(c, yo).bloqueo, null);
  escribir(c, "obra", { id: "T-001", vuelta: 1, bloqueo: "  hay que tocar schema.prisma " });
  assert.equal(leerObra(c, yo).bloqueo, "hay que tocar schema.prisma");
  escribir(c, "obra", { id: "T-001", vuelta: 1, bloqueo: null });
  assert.equal(leerObra(c, yo).bloqueo, null);
  escribir(c, "obra", "bloqueo: no sé");
  assert.match(leerObra(c, yo).bloqueo, /no es JSON válido/);
  escribir(c, "obra", { id: "T-001", vuelta: 0, bloqueo: "x" });
  assert.match(leerObra(c, yo).bloqueo, /vuelta 0/);
});

test("limpiarEntregas borra revision, votos y obra (y no falla si no están)", () => {
  const c = carpeta();
  for (const tipo of ["revision", "votos", "obra"]) escribir(c, tipo, {});
  limpiarEntregas(c, "T-001");
  for (const tipo of ["revision", "votos", "obra"]) assert.equal(fs.existsSync(rutaEntrega(c, tipo, "T-001")), false);
  assert.doesNotThrow(() => limpiarEntregas(c, "T-001"));
});

test("el hook deja al revisor escribir .votos en fabrica/trabajos y no fuera", () => {
  const escribe = (file_path) =>
    decidir({ tool_name: "Write", tool_input: { file_path }, agent_type: "fabrica-revisor", cwd: "/w" }).bloquear;
  assert.equal(escribe("/r/fabrica/trabajos/.votos-T-001.json"), false);
  assert.equal(escribe("/r/src/lib/rules/recursos.ts"), true);
});
