// Los textos de una tirada con su momento (fase 4 de docs/aportes/plan.md, §1.6; pl-05 del
// cuestionario de cierre). Criterio del usuario: lo que se usa al tirar sale antes de la tirada;
// lo que salta con el resultado o con el daño, después. El resultado los enseña todos.
//
//   nota de la tirada                    ambos
//   tipo de acción (T5c: desenfundar…)   ambos, con la pieza o dote que lo rebaja de origen
//   textos de ítem sin grado             ambos (como la nota: se leen al decidir)
//   texto de crítico / crítico natural   después, con ese grado
//   textos de ítem con grado             después, con ese grado (Tras esquivar: con éxito)
//   efectos (para otra tirada o tercero) después; en un ataque, con el daño tirado
//   notas de casillas marcadas           antes (se leen bajo la casilla)
//   notas de resolución de la montada    después (crítico fijo, fallo crítico, sube grado)
//
// Lo que el resultado ya pinta en bloque propio no pasa por aquí: «El objetivo» (efectos sobre el
// objetivo, T3a-T3b), «Tú» (salvación propia, T3c), el texto por grado de un poder y lo que tira
// su objetivo, y los estados que guarda la app (T4).
import type { Accion, Resultado } from "./acciones";
import type { NotaMontada } from "./condiciones";
import type { TextoEnTirada } from "./especie";
import { claveOrigen, type OrigenAporte } from "./origen";
import { resolverTiposDeAccion, textoTipoAccion } from "./tipoAccion";

export type MomentoTexto = "antes" | "despues" | "ambos";
export type GradoTexto = "exito" | "critico" | "criticoNatural" | "fallo";

// `fuente`: cómo se nombra el ítem al ir en línea con la nota («… (Bloqueo)»), como hasta ahora.
// `etiqueta`: la casilla o el efecto que lo trae, si no es el ítem mismo.
// `conDanio`: solo con el daño ya tirado (los efectos de un ataque: hasta entonces no se sabe si
// el golpe entra).
export type TextoDeTirada = {
  texto: string;
  origen: OrigenAporte;
  momento: MomentoTexto;
  grado?: GradoTexto;
  fuente?: string;
  etiqueta?: string;
  conDanio?: true;
};

export type TiradaConTextos = Pick<Accion, "id" | "label"> &
  Partial<
    Pick<
      Accion,
      "origen" | "nota" | "efectoCritico" | "efectoCriticoNatural" | "efectos" | "textosDeFicha" | "ataque" | "tiposDeAccion" | "tiposDeAccionBase"
    >
  >;

// La propia tirada como origen: el ítem que la crea (arma, dote, poder…) o, si es de catálogo, ella.
export const origenDeTirada = (t: Pick<Accion, "id" | "label" | "origen">): OrigenAporte =>
  t.origen ?? { tipo: "accion", id: t.id, label: t.label };

// Si el texto ya empieza por su fuente ("Onda Residual: …", también tras la condición:
// "Cuando X: Impacto Métrico Relámpago: …"), se quita: la fuente va al final. A mitad de
// frase se respeta ("has usado Combinación: −1…").
const escapa = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export const sinFuenteRepetida = (texto: string, fuente: string) => texto.replace(new RegExp(`(^|: )${escapa(fuente)}: `), "$1");

const gradoDeFicha = (x: TextoEnTirada): GradoTexto | undefined =>
  x.soloEnCritico ? (x.soloEnCriticoNatural ? "criticoNatural" : "critico") : x.grado;

function deFicha(x: TextoEnTirada, propio: OrigenAporte): TextoDeTirada {
  const grado = gradoDeFicha(x);
  return {
    texto: sinFuenteRepetida(x.texto, x.fuente),
    origen: x.origen ?? propio,
    momento: grado ? "despues" : "ambos",
    ...(grado && { grado }),
    fuente: x.fuente,
  };
}

// Todos los textos de una tirada (ya con los de la ficha: conExtrasDeFicha, prepararPoder) y, con
// la tirada montada, los de sus casillas marcadas. En el orden en que se leían antes: nota y textos
// de ítem; crítico; crítico natural; con grado; efectos; casillas.
export function textosDeTirada(t: TiradaConTextos, notas: readonly NotaMontada[] = []): TextoDeTirada[] {
  const propio = origenDeTirada(t);
  const deFichaCon = (grado: GradoTexto | undefined) =>
    (t.textosDeFicha ?? []).filter((x) => gradoDeFicha(x) === grado).map((x) => deFicha(x, propio));
  const propioCon = (texto: string | undefined, grado: GradoTexto): TextoDeTirada[] =>
    texto ? [{ texto, origen: propio, momento: "despues", grado }] : [];
  // Sin pasar por conExtrasDeFicha (sin ficha), el tipo de la fuente con las rebajas de la fila.
  const tipos = t.tiposDeAccion ?? resolverTiposDeAccion(t.tiposDeAccionBase, []);
  return [
    ...(t.nota ? [{ texto: t.nota, origen: propio, momento: "ambos" as const }] : []),
    ...tipos.map(
      (x): TextoDeTirada => ({
        texto: textoTipoAccion(x),
        origen: x.fuentes[0]?.origen ?? propio,
        momento: "ambos",
        ...(x.fuentes.length > 0 && { fuente: x.fuentes.map((f) => f.fuente).join(", ") }),
      }),
    ),
    ...deFichaCon(undefined),
    ...propioCon(t.efectoCritico, "critico"),
    ...deFichaCon("critico"),
    ...propioCon(t.efectoCriticoNatural, "criticoNatural"),
    ...deFichaCon("criticoNatural"),
    ...deFichaCon("exito"),
    ...deFichaCon("fallo"),
    ...(t.efectos ?? []).map((e): TextoDeTirada => {
      const origen = e.origen ?? propio;
      return {
        texto: e.texto,
        origen,
        momento: "despues",
        ...(e.fuente !== origen.label && { etiqueta: e.fuente }),
        ...(t.ataque && { conDanio: true as const }),
      };
    }),
    ...notas.map(
      (n): TextoDeTirada => ({ texto: n.nota, origen: n.origen ?? propio, momento: n.momento, etiqueta: n.etiqueta }),
    ),
  ];
}

// Lo que se enseña antes de tirar (la fila y el modal sin resultado).
export const textosAntes = (textos: readonly TextoDeTirada[]): TextoDeTirada[] => textos.filter((x) => x.momento !== "despues");

// Sin dificultad no hay grado: los textos con grado salen igual, con su grado a la vista, para que
// el jugador los aplique cuando el máster diga cómo ha ido.
function cumpleGrado(grado: GradoTexto | undefined, r: Pick<Resultado, "exito" | "critico" | "criticoNatural">): boolean {
  if (!grado || r.exito === null) return true;
  switch (grado) {
    case "exito":
      return r.exito;
    case "fallo":
      return !r.exito;
    case "critico":
      return r.exito && r.critico;
    case "criticoNatural":
      return r.exito && r.criticoNatural === true;
  }
}

// Todo lo que aplica a un resultado: los de antes y los de después que casen con su grado. Los
// que van con el daño, solo cuando ya está tirado (`danioPendiente`: hay daño y aún no se ha tirado).
export function textosDelResultado(
  textos: readonly TextoDeTirada[],
  r: Pick<Resultado, "exito" | "critico" | "criticoNatural">,
  danioPendiente = false,
): TextoDeTirada[] {
  return textos.filter((x) => !(x.conDanio && danioPendiente) && cumpleGrado(x.grado, r));
}

// Agrupados por el ítem que los trae, en el orden en que aparece cada uno.
export function textosPorOrigen(textos: readonly TextoDeTirada[]): { origen: OrigenAporte; textos: TextoDeTirada[] }[] {
  const grupos = new Map<string, { origen: OrigenAporte; textos: TextoDeTirada[] }>();
  for (const x of textos) {
    const clave = claveOrigen(x.origen);
    const grupo = grupos.get(clave) ?? { origen: x.origen, textos: [] };
    grupo.textos.push(x);
    grupos.set(clave, grupo);
  }
  return [...grupos.values()];
}

// En una línea, como se leía la nota: "nota · texto (fuente) · …".
export const enLinea = (textos: readonly TextoDeTirada[]): string =>
  textos.map((x) => (x.fuente ? `${x.texto} (${x.fuente})` : x.texto)).join(" · ");

export const ETIQUETA_GRADO_TEXTO: Record<GradoTexto, string> = {
  exito: "con éxito",
  critico: "éxito crítico",
  criticoNatural: "crítico natural",
  fallo: "con fallo",
};

// La línea de antes de tirar, como la fila y el modal la enseñan (la nota de siempre, sin lo que
// solo vale con el resultado).
export const lineaAntes = (t: TiradaConTextos): string => enLinea(textosAntes(textosDeTirada(t)));

// Los de un grado, en una línea (lo que antes era el texto de crítico de la tirada).
export const lineaDeGrado = (t: TiradaConTextos, grado: GradoTexto): string =>
  enLinea(textosDeTirada(t).filter((x) => x.grado === grado));
