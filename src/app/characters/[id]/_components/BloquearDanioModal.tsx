"use client";

import { useState } from "react";
import { desgloseBlindaje, tieneEscudoMelee, TIPOS_DANIO, type Sheet, type TipoDanio } from "@/lib/rules";
import { HudCard } from "@/components/HudCard";

function signo(n: number) {
  return n >= 0 ? `+${n}` : `${n}`;
}

// Una línea del desglose de blindaje — mismo criterio que LineaDesglose en
// AccionModal.tsx ("nada suma en silencio"), componente propio en vez de
// compartido porque este modal no tira dado y no comparte el resto de esa
// forma (dificultad, condiciones...).
function LineaBlindaje({ etiqueta, valor }: { etiqueta: string; valor: number }) {
  return (
    <div className="flex items-baseline justify-between gap-3 font-mono text-[11px]">
      <span className="truncate text-muted">{etiqueta}</span>
      <span className={`shrink-0 tabular-nums ${valor > 0 ? "text-info" : "text-muted"}`}>
        {signo(valor)}
      </span>
    </div>
  );
}

// "Bloquear daño" (docs/tareas.md, Hallazgo #5 / sistema.md pregunta 29): un
// calculador puro, sin dado y sin escribir nada en la ficha — eliges tipo de
// daño + cuánto recibes, y ves cuánto absorbe el blindaje ahora mismo. Por
// eso no necesita el patrón de ReparaFabricaModal.tsx (tirada + callback de
// efecto): aquí no hay tirada ni mutación, solo lectura de desgloseBlindaje().
export function BloquearDanioModal({ sheet, onCerrar }: { sheet: Sheet; onCerrar: () => void }) {
  const [tipo, setTipo] = useState<TipoDanio>("cinetico");
  const [escudoEnAlto, setEscudoEnAlto] = useState(false);
  const [danioRecibido, setDanioRecibido] = useState(0);

  const conEscudo = tieneEscudoMelee(sheet);
  const desglose = desgloseBlindaje(sheet, tipo, conEscudo && escudoEnAlto);
  const blindaje = desglose.reduce((total, l) => total + l.valor, 0);
  const pasa = Math.max(0, danioRecibido - blindaje);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onCerrar}>
      <HudCard className="max-h-[85vh] w-full max-w-md overflow-y-auto p-4 sm:mx-4">
        <div onClick={(e) => e.stopPropagation()}>
          <div className="flex items-start justify-between gap-2">
            <h2 className="font-display text-lg font-semibold uppercase leading-tight">Bloquear daño</h2>
            <button
              type="button"
              onClick={onCerrar}
              aria-label="Cerrar"
              className="shrink-0 border border-border px-2 py-1 font-mono text-xs text-muted active:scale-95"
            >
              ✕
            </button>
          </div>
          <p className="mt-2 font-sans text-[11px] leading-relaxed text-muted">
            Elige tipo de daño y cuánto recibes — el desglose de abajo explica de dónde sale
            cada punto de blindaje.
          </p>

          <div className="mt-4 border-t border-border pt-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">{"// Tipo de daño"}</p>
            <div className="mt-1.5 grid grid-cols-3 gap-1.5">
              {TIPOS_DANIO.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTipo(t.id)}
                  className={`clip-chamfer-sm border px-2 py-1.5 font-mono text-[11px] uppercase active:scale-95 ${
                    tipo === t.id ? "border-accent text-accent" : "border-border text-muted"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {conEscudo && (
            <div className="mt-4 border-t border-border pt-3">
              <button
                type="button"
                onClick={() => setEscudoEnAlto((v) => !v)}
                aria-pressed={escudoEnAlto}
                className={`clip-chamfer-sm w-full border px-3 py-2 text-left font-mono text-xs uppercase active:scale-[0.99] ${
                  escudoEnAlto ? "border-info text-info" : "border-border text-muted"
                }`}
              >
                {escudoEnAlto ? "✓ " : ""}Escudo en alto
              </button>
              <p className="mt-1.5 font-sans text-[11px] leading-relaxed text-muted">
                Acción para levantarlo, dura hasta tu siguiente turno. No cuenta si te atacan por
                la espalda.
              </p>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
              {"// Daño recibido"}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDanioRecibido((v) => Math.max(0, v - 1))}
                aria-label="Bajar daño recibido"
                className="h-9 w-9 border border-border bg-elevated font-mono text-lg leading-none text-muted active:scale-95"
              >
                −
              </button>
              <span className="w-8 text-center font-mono text-lg tabular-nums text-foreground">
                {danioRecibido}
              </span>
              <button
                type="button"
                onClick={() => setDanioRecibido((v) => Math.min(50, v + 1))}
                aria-label="Subir daño recibido"
                className="h-9 w-9 border border-border bg-elevated font-mono text-lg leading-none text-muted active:scale-95"
              >
                +
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-1 border-t border-border pt-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">{"// Desglose"}</p>
            {desglose.map((l, i) => (
              <LineaBlindaje key={i} etiqueta={l.etiqueta} valor={l.valor} />
            ))}
            <div className="mt-1 flex items-baseline justify-between border-t border-border pt-1.5">
              <span className="font-mono text-xs uppercase text-foreground">Blindaje</span>
              <span className="font-mono text-lg font-bold tabular-nums text-info">{signo(blindaje)}</span>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            <span className="font-mono text-xs uppercase text-foreground">Pasa</span>
            <span className="font-mono text-2xl font-bold tabular-nums text-danger">{pasa}</span>
          </div>
        </div>
      </HudCard>
    </div>
  );
}
