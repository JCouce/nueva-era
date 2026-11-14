"use client";

import { type ReactNode, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { HudCard } from "@/components/HudCard";
import { ChipsEtiquetas } from "@/components/ChipsEtiquetas";
import { useFiltroNpcs } from "@/hooks/useFiltroNpcs";
import { borrarDefinitivoNpcAction, enviarAPapeleraNpcFormAction, restaurarNpcFormAction } from "./actions";

export type NpcDelCatalogo = {
  id: string;
  nombre: string;
  nota: string | null;
  etiquetas: string[];
  poder: number;
  creadoEn: number;
  borradoEn: number | null;
};

const ORDENES = {
  nombre: "Nombre",
  reciente: "Más recientes",
  poder: "Más poder",
} as const;
type Orden = keyof typeof ORDENES;
type Vista = "catalogo" | "papelera";

const fechaCorta = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

// En móvil, una columna: crear, pestañas, filtros y lista. Desde lg, todo lo que va antes de
// la lista pasa a una columna izquierda fija y la lista se hace rejilla; el orden es el mismo.
export function CatalogoNpcs({ npcs, crear }: { npcs: NpcDelCatalogo[]; crear: ReactNode }) {
  const [vista, setVista] = useState<Vista>("catalogo");
  const [orden, setOrden] = useState<Orden>("nombre");

  const vivos = useMemo(() => npcs.filter((n) => n.borradoEn === null), [npcs]);
  const papelera = useMemo(
    () => npcs.filter((n) => n.borradoEn !== null).sort((a, b) => (b.borradoEn ?? 0) - (a.borradoEn ?? 0)),
    [npcs],
  );
  const { busqueda, setBusqueda, recuento, marcada, alternar, limpiar, filtrados, filtrando } = useFiltroNpcs(vivos);
  const visibles = useMemo(
    () =>
      [...filtrados].sort((a, b) => {
        if (orden === "reciente") return b.creadoEn - a.creadoEn;
        if (orden === "poder") return b.poder - a.poder;
        return a.nombre.localeCompare(b.nombre, "es");
      }),
    [filtrados, orden],
  );

  return (
    <div className="lg:grid lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-6">
      <aside className="min-w-0 lg:sticky lg:top-16 lg:max-h-[calc(100dvh-5rem)] lg:self-start lg:overflow-y-auto lg:pr-1">
        {crear}
        <div role="tablist" className="mb-4 flex gap-2 font-mono text-xs uppercase tracking-wide">
          {(
            [
              ["catalogo", `Catálogo (${vivos.length})`],
              ["papelera", `Papelera (${papelera.length})`],
            ] as const
          ).map(([v, etiqueta]) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={vista === v}
              onClick={() => setVista(v)}
              className={`clip-chamfer-sm border px-3 py-2 uppercase ${
                vista === v ? "border-accent text-accent" : "border-border text-muted"
              }`}
            >
              {etiqueta}
            </button>
          ))}
        </div>

        {vista === "papelera" ? (
          <p className="mb-3 font-mono text-[11px] text-muted">
            Los NPCs borrados se guardan aquí hasta que los borres para siempre. No salen en el catálogo ni en el
            combate.
          </p>
        ) : (
          <>
            <div className="mb-3 flex gap-2 lg:flex-col">
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar NPC o etiqueta"
                aria-label="Buscar NPC"
                className="clip-chamfer-sm min-w-0 flex-1 border border-border bg-surface px-4 py-3 text-base outline-none focus:border-accent"
              />
              <select
                value={orden}
                onChange={(e) => setOrden(e.target.value as Orden)}
                aria-label="Ordenar NPCs"
                className="shrink-0 border border-border bg-surface px-2 py-3 font-mono text-xs text-foreground outline-none focus:border-accent lg:py-2"
              >
                {Object.entries(ORDENES).map(([valor, etiqueta]) => (
                  <option key={valor} value={valor}>
                    {etiqueta}
                  </option>
                ))}
              </select>
            </div>

            <ChipsEtiquetas recuento={recuento} marcada={marcada} alternar={alternar} vertical className="mb-3" />

            {vivos.length > 0 && (
              <div className="mb-2 flex items-center justify-between font-mono text-[11px] uppercase tracking-wide text-muted">
                <span>{filtrando ? `${visibles.length} de ${vivos.length}` : `${vivos.length} NPCs`}</span>
                {filtrando && (
                  <button
                    type="button"
                    onClick={limpiar}
                    className="uppercase text-accent"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </aside>

      <section className="min-w-0">
        {vista === "papelera" ? (
          <Papelera npcs={papelera} />
        ) : (
          <ul className="flex flex-col gap-2 lg:grid lg:grid-cols-2 xl:grid-cols-3">
            {visibles.map((npc) => (
              <li key={npc.id}>
                <HudCard className="flex h-full items-center gap-2 px-4 py-3">
                  <Link href={`/master/npcs/${npc.id}`} className="min-w-0 flex-1">
                    <span className="block truncate font-display text-base font-medium uppercase tracking-wide">
                      {npc.nombre}
                    </span>
                    {npc.nota && (
                      <span className="block truncate font-mono text-xs text-muted lg:line-clamp-2 lg:whitespace-normal">
                        {npc.nota}
                      </span>
                    )}
                    {npc.etiquetas.length > 0 && (
                      <span className="mt-1 flex flex-wrap gap-1">
                        {npc.etiquetas.map((e) => (
                          <span key={e} className="border border-border px-1.5 py-0.5 font-mono text-[10px] text-info">
                            {e}
                          </span>
                        ))}
                      </span>
                    )}
                  </Link>
                  <span className="shrink-0 font-mono text-xs tabular-nums text-info">
                    {npc.poder.toFixed(1)} <span className="text-muted">poder</span>
                  </span>
                  <form action={enviarAPapeleraNpcFormAction}>
                    <input type="hidden" name="id" value={npc.id} />
                    <button
                      type="submit"
                      className="shrink-0 px-2 py-1 font-mono text-xs uppercase tracking-wide text-muted transition hover:text-danger"
                      aria-label={`Borrar ${npc.nombre}`}
                    >
                      Borrar
                    </button>
                  </form>
                </HudCard>
              </li>
            ))}
            {vivos.length === 0 && (
              <li className="clip-chamfer border border-dashed border-border px-4 py-8 text-center font-mono text-sm text-muted lg:col-span-full">
                Aún no hay NPCs. Crea el primero.
              </li>
            )}
            {vivos.length > 0 && visibles.length === 0 && (
              <li className="clip-chamfer border border-dashed border-border px-4 py-8 text-center font-mono text-sm text-muted lg:col-span-full">
                Ningún NPC coincide con los filtros.
              </li>
            )}
          </ul>
        )}
      </section>
    </div>
  );
}

function Papelera({ npcs }: { npcs: NpcDelCatalogo[] }) {
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();

  const borrar = (id: string) =>
    startTransition(async () => {
      const res = await borrarDefinitivoNpcAction(id);
      setConfirmando(null);
      setError(res.ok ? null : (res.error ?? "No se pudo borrar."));
    });

  return (
    <>
      {error && <p className="mb-3 font-mono text-xs text-danger">{error}</p>}
      <ul className="flex flex-col gap-2 lg:grid lg:grid-cols-2 xl:grid-cols-3">
        {npcs.map((npc) => (
          <li key={npc.id}>
            <HudCard className="flex h-full flex-col gap-2 px-4 py-3">
              <div className="flex items-baseline gap-2">
                <Link
                  href={`/master/npcs/${npc.id}`}
                  className="min-w-0 flex-1 truncate font-display text-base uppercase tracking-wide text-muted"
                >
                  {npc.nombre}
                </Link>
                {npc.borradoEn !== null && (
                  <span className="shrink-0 font-mono text-[10px] text-muted">{fechaCorta.format(npc.borradoEn)}</span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <form action={restaurarNpcFormAction}>
                  <input type="hidden" name="id" value={npc.id} />
                  <button
                    type="submit"
                    aria-label={`Restaurar ${npc.nombre}`}
                    className="clip-chamfer-sm border border-accent px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide text-accent active:scale-95"
                  >
                    Restaurar
                  </button>
                </form>
                {confirmando === npc.id ? (
                  <>
                    <button
                      type="button"
                      disabled={pendiente}
                      onClick={() => borrar(npc.id)}
                      aria-label={`Confirmar borrar para siempre ${npc.nombre}`}
                      className="clip-chamfer-sm bg-danger px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide text-black active:scale-95"
                    >
                      Sí, borrar para siempre
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmando(null)}
                      className="px-2 py-1.5 font-mono text-[11px] uppercase tracking-wide text-muted"
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmando(npc.id)}
                    aria-label={`Borrar para siempre ${npc.nombre}`}
                    className="clip-chamfer-sm border border-danger px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide text-danger active:scale-95"
                  >
                    Borrar para siempre
                  </button>
                )}
              </div>
            </HudCard>
          </li>
        ))}
        {npcs.length === 0 && (
          <li className="clip-chamfer border border-dashed border-border px-4 py-8 text-center font-mono text-sm text-muted lg:col-span-full">
            La papelera está vacía.
          </li>
        )}
      </ul>
    </>
  );
}
