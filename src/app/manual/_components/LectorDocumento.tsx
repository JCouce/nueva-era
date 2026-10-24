"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Encabezado } from "@/lib/manual/encabezados";

// Barra fija del documento: buscador (resalta coincidencias y salta entre ellas) e
// índice plegable de encabezados. El resaltado usa la CSS Custom Highlight API, que no
// toca el DOM que pinta el servidor; sin ella, el salto sigue funcionando.

const MAX_COINCIDENCIAS = 500;
const RESALTE = "manual-busqueda";
const RESALTE_ACTUAL = "manual-actual";

// Aquí y no en globals.css: Lightning CSS (el build de Next) no reconoce ::highlight y
// avisa en cada build, aunque lo deja pasar.
const ESTILOS_RESALTE = `
::highlight(${RESALTE}) {
  background-color: color-mix(in oklab, var(--color-info) 30%, transparent);
  color: var(--color-foreground);
}
::highlight(${RESALTE_ACTUAL}) {
  background-color: var(--color-accent);
  color: var(--color-night);
}`;

// Minúsculas sin tildes, carácter a carácter para no descuadrar los offsets.
function plegar(texto: string): string {
  let salida = "";
  for (const c of texto) {
    const base = c.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
    salida += base.length === c.length ? base : c.length === 1 ? (base[0] ?? c) : c;
  }
  return salida;
}

function buscarRangos(raiz: HTMLElement, consulta: string): Range[] {
  const aguja = plegar(consulta.trim());
  if (aguja.length < 2) return [];
  const rangos: Range[] = [];
  const paseo = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
  for (let nodo = paseo.nextNode(); nodo; nodo = paseo.nextNode()) {
    const padre = nodo.parentElement;
    // Las cabeceras de tabla se ocultan en modo ficha: no cuentan como coincidencia.
    if (!padre || (padre.checkVisibility && !padre.checkVisibility())) continue;
    const pajar = plegar(nodo.textContent ?? "");
    for (let i = pajar.indexOf(aguja); i !== -1; i = pajar.indexOf(aguja, i + aguja.length)) {
      const r = document.createRange();
      r.setStart(nodo, i);
      r.setEnd(nodo, i + aguja.length);
      rangos.push(r);
      if (rangos.length >= MAX_COINCIDENCIAS) return rangos;
    }
  }
  return rangos;
}

function pintarResaltes(todos: Range[], actual: Range | undefined) {
  if (typeof CSS === "undefined" || !("highlights" in CSS)) return;
  CSS.highlights.delete(RESALTE);
  CSS.highlights.delete(RESALTE_ACTUAL);
  if (todos.length) CSS.highlights.set(RESALTE, new Highlight(...todos));
  if (actual) CSS.highlights.set(RESALTE_ACTUAL, new Highlight(actual));
}

function irA(rango: Range) {
  const caja = rango.getBoundingClientRect();
  window.scrollTo({ top: caja.top + window.scrollY - window.innerHeight / 3, behavior: "smooth" });
}

export function LectorDocumento({
  encabezados,
  children,
}: {
  encabezados: Encabezado[];
  children: ReactNode;
}) {
  const contenido = useRef<HTMLDivElement>(null);
  const [consulta, setConsulta] = useState("");
  const [rangos, setRangos] = useState<Range[]>([]);
  const [actual, setActual] = useState(0);
  const [indiceAbierto, setIndiceAbierto] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      const raiz = contenido.current;
      if (!raiz) return;
      const encontrados = buscarRangos(raiz, consulta);
      setRangos(encontrados);
      setActual(0);
      pintarResaltes(encontrados, encontrados[0]);
      if (encontrados[0]) irA(encontrados[0]);
    }, 250);
    return () => clearTimeout(t);
  }, [consulta]);

  useEffect(() => () => pintarResaltes([], undefined), []);

  const saltar = useCallback(
    (paso: number) => {
      if (!rangos.length) return;
      const siguiente = (actual + paso + rangos.length) % rangos.length;
      setActual(siguiente);
      pintarResaltes(rangos, rangos[siguiente]);
      irA(rangos[siguiente]);
    },
    [actual, rangos],
  );

  const encabezadosVisibles = useMemo(() => {
    const aguja = plegar(consulta.trim());
    if (aguja.length < 2) return encabezados;
    return encabezados.filter((e) => plegar(e.texto).includes(aguja));
  }, [consulta, encabezados]);

  const hayConsulta = plegar(consulta.trim()).length >= 2;

  return (
    <>
      <style href="manual-resaltes" precedence="default">
        {ESTILOS_RESALTE}
      </style>
      <div className="sticky top-[49px] z-[5] -mx-4 border-b border-border bg-background/95 px-4 py-2 backdrop-blur">
        <div className="flex items-center gap-2">
          <input
            type="search"
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                saltar(e.shiftKey ? -1 : 1);
              }
            }}
            placeholder="Buscar en el documento"
            enterKeyHint="search"
            aria-label="Buscar en el documento"
            className="clip-chamfer-sm min-w-0 flex-1 border border-border bg-surface px-3 py-2 text-base outline-none focus:border-accent"
          />
          {hayConsulta && (
            <>
              <span className="shrink-0 font-mono text-xs text-muted" aria-live="polite">
                {rangos.length ? `${actual + 1}/${rangos.length}` : "0"}
              </span>
              <button
                type="button"
                onClick={() => saltar(-1)}
                disabled={!rangos.length}
                aria-label="Coincidencia anterior"
                className="clip-chamfer-sm shrink-0 border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground disabled:opacity-40"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => saltar(1)}
                disabled={!rangos.length}
                aria-label="Coincidencia siguiente"
                className="clip-chamfer-sm shrink-0 border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground disabled:opacity-40"
              >
                ▼
              </button>
            </>
          )}
          {encabezados.length > 0 && (
            <button
              type="button"
              onClick={() => setIndiceAbierto((v) => !v)}
              aria-expanded={indiceAbierto}
              className={`clip-chamfer-sm shrink-0 border px-3 py-2 font-mono text-xs uppercase tracking-wide ${
                indiceAbierto ? "border-accent text-accent" : "border-border bg-surface text-foreground"
              }`}
            >
              Índice
            </button>
          )}
        </div>

        {indiceAbierto && (
          <nav
            aria-label="Índice del documento"
            className="mt-2 max-h-[60vh] overflow-y-auto border-t border-border pt-2"
          >
            {encabezadosVisibles.length === 0 ? (
              <p className="py-2 font-mono text-xs text-muted">Ningún apartado coincide.</p>
            ) : (
              <ul className="flex flex-col">
                {encabezadosVisibles.map((e) => (
                  <li key={e.id}>
                    <a
                      href={`#${e.id}`}
                      onClick={() => setIndiceAbierto(false)}
                      className={`block py-1.5 ${
                        e.nivel === 2
                          ? "font-display text-sm font-semibold uppercase tracking-wide text-accent"
                          : e.nivel === 3
                            ? "pl-3 text-base text-foreground"
                            : "pl-6 text-sm text-soft"
                      }`}
                    >
                      {e.texto}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </nav>
        )}
      </div>

      <div ref={contenido}>{children}</div>
    </>
  );
}
