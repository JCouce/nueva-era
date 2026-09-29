"use client";

import { useRef, useState } from "react";
import { HudCard } from "@/components/HudCard";
import { responderPregunta } from "./actions";

export type PreguntaVista = {
  id: string;
  area: string;
  grupo: string;
  texto: string;
  contexto: string | null;
  respuesta: string;
  respondidaAt: string | null;
};

type Filtro = "pendientes" | "respondidas" | "todas";
type EstadoGuardado = "guardando" | "guardado" | "error";

const AREAS: Record<string, string> = { psionica: "Psiónica" };
const GUARDADO_DEBOUNCE_MS = 700;

const respondida = (texto: string) => texto.trim() !== "";

export function PreguntasLista({ preguntas }: { preguntas: PreguntaVista[] }) {
  const [respuestas, setRespuestas] = useState(() =>
    Object.fromEntries(preguntas.map((p) => [p.id, p.respuesta])),
  );
  const [estados, setEstados] = useState<Record<string, EstadoGuardado>>({});
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [filtro, setFiltro] = useState<Filtro>("pendientes");
  // La lista visible se congela al elegir el filtro: si se recalculara al
  // teclear, una pregunta de "Pendientes" desaparecería a mitad de respuesta.
  const [visibles, setVisibles] = useState(() => idsPara("pendientes", respuestas));
  const temporizadores = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  function idsPara(f: Filtro, r: Record<string, string>) {
    return new Set(
      preguntas
        .filter((p) => f === "todas" || (f === "respondidas") === respondida(r[p.id] ?? ""))
        .map((p) => p.id),
    );
  }

  function elegirFiltro(f: Filtro) {
    setFiltro(f);
    setVisibles(idsPara(f, respuestas));
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
  const cuenta: Record<Filtro, number> = { pendientes: total - hechas, respondidas: hechas, todas: total };

  const mostradas = preguntas.filter((p) => visibles.has(p.id));
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
        <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="Filtrar preguntas">
          {(["pendientes", "respondidas", "todas"] as const).map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={filtro === f}
              onClick={() => elegirFiltro(f)}
              className={`clip-chamfer-sm border px-2 py-2.5 font-display text-sm font-semibold uppercase tracking-wide ${
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
          {filtro === "pendientes" ? "No queda ninguna pendiente. ¡Gracias!" : "Todavía no hay ninguna respondida."}
        </p>
      )}

      {[...grupos].map(([grupo, lista]) => (
        <section key={grupo} className="mt-6">
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-widest text-info">{grupo}</h2>
          <ul className="flex flex-col gap-3">
            {lista.map((p) => {
              const estado = estados[p.id];
              const hecha = respondida(respuestas[p.id] ?? "");
              return (
                <li key={p.id}>
                  <HudCard className={`flex flex-col gap-3 px-4 py-4 ${hecha ? "border-accent" : ""}`}>
                    <p className="text-lg leading-snug">{p.texto}</p>
                    {p.contexto && (
                      <p className="border-l-2 border-border pl-3 text-base text-muted">{p.contexto}</p>
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
                    {estado === "error" && errores[p.id] && (
                      <p className="text-sm text-danger">{errores[p.id]} Vuelve a escribir para reintentar.</p>
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
