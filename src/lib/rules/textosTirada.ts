// Textos sin mecanizar que cuelgan de una tirada (especie §14.10, dotes §9.3): cuáles le tocan a
// una tirada y cómo se cuelgan de ella. Lo comparten conExtrasDeFicha / conExtrasDirectaDeFicha
// (fichaResuelta.ts) y prepararPoder (usoPoder.ts, D2c-2), para que un texto salga igual en una
// tirada fija, en una de arma o en la de un poder.
import { especialidadesDeTirada, type Accion } from "./acciones";
import type { TextoEnTirada } from "./especie";
import type { AplicadoId } from "./atributos";
import { alcanzaA, alcanzaAlgunAplicado, type ContextoAccion } from "./modificadores";
import type { EfectoEnTirada } from "./efectosArma";
import { sinFuenteRepetida } from "./textosDeTirada";

// Un efecto sobre el objetivo que la ficha cuelga de una tirada (dotes, T3b), con el mismo
// destino que un texto: va a `efectosObjetivoDeFicha` de las tiradas que casen.
export type ObjetivoEnTirada = { en: TextoEnTirada["en"]; efecto: EfectoEnTirada };

// Los aplicados con los que puede tirarse la tirada: el suyo, el de Sutil y el de cualquier
// casilla que lo cambie (Negociación Analítica). Sin repetidos.
export function aplicadosPosibles(t: Partial<Pick<Accion, "aplicado" | "aplicadoSutil" | "condiciones">>): AplicadoId[] {
  const todos = [
    t.aplicado,
    t.aplicadoSutil,
    ...(t.condiciones ?? []).map((c) => (c.tipo === "toggle" ? c.aplicado : undefined)),
  ].filter((a): a is AplicadoId => a !== undefined);
  return [...new Set(todos)];
}

// `modoElegido: null`: la tirada aún no se ha abierto, así que una casilla con alcance "modo" no
// tiene nada que casar (ver indiceDeCondiciones). Por lo mismo, del aplicado solo se sabe con
// cuáles podría tirarse (`aplicadosPosibles`), y de la especialidad, también las candidatas
// de Convencer (`especialidadAElegir`); lo de verdad lo pone montarTirada.
export const contextoDe = (
  t: Pick<Accion, "id" | "grupo" | "familiaArma" | "empleoArma" | "desarmado" | "contundente" | "especialidadArma"> &
    Partial<
      Pick<
        Accion,
        "aplicado" | "aplicadoSutil" | "condiciones" | "especialidadesAccion" | "especialidadAElegir" | "mediaFuerza" | "sinPenalizadorDesarmado"
      >
    > & {
      habilidad: Accion["habilidad"];
    },
): ContextoAccion => ({
  id: t.id,
  grupo: t.grupo,
  habilidad: t.habilidad,
  modoElegido: null,
  ...(t.aplicado && { aplicado: t.aplicado, aplicadosPosibles: aplicadosPosibles(t) }),
  ...(t.familiaArma && { familiaArma: t.familiaArma }),
  ...(t.empleoArma && { empleoArma: t.empleoArma }),
  ...(t.desarmado && { desarmado: true }),
  ...(t.contundente && { contundente: true }),
  ...(t.mediaFuerza && { mediaFuerza: true }),
  ...(t.sinPenalizadorDesarmado && { sinPenalizadorDesarmado: true }),
  ...(t.especialidadArma && { especialidadArma: t.especialidadArma }),
  especialidades: especialidadesDeTirada(t, true),
});

// Por aplicado (A2b): basta con que la tirada pueda tirarse con uno de ellos.
// También los efectos sobre el objetivo, con el mismo destino.
export function textosDe<T extends Pick<TextoEnTirada, "en">>(textos: T[], ctx: ContextoAccion, desarmado: boolean): T[] {
  return textos.filter((x) => {
    if (x.en.tipo === "desarmado") return desarmado;
    if (x.en.tipo === "tiradaId") return x.en.id === ctx.id;
    if (x.en.tipo === "aplicado") return alcanzaAlgunAplicado(x.en, ctx);
    return alcanzaA(x.en, ctx);
  });
}

const conFuente = (textos: TextoEnTirada[], critico: boolean, natural = false) =>
  textos
    .filter((x) => x.soloEnCritico === critico && (x.soloEnCriticoNatural ?? false) === natural)
    .map((x) => `${sinFuenteRepetida(x.texto, x.fuente)} (${x.fuente})`);

export const junta = (actual: string | undefined, nuevas: string[]) => [actual, ...nuevas].filter(Boolean).join(" · ");

// Los textos de ítem que tocan a una tirada con dado van a `textosDeFicha`, con su origen y su
// grado; cuándo se enseña cada uno lo decide textosDeTirada (textosDeTirada.ts, fase 4). Sin
// textos, la misma tirada.
export function conTextosDeFicha<T extends Partial<Pick<Accion, "textosDeFicha">>>(t: T, textos: TextoEnTirada[]): T {
  return textos.length === 0 ? t : { ...t, textosDeFicha: [...(t.textosDeFicha ?? []), ...textos] };
}

// Sin dado no hay resultado: todos, como líneas de nota (los normales primero).
export const textosSinDado = (textos: TextoEnTirada[]): string[] => [
  ...conFuente(textos, false),
  ...conFuente(textos, true),
  ...conFuente(textos, true, true),
];
