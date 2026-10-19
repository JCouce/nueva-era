// Entregas: lo que decide cada estación, en un JSON al lado del contrato (fabrica/trabajos/, gitignored).
// Ningún LLM transporta estos datos: la estación escribe el archivo y el código (revision.mjs, el juez) lo lee de ahí.
//   .revision-T-xxx.json  revision.mjs (script y alcance)
//   .votos-T-xxx.json     revisor: {id, vuelta, criterios:[{id, veredicto, evidencia}], dudaDiseno, hallazgos}
//   .obra-T-xxx.json      constructor, SOLO si para: {id, vuelta, bloqueo}
// Se borran al empezar cada intento (contrato.mjs estado construyendo): así nunca se juzga con la de un intento
// anterior o de una ejecución anterior de la línea.
import fs from "node:fs";
import path from "node:path";

export const ENTREGAS = ["revision", "votos", "obra"];

export function rutaEntrega(rutaContrato, tipo, id) {
  return path.join(path.dirname(rutaContrato), `.${tipo}-${id}.json`);
}

export function limpiarEntregas(rutaContrato, id) {
  for (const tipo of ENTREGAS) fs.rmSync(rutaEntrega(rutaContrato, tipo, id), { force: true });
}

// { existe, datos, error }: error si existe pero no es JSON de un objeto.
function leer(ruta) {
  let crudo;
  try {
    crudo = fs.readFileSync(ruta, "utf8");
  } catch {
    return { existe: false, datos: null, error: null };
  }
  try {
    const datos = JSON.parse(crudo);
    if (!datos || typeof datos !== "object" || Array.isArray(datos)) throw new Error("no es un objeto");
    return { existe: true, datos, error: null };
  } catch (error) {
    return { existe: true, datos: null, error: `no es JSON válido (${error.message})` };
  }
}

function deEsteIntento(datos, { id, vuelta }) {
  if (datos.id !== id) return `es de "${datos.id}", no de ${id}`;
  if (datos.vuelta !== vuelta) return `es de la vuelta ${JSON.stringify(datos.vuelta)}, no de la ${vuelta}`;
  return null;
}

// Validación pura de los votos. Los veredictos y evidencias por criterio los valida el juez uno a uno (un criterio
// mal votado falla solo él); aquí, la forma del archivo entero.
export function validarVotos(datos, { id, vuelta }) {
  const ajeno = deEsteIntento(datos, { id, vuelta });
  if (ajeno) return { votos: null, error: ajeno };
  if (!Array.isArray(datos.criterios)) return { votos: null, error: "falta la lista \"criterios\"" };
  if (datos.criterios.some((c) => !c || typeof c !== "object" || typeof c.id !== "string")) {
    return { votos: null, error: "hay criterios sin \"id\"" };
  }
  if (datos.dudaDiseno !== null && typeof datos.dudaDiseno !== "string") {
    return { votos: null, error: "\"dudaDiseno\" tiene que ser texto o null" };
  }
  const hallazgos = Array.isArray(datos.hallazgos) ? datos.hallazgos.filter((h) => typeof h === "string") : [];
  return { votos: { criterios: datos.criterios, dudaDiseno: datos.dudaDiseno, hallazgos }, error: null };
}

// { votos, error }. Con error, los criterios del revisor fallan con ese motivo (no se aborta la línea).
export function leerVotos(rutaContrato, { id, vuelta }) {
  const ruta = rutaEntrega(rutaContrato, "votos", id);
  const nombre = path.basename(ruta);
  const { existe, datos, error } = leer(ruta);
  if (!existe) return { votos: null, error: `el revisor no dejó sus votos en ${nombre}` };
  if (error) return { votos: null, error: `${nombre} ${error}` };
  const r = validarVotos(datos, { id, vuelta });
  return r.error ? { votos: null, error: `${nombre} no vale: ${r.error}` } : r;
}

// Validación pura de la obra. Si el constructor dejó el archivo, es que quiso parar: uno ilegible también para.
export function validarObra(datos, { id, vuelta }, nombre = ".obra") {
  const ajeno = deEsteIntento(datos, { id, vuelta });
  if (ajeno) return { bloqueo: `el constructor dejó ${nombre}, pero ${ajeno}` };
  if (datos.bloqueo === null || datos.bloqueo === undefined) return { bloqueo: null };
  if (typeof datos.bloqueo !== "string") return { bloqueo: `el constructor dejó ${nombre} con un "bloqueo" que no es texto` };
  return { bloqueo: datos.bloqueo.trim() || null };
}

// { bloqueo }: texto si el constructor paró en este intento; null si no (no hay archivo, o bloqueo vacío).
export function leerObra(rutaContrato, { id, vuelta }) {
  const ruta = rutaEntrega(rutaContrato, "obra", id);
  const nombre = path.basename(ruta);
  const { existe, datos, error } = leer(ruta);
  if (!existe) return { bloqueo: null };
  if (error) return { bloqueo: `el constructor dejó ${nombre}, pero ${error}` };
  return validarObra(datos, { id, vuelta }, nombre);
}
