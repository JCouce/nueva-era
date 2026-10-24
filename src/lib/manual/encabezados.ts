// Prepara un documento del diseñador (docs/fuente/*.md, salido de pandoc) para leerlo
// en el manual: limpia las rarezas de pandoc e infiere los encabezados.
//
// Los documentos casi no traen `#`: el diseñador marca los apartados con párrafos que
// son SOLO negrita (`**Burla (Coste 2)**\`). Pandoc además parte esas negritas entre
// líneas (`**Dotes\` … `Apoyo (Coste 2)\**`) y mete el salto duro dentro del cierre
// (`Texto\**`), que un parser CommonMark lee como asterisco escapado. Por eso se
// recorre el texto línea a línea siguiendo qué negritas/cursivas siguen abiertas y se
// reescribe cada línea con su formato cerrado dentro de ella.
//
// Niveles (criterio simple, el h1 es el título del documento):
// - Encabezado inferido seguido directamente de otro encabezado (sin cuerpo en medio)
//   → h2: agrupa (p. ej. "Actitud" antes de "Apoyo (Coste 2)").
// - El resto de inferidos → h3.
// - Los `#` reales se respetan recortados a h2–h4 (`#`/`##` → h2, `#####` → h4).
// - Si el primer encabezado repite el título del documento, se descarta.

export type NivelEncabezado = 2 | 3 | 4;

export type Encabezado = {
  nivel: NivelEncabezado;
  texto: string;
  id: string;
};

export type DocumentoPreparado = {
  markdown: string;
  encabezados: Encabezado[];
};

// TODO(revisar): umbral contra falsos positivos (una frase de cuerpo entera en
// negrita). Con los documentos de 2026-10 ningún encabezado legítimo pasa de ~60.
export const LONGITUD_MAX_ENCABEZADO = 90;

type Estilo = { negrita: boolean; cursiva: boolean };
type Segmento = Estilo & { texto: string };

type Item =
  | { tipo: "crudo"; texto: string }
  | { tipo: "vacio" }
  | { tipo: "linea"; texto: string; salto: boolean; abreBloque: boolean }
  | { tipo: "encabezado"; texto: string; nivelReal: number | null };

export function slugificar(texto: string): string {
  const slug = texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "seccion";
}

function alternar(estado: Estilo, longitud: number): void {
  // Pandoc anida negritas (`****X**`) y cierra/abre en el mismo punto (`***\***`):
  // 4 cuenta como una negrita y 6 o más se anulan.
  const negrita = longitud >= 2 && longitud <= 5;
  const cursiva = longitud === 1 || longitud === 3 || longitud === 5;
  if (negrita) estado.negrita = !estado.negrita;
  if (cursiva) estado.cursiva = !estado.cursiva;
}

// Marcador pegado a texto por la izquierda (`Texto**`, `Texto\**`): cierra lo que haya
// abierto. Lo que sobra reabre (pandoc cierra y abre en el mismo punto:
// `**Ingeniería Genética*****\` cierra la negrita-cursiva y abre negrita para la línea
// siguiente). Si no cerraba nada, solo abre cuando va justo antes del salto de línea
// (`expresión.**\` + `Atletismo**`: pandoc deja ahí la apertura de la línea siguiente);
// en otro sitio se ignora en vez de abrir a ciegas.
function cerrar(estado: Estilo, longitud: number, abrirSiNada: boolean): void {
  let resto = longitud;
  if (estado.negrita && estado.cursiva && resto >= 3) {
    estado.negrita = estado.cursiva = false;
    resto -= 3;
  } else if (estado.negrita && resto >= 2) {
    estado.negrita = false;
    resto -= 2;
  } else if (estado.cursiva) {
    estado.cursiva = false;
    resto -= 1;
  } else {
    if (abrirSiNada) alternar(estado, longitud);
    return;
  }
  if (resto > 0) alternar(estado, resto);
}

function tokenizar(texto: string, estado: Estilo): { segmentos: Segmento[]; salto: boolean } {
  const segmentos: Segmento[] = [];
  let buffer = "";
  let salto = false;
  const soloMarcadores = /^[\s*\\]*$/.test(texto);
  const volcar = () => {
    if (buffer) segmentos.push({ texto: buffer, ...estado });
    buffer = "";
  };

  let i = 0;
  while (i < texto.length) {
    const resto = texto.slice(i);
    const finDeLinea = /^\\(\**)\s*$/.exec(resto);
    if (finDeLinea) {
      // Salto duro al final, con o sin marcadores de cierre pegados (`Texto\**`).
      volcar();
      if (finDeLinea[1]) cerrar(estado, finDeLinea[1].length, false);
      salto = true;
      break;
    }
    const c = texto[i];
    if (c === "\\" && i + 1 < texto.length) {
      buffer += texto.slice(i, i + 2);
      i += 2;
      continue;
    }
    if (c === "`") {
      const tic = /^`+/.exec(resto)![0];
      const cierre = texto.indexOf(tic, i + tic.length);
      const fin = cierre >= 0 ? cierre + tic.length : i + tic.length;
      buffer += texto.slice(i, fin);
      i = fin;
      continue;
    }
    if (c === "*") {
      const run = /^\*+/.exec(resto)![0];
      const antes = i === 0 ? " " : texto[i - 1];
      const despues = texto[i + run.length] ?? " ";
      // Un asterisco entre espacios es texto (un "2 * 3"), salvo en líneas que solo
      // traen marcadores, que son cierres/aperturas sueltos de pandoc.
      if (!soloMarcadores && /\s/.test(antes) && /\s/.test(despues)) {
        buffer += run;
      } else if (run.length === 4 && i > 0) {
        // `texto ****\`, `Puntería, ****Combate`: negrita vacía de pandoc, no abre nada.
        // Solo a principio de línea (`****Componentes…**`) es una negrita anidada.
      } else {
        volcar();
        if (/\s/.test(antes)) alternar(estado, run.length);
        else cerrar(estado, run.length, !soloMarcadores && /^\\?\s*$/.test(texto.slice(i + run.length)));
      }
      i += run.length;
      continue;
    }
    buffer += c;
    i += 1;
  }
  volcar();
  return { segmentos, salto };
}

function serializar(segmentos: Segmento[]): string {
  const fundidos: Segmento[] = [];
  for (const s of segmentos) {
    const ultimo = fundidos.at(-1);
    if (ultimo && ultimo.negrita === s.negrita && ultimo.cursiva === s.cursiva) {
      ultimo.texto += s.texto;
    } else {
      fundidos.push({ ...s });
    }
  }
  const PUNTUACION = /[\p{P}\p{S}]/u;
  const ALFANUM = /[\p{L}\p{N}]/u;
  return fundidos
    .map((s, i) => {
      if (!s.negrita && !s.cursiva) return s.texto;
      const [, delante, nucleo, detras] = /^(\s*)([\s\S]*?)(\s*)$/.exec(s.texto)!;
      if (!nucleo) return s.texto;
      const abre = (s.negrita ? "**" : "") + (s.cursiva ? "*" : "");
      const cierra = (s.cursiva ? "*" : "") + (s.negrita ? "**" : "");
      // CommonMark no cierra `**Muerte:**Se` (puntuación dentro, letra fuera) ni abre
      // `a**(b)**`: un espacio de separación lo arregla sin cambiar lo que se lee.
      const previo = delante ? "" : (fundidos[i - 1]?.texto.at(-1) ?? "");
      const siguiente = detras ? "" : (fundidos[i + 1]?.texto[0] ?? "");
      const sepAntes = PUNTUACION.test(nucleo[0]) && ALFANUM.test(previo) ? " " : "";
      const sepDespues = PUNTUACION.test(nucleo.at(-1)!) && ALFANUM.test(siguiente) ? " " : "";
      return `${delante}${sepAntes}${abre}${nucleo}${cierra}${sepDespues}${detras}`;
    })
    .join("");
}

function textoPlano(markdown: string): string {
  return markdown
    .replace(/`/g, "")
    .replace(/\\(.)/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s*:$/, "");
}

function esEncabezadoInferido(segmentos: Segmento[], texto: string): boolean {
  const conTexto = segmentos.filter((s) => s.texto.trim() !== "");
  if (conTexto.length === 0 || !conTexto.every((s) => s.negrita)) return false;
  if (!texto || texto.length > LONGITUD_MAX_ENCABEZADO) return false;
  // Viñetas a mano del diseñador ("· Fuego Automático: …").
  if (/^[·•\-–]/.test(texto)) return false;
  // Una frase de cuerpo entera en negrita ("Además, gana …").
  if (/\.$/.test(texto)) return false;
  // TODO(revisar): líneas de dato que el diseñador pone enteras en negrita
  // ("Requisito: Humor 1", "Objeto Extraño: 25000 créditos").
  if (/^(requisitos?|objeto|operación)\b/i.test(texto)) return false;
  return true;
}

const PREFIJO_BLOQUE = /^(\s*(?:[-+*]\s+|\d+[.)]\s+|>\s*)?)/;

function analizar(markdown: string): Item[] {
  const lineas = markdown.replace(/\r\n?/g, "\n").split("\n");
  while (lineas.length && /^\s*<!--.*-->\s*$/.test(lineas[0])) lineas.shift();

  const items: Item[] = [];
  const estado: Estilo = { negrita: false, cursiva: false };
  const reiniciar = () => {
    estado.negrita = false;
    estado.cursiva = false;
  };

  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i];

    if (/^\s*$/.test(linea)) {
      reiniciar();
      items.push({ tipo: "vacio" });
      continue;
    }

    if (/^\s*<table/i.test(linea)) {
      reiniciar();
      items.push({ tipo: "vacio" });
      while (i < lineas.length) {
        items.push({ tipo: "crudo", texto: lineas[i] });
        if (/<\/table>/i.test(lineas[i])) break;
        i++;
      }
      items.push({ tipo: "vacio" });
      continue;
    }

    if (/^\s*\|/.test(linea)) {
      reiniciar();
      items.push({ tipo: "crudo", texto: linea });
      continue;
    }

    const real = /^\s{0,3}(#{1,6})\s+(.*?)(?:\s+#+)?\s*$/.exec(linea);
    if (real) {
      reiniciar();
      const { segmentos } = tokenizar(real[2], { negrita: false, cursiva: false });
      items.push({
        tipo: "encabezado",
        texto: textoPlano(segmentos.map((s) => s.texto).join("")),
        nivelReal: real[1].length,
      });
      continue;
    }

    const prefijo = PREFIJO_BLOQUE.exec(linea)![1];
    const { segmentos, salto } = tokenizar(linea.slice(prefijo.length), estado);
    const contenido = serializar(segmentos);

    if (contenido.trim() === "") {
      // Línea que solo era `\` o marcadores sueltos: el hueco que dejó el diseñador.
      // No reinicia el estado: la negrita puede seguir abierta en la siguiente línea.
      items.push({ tipo: "vacio" });
      continue;
    }

    const texto = textoPlano(segmentos.map((s) => s.texto).join(""));
    if (prefijo === "" && esEncabezadoInferido(segmentos, texto)) {
      items.push({ tipo: "encabezado", texto, nivelReal: null });
      continue;
    }

    items.push({ tipo: "linea", texto: prefijo + contenido, salto, abreBloque: prefijo !== "" });
  }
  return items;
}

function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function prepararDocumento(
  markdown: string,
  opciones: { titulo?: string } = {},
): DocumentoPreparado {
  const items = analizar(markdown);

  if (opciones.titulo) {
    const primero = items.find((it) => it.tipo !== "vacio");
    if (
      primero?.tipo === "encabezado" &&
      slugificar(primero.texto) === slugificar(opciones.titulo)
    ) {
      items.splice(items.indexOf(primero), 1);
    }
  }

  const siguienteConContenido = (desde: number): Item | undefined =>
    items.slice(desde + 1).find((it) => it.tipo !== "vacio");

  const encabezados: Encabezado[] = [];
  const usados = new Map<string, number>();
  const salida: string[] = [];

  items.forEach((it, idx) => {
    switch (it.tipo) {
      case "vacio":
        salida.push("");
        return;
      case "crudo":
        salida.push(it.texto);
        return;
      case "linea": {
        const sig = items[idx + 1];
        // Un salto duro al final de un bloque CommonMark sale como "\" literal.
        const cierraBloque = !sig || sig.tipo !== "linea" || sig.abreBloque;
        salida.push(it.salto && !cierraBloque ? `${it.texto}\\` : it.texto);
        return;
      }
      case "encabezado": {
        let nivel: NivelEncabezado;
        if (it.nivelReal !== null) {
          nivel = Math.min(4, Math.max(2, it.nivelReal)) as NivelEncabezado;
        } else {
          const sig = siguienteConContenido(idx);
          nivel = sig?.tipo === "encabezado" && sig.nivelReal === null ? 2 : 3;
        }
        const base = slugificar(it.texto);
        const veces = (usados.get(base) ?? 0) + 1;
        usados.set(base, veces);
        const id = veces === 1 ? base : `${base}-${veces}`;
        encabezados.push({ nivel, texto: it.texto, id });
        salida.push("", `<h${nivel} id="${id}">${escaparHtml(it.texto)}</h${nivel}>`, "");
        return;
      }
    }
  });

  const markdownFinal = salida
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { markdown: `${markdownFinal}\n`, encabezados };
}
