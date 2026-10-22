"use client";

import { useRef, useState } from "react";
import { HudCard } from "@/components/HudCard";
import { marcarCorregida, marcarErrata, responderPregunta } from "./actions";

export type PreguntaVista = {
  id: string;
  area: string;
  grupo: string;
  texto: string;
  contexto: string | null;
  recomendada: string | null;
  respuesta: string;
  respondidaAt: string | null;
  errata: boolean;
  corregidaAt: string | null;
};

type Marca = { errata: boolean; corregida: boolean };

type Filtro = "pendientes" | "respondidas" | "todas" | "erratas";
const FILTROS: Filtro[] = ["pendientes", "respondidas", "todas", "erratas"];
type EstadoGuardado = "guardando" | "guardado" | "error";

const AREAS: Record<string, string> = { psionica: "Psiónica", aumentos: "Aumentos" };
const GUARDADO_DEBOUNCE_MS = 700;

const respondida = (texto: string) => texto.trim() !== "";
const RESPUESTA_RECOMENDADA = "De acuerdo con la recomendada: ";

export function PreguntasLista({ preguntas }: { preguntas: PreguntaVista[] }) {
  const [respuestas, setRespuestas] = useState(() =>
    Object.fromEntries(preguntas.map((p) => [p.id, p.respuesta])),
  );
  const [marcas, setMarcas] = useState<Record<string, Marca>>(() =>
    Object.fromEntries(preguntas.map((p) => [p.id, { errata: p.errata, corregida: p.corregidaAt !== null }])),
  );
  const [estados, setEstados] = useState<Record<string, EstadoGuardado>>({});
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [filtro, setFiltro] = useState<Filtro>("pendientes");
  // La lista visible se congela al elegir el filtro: si se recalculara al
  // teclear, una pregunta de "Pendientes" desaparecería a mitad de respuesta
  // (y una errata recién tachada saltaría al final mientras la miras).
  const [visibles, setVisibles] = useState(() => idsPara("pendientes", respuestas, marcas));
  const temporizadores = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  function idsPara(f: Filtro, r: Record<string, string>, m: Record<string, Marca>) {
    const lista = preguntas.filter((p) =>
      f === "todas" ? true : f === "erratas" ? m[p.id]?.errata : (f === "respondidas") === respondida(r[p.id] ?? ""),
    );
    // En Erratas, las corregidas al final (sort es estable: dentro de cada bloque, el orden de siempre).
    if (f === "erratas") lista.sort((a, b) => Number(m[a.id].corregida) - Number(m[b.id].corregida));
    return lista.map((p) => p.id);
  }

  function elegirFiltro(f: Filtro) {
    setFiltro(f);
    setVisibles(idsPara(f, respuestas, marcas));
  }

  async function cambiarMarca(id: string, accion: "errata" | "corregida", valor: boolean) {
    const antes = marcas[id];
    setMarcas((m) => ({ ...m, [id]: accion === "errata" ? { errata: valor, corregida: valor && antes.corregida } : { ...antes, corregida: valor } }));
    const res = accion === "errata" ? await marcarErrata(id, valor) : await marcarCorregida(id, valor);
    if (res.ok) {
      setMarcas((m) => ({ ...m, [id]: { errata: res.errata, corregida: res.corregidaAt !== null } }));
      setErrores((e) => ({ ...e, [id]: "" }));
    } else {
      setMarcas((m) => ({ ...m, [id]: antes }));
      setErrores((e) => ({ ...e, [id]: res.error }));
    }
  }

  async function guardar(id: string, texto: string) {
    clearTimeout(temporizadores.current[id]);
    delete temporizadores.current[id];
    setEstados((e) => ({ ...e, [id]: "guardando" }));
    const res = await responderPregunta(id, texto);
    setEstados((e) => ({ ...e, [id]: res.ok ? "guardado" : "error" }));
    setErrores((e) => ({ ...e, [id]: res.ok ? "" : res.error }));
  }

  function cambiar(id: string, texto: string) {
    setRespuestas((r) => ({ ...r, [id]: texto }));
    clearTimeout(temporizadores.current[id]);
    temporizadores.current[id] = setTimeout(() => guardar(id, texto), GUARDADO_DEBOUNCE_MS);
  }

  const total = preguntas.length;
  const hechas = preguntas.filter((p) => respondida(respuestas[p.id] ?? "")).length;
  const erratas = preguntas.filter((p) => marcas[p.id]?.errata);
  const corregidas = erratas.filter((p) => marcas[p.id].corregida).length;
  const cuenta: Record<Filtro, string> = {
    pendientes: String(total - hechas),
    respondidas: String(hechas),
    todas: String(total),
    erratas: `${corregidas}/${erratas.length}`,
  };

  const porId = new Map(preguntas.map((p) => [p.id, p]));
  const mostradas = visibles.flatMap((id) => porId.get(id) ?? []);
  const grupos = new Map<string, PreguntaVista[]>();
  for (const p of mostradas) {
    const clave = `${AREAS[p.area] ?? p.area} · ${p.grupo}`;
    grupos.set(clave, [...(grupos.get(clave) ?? []), p]);
  }

  if (total === 0) {
    return <p className="mt-8 text-center text-muted">No hay preguntas abiertas ahora mismo.</p>;
  }

  return (
    <>
      <div className="sticky top-0 z-10 -mx-4 mt-4 border-b border-border bg-background px-4 pb-3 pt-3">
        <div className="mb-3 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden bg-border" aria-hidden="true">
            <div className="h-full bg-accent transition-[width]" style={{ width: `${(100 * hechas) / total}%` }} />
          </div>
          <span className="shrink-0 font-mono text-sm tabular-nums text-muted">
            {hechas}/{total}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-1.5" role="tablist" aria-label="Filtrar preguntas">
          {FILTROS.map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={filtro === f}
              onClick={() => elegirFiltro(f)}
              className={`clip-chamfer-sm flex flex-col items-center border px-1 py-2 font-display text-xs font-semibold uppercase tracking-wide ${
                filtro === f ? "border-accent bg-accent text-black" : "border-border bg-surface text-foreground"
              }`}
            >
              {f} <span className="font-mono text-xs tabular-nums">{cuenta[f]}</span>
            </button>
          ))}
        </div>
      </div>

      {mostradas.length === 0 && (
        <p className="mt-8 text-center text-muted">
          {filtro === "pendientes"
            ? "No queda ninguna pendiente. ¡Gracias!"
            : filtro === "erratas"
              ? "No hay ninguna errata marcada."
              : "Todavía no hay ninguna respondida."}
        </p>
      )}

      {[...grupos].map(([grupo, lista]) => (
        <section key={grupo} className="mt-6">
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-widest text-info">{grupo}</h2>
          <ul className="flex flex-col gap-3">
            {lista.map((p) => {
              const estado = estados[p.id];
              const hecha = respondida(respuestas[p.id] ?? "");
              const marca = marcas[p.id];
              return (
                <li key={p.id}>
                  <HudCard className={`flex flex-col gap-3 px-4 py-4 ${hecha ? "border-accent" : ""}`}>
                    <div className="flex items-center justify-between gap-2">
                      {marca.errata ? (
                        <span className="border border-glitch px-1.5 py-0.5 font-mono text-xs uppercase text-neon-magenta">Errata</span>
                      ) : (
                        <span />
                      )}
                      <button
                        type="button"
                        aria-pressed={marca.errata}
                        onClick={() => cambiarMarca(p.id, "errata", !marca.errata)}
                        className="min-h-9 px-2 font-mono text-xs uppercase text-muted underline-offset-2 hover:underline"
                      >
                        {marca.errata ? "Quitar errata" : "Es errata"}
                      </button>
                    </div>
                    <p className={`text-lg leading-snug ${marca.corregida ? "text-muted line-through" : ""}`}>{p.texto}</p>
                    {marca.errata && (
                      <label className="flex min-h-9 items-center gap-2 font-mono text-sm uppercase">
                        <input
                          type="checkbox"
                          checked={marca.corregida}
                          onChange={(e) => cambiarMarca(p.id, "corregida", e.target.checked)}
                          className="size-5 accent-accent"
                        />
                        Corregida
                      </label>
                    )}
                    {p.contexto && (
                      <p className="whitespace-pre-line border-l-2 border-border pl-3 text-base text-muted">{p.contexto}</p>
                    )}
                    {p.recomendada && !hecha && (
                      <div className="flex flex-col gap-2 border border-border bg-background px-3 py-3">
                        <p className="text-base">
                          <span className="font-mono text-xs uppercase text-info">Recomendada </span>
                          {p.recomendada}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            const texto = RESPUESTA_RECOMENDADA + p.recomendada;
                            setRespuestas((r) => ({ ...r, [p.id]: texto }));
                            guardar(p.id, texto);
                          }}
                          className="clip-chamfer-sm min-h-11 self-start border border-accent px-4 font-display text-sm font-semibold uppercase tracking-wide text-accent"
                        >
                          Vale esta
                        </button>
                      </div>
                    )}
                    <label className="flex flex-col gap-1.5">
                      <span className="flex items-center justify-between font-mono text-xs uppercase text-muted">
                        Respuesta
                        <span
                          aria-live="polite"
                          className={estado === "error" ? "text-danger" : estado === "guardado" ? "text-accent" : ""}
                        >
                          {estado === "guardando" ? "Guardando…" : estado === "guardado" ? "Guardado" : estado === "error" ? "No se guardó" : ""}
                        </span>
                      </span>
                      <textarea
                        id={`respuesta-${p.id}`}
                        value={respuestas[p.id] ?? ""}
                        onChange={(e) => cambiar(p.id, e.target.value)}
                        onBlur={(e) => {
                          if (temporizadores.current[p.id]) guardar(p.id, e.target.value);
                        }}
                        rows={3}
                        maxLength={4000}
                        className="clip-chamfer-sm w-full resize-y border border-border bg-background px-3 py-3 text-base outline-none focus:border-accent"
                      />
                    </label>
                    {errores[p.id] && (
                      <p className="text-sm text-danger">
                        {errores[p.id]} {estado === "error" ? "Vuelve a escribir para reintentar." : ""}
                      </p>
                    )}
                  </HudCard>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}
