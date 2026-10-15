"use client";

import { Fragment, useState, type ReactNode } from "react";
import {
  CONTEXTO_LIBRE,
  SECCIONES_DOTES,
  dotePorId,
  dotesConRequisitoRoto,
  estadoRequisitos,
  etiquetaDote,
  motivoNoComprable,
  motivoNoQuitable,
  opcionesDeEleccion,
  presupuestoDotes,
  puntosDotesDisponibles,
  textoPuntos,
  type DoteCatalogo,
  type DoteComprada,
  type FichaResuelta,
} from "@/lib/rules";
import { HudCard } from "@/components/HudCard";

// Dotes (docs/sistema.md §9, tanda D1): comprar y quitar, sin efectos todavía. En
// creación gasta el pool de la letra de Dotes; aprobada, XP al mismo coste y nada se
// vende. Toda regla sale de @/lib/rules (las mismas funciones que usa el servidor):
// aquí solo se pinta el porqué de cada botón deshabilitado.
//
// `libre`: editor de NPC del máster (§9.4). Sin pool, XP ni coste; los requisitos se
// ven (✓/✗) pero no bloquean, sin marca de "requisito no cumplido", y quitar siempre.
export function DotesTab({
  ficha,
  aprobada = false,
  xp = 0,
  foto = null,
  libre = false,
  error,
  onComprar,
  onQuitar,
}: {
  ficha: FichaResuelta;
  aprobada?: boolean;
  xp?: number;
  foto?: DoteComprada[] | null;
  libre?: boolean;
  error: string | null;
  onComprar: (entrada: DoteComprada) => void;
  onQuitar: (entrada: DoteComprada) => void;
}) {
  const sheet = ficha.ficha;
  const letra = sheet.prioridades.dotes;
  const disponible = aprobada ? xp : puntosDotesDisponibles(sheet);
  const ctxCompra = libre ? CONTEXTO_LIBRE : { valores: ficha.requisitosDotes, aprobada, xp };
  const ctxQuitar = libre ? CONTEXTO_LIBRE : { aprobada, foto };
  const rotas = libre ? [] : dotesConRequisitoRoto(sheet, ficha.requisitosDotes);
  const unidad = aprobada ? "xp" : "pts";
  const sePuedeQuitar = libre || !aprobada;

  return (
    <div className="flex flex-col gap-2">
      {libre ? (
        <p className="font-mono text-[10px] leading-relaxed text-muted">
          NPC: el máster pone y quita dotes a mano, sin requisitos ni coste. Los requisitos se enseñan solo como
          referencia.
        </p>
      ) : (
        <>
          <div className="mb-1 flex items-center justify-between border-y border-border py-2 font-mono text-xs">
            <span className="uppercase tracking-wide text-muted">{aprobada ? "XP" : "Puntos"}</span>
            <span className={`tabular-nums ${disponible < 0 ? "text-danger" : letra || aprobada ? "text-accent" : "text-muted"}`}>
              {aprobada
                ? disponible
                : letra
                  ? `${textoPuntos(disponible)} / ${textoPuntos(presupuestoDotes(sheet))} (letra ${letra})`
                  : "sin letra"}
            </span>
          </div>

          {!letra && !aprobada && (
            <p className="font-mono text-[11px] leading-relaxed text-muted">
              Asigna una letra de prioridad a Dotes en Personaje → Prioridades para saber cuántos puntos tienes aquí.
            </p>
          )}
          <p className="font-mono text-[10px] leading-relaxed text-muted">
            {aprobada
              ? "Ficha en juego: las dotes se compran con XP, al mismo coste, y ya no se venden."
              : "Lo que sobre del pool al aprobar la ficha se pierde. Algunas dotes ya ponen casillas, bonos o notas en Acciones; el resto, de momento, es texto."}
          </p>
        </>
      )}
      {error && <p className="font-mono text-[11px] uppercase tracking-wide text-danger">{error}</p>}

      <section className="flex flex-col gap-2">
        <h2 className="mt-2 border-b border-border pb-1 font-display text-sm font-semibold uppercase tracking-wide text-muted">
          {libre ? "Dotes del NPC" : "Tus dotes"}
        </h2>
        {sheet.dotes.length === 0 && <p className="font-mono text-[11px] text-muted">Todavía ninguna.</p>}
        {sheet.dotes.map((d) => {
          const dote = dotePorId(d.id);
          if (!dote) return null;
          const rota = rotas.find((r) => r.dote === d);
          const motivo = motivoNoQuitable(sheet, d, ctxQuitar);
          return (
            <HudCard key={`${d.id}:${d.eleccion ?? ""}`} className={`p-3 ${rota ? "!border-danger" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="block font-display text-base font-semibold uppercase leading-tight">
                    {etiquetaDote(dote, d.eleccion)}
                  </span>
                  {!libre && <span className="mt-1 block font-mono text-[10px] uppercase text-muted">{dote.coste} pts</span>}
                  {rota && (
                    <span className="mt-1 block font-mono text-[10px] uppercase text-danger">
                      requisito no cumplido: {rota.faltan.join(", ")}
                    </span>
                  )}
                </div>
                {sePuedeQuitar && (
                  <button
                    type="button"
                    onClick={() => onQuitar(d)}
                    disabled={motivo !== null}
                    className="clip-chamfer-sm shrink-0 border border-danger px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-danger active:scale-95 disabled:border-border disabled:text-muted"
                  >
                    Quitar
                  </button>
                )}
              </div>
              {motivo && sePuedeQuitar && <p className="mt-1 font-mono text-[10px] leading-relaxed text-muted">{motivo}</p>}
              <TextoPlegable texto={dote.texto} />
            </HudCard>
          );
        })}
      </section>

      {SECCIONES_DOTES.map((s) => (
        <Seccion key={s.clave} label={s.label} total={s.dotes.length}>
          {s.dotes.map((dote) => (
            <TarjetaDote
              key={dote.id}
              dote={dote}
              ficha={ficha}
              unidad={unidad}
              libre={libre}
              comprable={(eleccion) => motivoNoComprable(sheet, { id: dote.id, eleccion }, ctxCompra)}
              onComprar={onComprar}
            />
          ))}
        </Seccion>
      ))}
    </div>
  );
}

function Seccion({ label, total, children }: { label: string; total: number; children: ReactNode }) {
  const [abierta, setAbierta] = useState(false);
  return (
    <section className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setAbierta((v) => !v)}
        aria-expanded={abierta}
        className="mt-2 flex items-center justify-between border-b border-border pb-1 text-left"
      >
        <span className="font-display text-sm font-semibold uppercase tracking-wide text-muted">{label}</span>
        <span className="font-mono text-[10px] text-muted">
          {total} <span className={`inline-block transition-transform ${abierta ? "rotate-180" : ""}`}>▾</span>
        </span>
      </button>
      {abierta && children}
    </section>
  );
}

function TarjetaDote({
  dote,
  ficha,
  unidad,
  libre,
  comprable,
  onComprar,
}: {
  dote: DoteCatalogo;
  ficha: FichaResuelta;
  unidad: string;
  libre: boolean;
  comprable: (eleccion: string | undefined) => string | null;
  onComprar: (entrada: DoteComprada) => void;
}) {
  const sheet = ficha.ficha;
  const [eleccion, setEleccion] = useState("");
  const requisitos = estadoRequisitos(dote, ficha.requisitosDotes, sheet.dotes);
  const cumpleTodo = requisitos.every((r) => r.cumple);
  const opciones = opcionesDeEleccion(dote, sheet, libre ? null : ficha.requisitosDotes);
  const yaLaTiene = !dote.repetible && sheet.dotes.some((d) => d.id === dote.id);
  const motivo = comprable(dote.eleccion ? eleccion : undefined);
  const sustituye = dote.sustituye ? dotePorId(dote.sustituye)?.label : null;
  const listaId = `eleccion-${dote.id}`;

  return (
    <HudCard className={`p-3 ${cumpleTodo || yaLaTiene || libre ? "" : "opacity-70"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="block font-display text-base font-semibold uppercase leading-tight">{dote.label}</span>
          {sustituye && (
            <span className="mt-1 block font-mono text-[10px] uppercase text-info">mejora de {sustituye}: vale la mejor</span>
          )}
          <span className="mt-1 block font-mono text-[10px] leading-relaxed">
            {requisitos.map((r, i) => (
              <Fragment key={i}>
                {i > 0 && <span className="text-muted"> · </span>}
                <span className={r.cumple ? "text-muted" : "text-danger"}>
                  {r.cumple ? "✓" : "✗"} {r.texto}
                </span>
              </Fragment>
            ))}
          </span>
        </div>
        {!libre && (
          <span className="shrink-0 font-mono text-xs tabular-nums text-accent">
            {dote.coste} {unidad}
          </span>
        )}
      </div>

      {opciones && !yaLaTiene && (
        <div className="mt-2">
          <label htmlFor={listaId} className="mb-1 block font-mono text-[10px] uppercase tracking-wide text-muted">
            {dote.eleccion?.label}
          </label>
          {opciones.cerrada ? (
            <select
              id={listaId}
              value={eleccion}
              onChange={(e) => setEleccion(e.target.value)}
              className="w-full border border-border bg-elevated px-2 py-2 font-mono text-[11px] text-foreground outline-none focus:border-accent"
            >
              <option value="">— elige —</option>
              {opciones.opciones.map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.etiqueta}
                </option>
              ))}
            </select>
          ) : (
            <>
              <input
                id={listaId}
                list={`${listaId}-sugerencias`}
                value={eleccion}
                onChange={(e) => setEleccion(e.target.value)}
                maxLength={60}
                placeholder="escribe o elige"
                className="w-full border border-border bg-elevated px-2 py-2 font-mono text-[11px] text-foreground outline-none focus:border-accent"
              />
              <datalist id={`${listaId}-sugerencias`}>
                {opciones.opciones.map((o) => (
                  <option key={o.valor} value={o.valor} />
                ))}
              </datalist>
            </>
          )}
        </div>
      )}

      <div className="mt-2 flex items-center justify-between gap-2">
        {yaLaTiene ? (
          <span className="font-mono text-[10px] uppercase tracking-wide text-accent">{libre ? "puesta" : "comprada"}</span>
        ) : (
          <>
            <span className="min-w-0 font-mono text-[10px] leading-snug text-muted">
              {/* Los requisitos ya se ven arriba con su ✗: no se repiten aquí. */}
              {/* En libre los requisitos no entran en el motivo: se enseña siempre. */}
              {motivo && (cumpleTodo || libre) ? motivo : ""}
            </span>
            <button
              type="button"
              onClick={() => {
                onComprar({ id: dote.id, ...(dote.eleccion && { eleccion }) });
                setEleccion("");
              }}
              disabled={motivo !== null}
              className="clip-chamfer-sm shrink-0 border border-accent bg-accent px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-night active:scale-95 disabled:border-border disabled:bg-elevated disabled:text-muted"
            >
              {libre ? "Poner" : "Comprar"}
            </button>
          </>
        )}
      </div>
      <TextoPlegable texto={dote.texto} />
    </HudCard>
  );
}

function TextoPlegable({ texto }: { texto: string }) {
  const [abierto, setAbierto] = useState(false);
  if (!texto) return null;
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="font-mono text-[10px] uppercase tracking-wide text-info"
      >
        {abierto ? "▴ ocultar efecto" : "▾ ver efecto"}
      </button>
      {abierto && (
        <div className="mt-2 flex flex-col gap-2 border-t border-border pt-2">
          {texto.split(/\n{2,}/).map((parrafo, i) => (
            <p key={i} className="whitespace-pre-line font-sans text-xs leading-relaxed text-foreground">
              <Prosa texto={parrafo} />
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// La prosa viene en markdown tal cual de docs/dotes.md: solo negrita (**x**) y
// cursiva (*x*, las marcas *(sic)*). Lo demás se pinta como texto.
function Prosa({ texto }: { texto: string }) {
  return (
    <>
      {texto.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/).map((trozo, i) =>
        trozo.startsWith("**") && trozo.endsWith("**") ? (
          <strong key={i} className="font-semibold">
            {trozo.slice(2, -2)}
          </strong>
        ) : trozo.startsWith("*") && trozo.endsWith("*") && trozo.length > 1 ? (
          <em key={i} className="text-muted">
            {trozo.slice(1, -1)}
          </em>
        ) : (
          <Fragment key={i}>{trozo}</Fragment>
        ),
      )}
    </>
  );
}
