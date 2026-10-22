// Textos sin mecanizar que cuelgan de una tirada (especie §14.10, dotes §9.3): cuáles le tocan a
// una tirada y cómo se pegan a ella. Lo comparten conExtrasDeFicha / conExtrasDirectaDeFicha
// (fichaResuelta.ts) y prepararPoder (usoPoder.ts, D2c-2), para que un texto salga igual en una
// tirada fija, en una de arma o en la de un poder.
import type { Accion } from "./acciones";
import type { TextoEnTirada } from "./especie";
import type { AplicadoId } from "./atributos";
import { alcanzaA, alcanzaAlgunAplicado, type ContextoAccion } from "./modificadores";

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
// cuáles podría tirarse (`aplicadosPosibles`); el de verdad lo pone montarTirada.
export const contextoDe = (
  t: Pick<Accion, "id" | "grupo" | "familiaArma" | "empleoArma" | "desarmado" | "contundente" | "especialidadArma"> &
    Partial<Pick<Accion, "aplicado" | "aplicadoSutil" | "condiciones">> & {
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
  ...(t.especialidadArma && { especialidadArma: t.especialidadArma }),
});

// Por aplicado (A2b): basta con que la tirada pueda tirarse con uno de ellos.
export function textosDe(textos: TextoEnTirada[], ctx: ContextoAccion, desarmado: boolean): TextoEnTirada[] {
  return textos.filter((x) => {
    if (x.en.tipo === "desarmado") return desarmado;
    if (x.en.tipo === "tiradaId") return x.en.id === ctx.id;
    if (x.en.tipo === "aplicado") return alcanzaAlgunAplicado(x.en, ctx);
    return alcanzaA(x.en, ctx);
  });
}

// Si el texto ya empieza por su fuente ("Onda Residual: …", también tras la condición:
// "Cuando X: Impacto Métrico Relámpago: …"), se quita: la fuente va al final. A mitad de
// frase se respeta ("has usado Combinación: −1…").
const escapa = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const sinFuenteRepetida = (texto: string, fuente: string) =>
  texto.replace(new RegExp(`(^|: )${escapa(fuente)}: `), "$1");

const conFuente = (textos: TextoEnTirada[], critico: boolean) =>
  textos.filter((x) => x.soloEnCritico === critico).map((x) => `${sinFuenteRepetida(x.texto, x.fuente)} (${x.fuente})`);

export const junta = (actual: string | undefined, nuevas: string[]) => [actual, ...nuevas].filter(Boolean).join(" · ");

// Los de crítico al texto de crítico; el resto, a la nota. Sin textos, la misma tirada.
export function conTextosEnTirada<T extends Pick<Accion, "nota" | "efectoCritico">>(t: T, textos: TextoEnTirada[]): T {
  const enNota = conFuente(textos, false);
  const enCritico = conFuente(textos, true);
  if (enNota.length === 0 && enCritico.length === 0) return t;
  return {
    ...t,
    ...(enNota.length > 0 && { nota: junta(t.nota, enNota) }),
    ...(enCritico.length > 0 && { efectoCritico: junta(t.efectoCritico, enCritico) }),
  };
}

// Sin dado no hay crítico: todos, como líneas de nota (los normales primero).
export const textosSinDado = (textos: TextoEnTirada[]): string[] => [...conFuente(textos, false), ...conFuente(textos, true)];
