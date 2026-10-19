// Lógica pura del visor de terminal (ver.mjs): de (contrato, revisión por script, ahora, ancho) a líneas de texto.
// Sin E/S ni reloj: todo entra por parámetro, para poder testearlo y pegar la salida en un chat.
import { criterios as leerCriterios, leerFrontmatter } from "../guion/contrato.mjs";
import { juzgar, leerJuicios, MAX_VUELTAS, revisionValida } from "../juez/juez.mjs";

export const ESTACIONES = ["Inspección", "Worktree", "Construcción", "Revisión", "Juez"];
export const SPINNER = "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏";
export const ACTIVOS = ["encolado", "inspeccion", "construyendo", "revision", "juicio"];

const ANSI = /\x1b\[[0-9;?]*[A-Za-z]/g;
const COLORES = { verde: 32, cian: 36, gris: 90, rojo: 31, amarillo: 33, negrita: 1 };

export const largo = (s) => Array.from(s.replace(ANSI, "")).length;

export function truncar(s, n) {
  const cps = Array.from(s);
  if (n <= 0) return "";
  return cps.length <= n ? s : `${cps.slice(0, n - 1).join("")}…`;
}

export function duracion(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m${String(s % 60).padStart(2, "0")}s`;
  return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}m`;
}

// Cronómetro: fin (o ahora, si sigue en la línea) menos inicio. null si el trabajo no ha entrado en la línea.
export function cronometro(fm, ahora) {
  const inicio = Date.parse(fm.inicio ?? "");
  if (Number.isNaN(inicio)) return null;
  const fin = Date.parse(fm.fin ?? "");
  return duracion((Number.isNaN(fin) ? ahora : fin) - inicio);
}

export function intentoActual(fm) {
  return (Number.parseInt(String(fm.vueltas ?? "0"), 10) || 0) + 1;
}

// Estado de cada estación (hecho | activa | pendiente | fallo | aviso), la nota bajo la activa y la línea final.
export function estaciones(fm, juicios) {
  const n = ESTACIONES.length;
  const hasta = (k, ultimo) => ESTACIONES.map((_, i) => (i < k ? "hecho" : i === k ? ultimo : "pendiente"));
  const intento = `intento ${intentoActual(fm)}/${MAX_VUELTAS + 1}`;
  const ultimo = juicios.at(-1);
  switch (fm.estado) {
    case "spec":
      return fm.inicio
        ? { lista: hasta(0, "fallo"), final: { tono: "rojo", texto: "vuelve al jefe: la inspección devolvió el contrato" } }
        : { lista: hasta(-1), final: { tono: "gris", texto: "en spec: aún sin encolar" } };
    case "encolado":
      return { lista: hasta(-1), final: { tono: "gris", texto: "en cola: esperando a la línea" } };
    case "inspeccion":
      return { lista: hasta(0, "activa") };
    case "construyendo":
      return { lista: hasta(2, "activa"), nota: { i: 2, texto: intento } };
    case "revision":
      return { lista: hasta(3, "activa"), nota: { i: 3, texto: intento } };
    case "juicio":
      return { lista: hasta(4, "activa"), nota: { i: 4, texto: intento } };
    case "contigo":
      return { lista: hasta(n), final: { tono: "verde", texto: "te toca: revisar y push" } };
    case "escalado":
      return ultimo
        ? { lista: hasta(4, "aviso"), final: { tono: "amarillo", texto: `escalado: ${ultimo.motivo}` } }
        : { lista: hasta(-1), final: { tono: "amarillo", texto: "escalado sin juicio: falló la propia línea" } };
    case "hecho":
      return { lista: hasta(n), final: { tono: "verde", texto: "hecho" } };
    case "descartado":
      return { lista: hasta(-1), final: { tono: "gris", texto: "descartado" } };
    default:
      return { lista: hasta(-1), final: { tono: "rojo", texto: `estado desconocido: ${fm.estado ?? "(sin estado)"}` } };
  }
}

// Veredicto por criterio. Si revision.mjs ya escribió la de este intento y el juez aún no ha hablado, C1/C2/script
// salen de ahí (con las mismas reglas del juez); si no, del último bloque de Juicio.
export function veredictos(texto, fm, juicios, revision) {
  const ids = leerCriterios(texto).map((c) => c.id);
  const intento = intentoActual(fm);
  const ultimo = juicios.at(-1);
  let fuente = ultimo?.veredictos ?? [];
  const vuelta = intento - 1;
  if (
    revisionValida(revision, { vuelta, rama: fm.rama }) &&
    vuelta <= MAX_VUELTAS &&
    (!ultimo || ultimo.intento < intento)
  ) {
    const deScript = ids.filter((id) => id === "C1" || id === "C2").map((id) => ({ id }));
    fuente = juzgar({ criterios: deScript, vuelta, revision }).veredictos;
  }
  const res = ids.map((id) => {
    const v = fuente.find((x) => x.id === id);
    return { id, veredicto: v?.veredicto ?? null, evidencia: v?.evidencia ?? "" };
  });
  const script = fuente.find((x) => x.id === "script");
  if (script?.veredicto === "falla") res.push({ id: "push", veredicto: "falla", evidencia: script.evidencia });
  return res;
}

function detalleCorto(evidencia) {
  return String(evidencia)
    .split("\n")[0]
    .replace(/^fuera de "Puede tocar": /, "fuera: ")
    .replace(/^cambios sin commitear en el worktree: /, "sin commitear: ")
    .trim();
}

function pintor(color) {
  return (tono, s) => (color && COLORES[tono] ? `\x1b[${COLORES[tono]}m${s}\x1b[0m` : s);
}

const SIMBOLO = {
  hecho: ["✓", "verde"],
  activa: [null, "cian"],
  pendiente: ["·", "gris"],
  fallo: ["✗", "rojo"],
  aviso: ["✗", "amarillo"],
};

const VEREDICTO = { pasa: ["✓", "verde"], falla: ["✗", "rojo"], "no aplica": ["–", "gris"] };

// Las piezas de la fila de criterios, ya con su largo visible para poder partir en líneas.
function piezasCriterios(vs, p, ancho) {
  return vs.map(({ id, veredicto, evidencia }) => {
    const [sim, tono] = VEREDICTO[veredicto] ?? ["·", "gris"];
    const sitio = Math.min(40, ancho - SANGRIA - largo(id) - 3);
    const detalle = veredicto === "falla" ? truncar(detalleCorto(evidencia), sitio) : "";
    const plano = `${id} ${sim}${detalle ? ` ${detalle}` : ""}`;
    const pintado = `${id} ${p(tono, sim)}${detalle ? ` ${p(tono, detalle)}` : ""}`;
    return { plano, pintado };
  });
}

const SANGRIA = 14;

function filaEtiquetada(etiqueta, piezas, ancho, p) {
  const sangria = `  ${etiqueta.padEnd(SANGRIA - 3)} `;
  const hueco = " ".repeat(largo(sangria));
  const lineas = [];
  let actual = [];
  let usado = largo(sangria);
  for (const pieza of piezas) {
    if (actual.length && usado + 3 + largo(pieza.plano) > ancho) {
      lineas.push(actual);
      actual = [];
      usado = largo(sangria);
    }
    usado += largo(pieza.plano) + (actual.length ? 3 : 0);
    actual.push(pieza);
  }
  if (actual.length) lineas.push(actual);
  if (!lineas.length) lineas.push([{ plano: "—", pintado: p("gris", "—") }]);
  return lineas.map((l, i) => `${i === 0 ? `  ${p("negrita", etiqueta.padEnd(11))} ` : hueco}${l.map((x) => x.pintado).join("   ")}`);
}

export function dibujar({ texto, revision = null, ahora, ancho = 80, color = false, cuadro = 0, pie = null }) {
  const p = pintor(color);
  const fm = leerFrontmatter(texto);
  const juicios = leerJuicios(texto);
  const ancho_ = Math.max(30, ancho);
  const lineas = [];
  const regla = ` ${p("gris", "─".repeat(ancho_ - 2))}`;

  // Cabecera: id · título a la izquierda, cronómetro a la derecha.
  const reloj = cronometro(fm, ahora);
  const derecha = reloj ? `⏱ ${reloj}` : "";
  const id = fm.id ?? "T-???";
  const sitio = ancho_ - 1 - largo(id) - 3 - (derecha ? largo(derecha) + 3 : 0);
  const titulo = truncar(fm.titulo ?? "(sin título)", sitio);
  const izquierda = ` ${p("negrita", id)} · ${titulo}`;
  const relleno = derecha ? " ".repeat(Math.max(1, ancho_ - 1 - largo(izquierda) - largo(derecha))) : "";
  lineas.push(`${izquierda}${relleno}${derecha ? p("cian", derecha) : ""}`, regla);

  // Estaciones: en fila si caben; si no, una debajo de otra.
  const est = estaciones(fm, juicios);
  const spinner = SPINNER[((cuadro % SPINNER.length) + SPINNER.length) % SPINNER.length];
  const trozos = ESTACIONES.map((nombre, i) => {
    const [sim, tono] = SIMBOLO[est.lista[i]];
    const s = sim ?? spinner;
    const activa = est.lista[i] === "activa";
    return {
      plano: `${s} ${nombre}`,
      pintado: `${p(tono, s)} ${activa ? p("negrita", nombre) : est.lista[i] === "pendiente" ? p("gris", nombre) : nombre}`,
    };
  });
  const sep = " ── ";
  const enFila = 2 + trozos.reduce((a, t) => a + largo(t.plano), 0) + sep.length * (trozos.length - 1);
  if (ancho_ >= 60 && enFila <= ancho_) {
    lineas.push(`  ${trozos.map((t) => t.pintado).join(p("gris", sep))}`);
    if (est.nota) {
      const columna = 2 + trozos.slice(0, est.nota.i).reduce((a, t) => a + largo(t.plano) + sep.length, 0) + 2;
      const nota = truncar(est.nota.texto, ancho_ - columna);
      lineas.push(`${" ".repeat(columna)}${p("cian", nota)}`);
    }
  } else {
    trozos.forEach((t, i) => {
      const nota = est.nota?.i === i ? `  ${est.nota.texto}` : "";
      lineas.push(`  ${t.pintado}${nota ? p("cian", truncar(nota, ancho_ - 2 - largo(t.plano))) : ""}`);
    });
  }
  if (est.final) lineas.push(`  ${p(est.final.tono, truncar(est.final.texto, ancho_ - 2))}`);
  lineas.push(regla);

  // Criterios, última decisión y operario.
  lineas.push(...filaEtiquetada("Criterios", piezasCriterios(veredictos(texto, fm, juicios, revision), p, ancho_), ancho_, p));

  const ultimo = juicios.at(-1);
  let ultima;
  if (ultimo) {
    const fallan = ultimo.veredictos.filter((v) => v.veredicto === "falla").map((v) => v.id);
    ultima = `juez #${ultimo.intento}: ${ultimo.decision}${fallan.length ? ` (falla ${fallan.join(", ")})` : ""}`;
  } else {
    ultima = `estado ${fm.estado ?? "?"}`;
  }
  lineas.push(`  ${p("negrita", "Última".padEnd(11))} ${truncar(ultima, ancho_ - SANGRIA)}`);

  const op = /^(\d+)\/(\d+)$/.exec(fm.operario ?? "");
  const tonoOp = op && Number(op[1]) > 0 ? (Number(op[1]) / Number(op[2]) > 0.05 ? "rojo" : "amarillo") : "gris";
  lineas.push(`  ${p("negrita", "Operario".padEnd(11))} ${op ? p(tonoOp, `${op[1]}/${op[2]} fallos`) : p("gris", "—")}`);

  if (pie) lineas.push("", ` ${p("gris", truncar(pie, ancho_ - 1))}`);
  return lineas;
}
