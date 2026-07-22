"use client";

import { useEffect } from "react";
import {
  BRANCH_LABELS,
  DISCIPLINE_INFO,
  disciplineRequirements,
  type DisciplineNode,
} from "@/lib/disciplines";

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-info">
        // {label}
      </p>
      <div className="font-sans text-sm leading-snug text-foreground">
        {children}
      </div>
    </div>
  );
}

export function DisciplineModal({
  node,
  especialidad,
  onClose,
}: {
  node: DisciplineNode | null;
  especialidad: string | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!node) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [node, onClose]);

  if (!node) return null;

  const info = DISCIPLINE_INFO[node.id];
  const reqs = disciplineRequirements(node, especialidad);
  const tag = node.exclusive
    ? "⚡ Firma exclusiva"
    : node.cross
      ? "⇄ Habilitadora de cruce"
      : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-night/80 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="clip-chamfer scanlines relative max-h-[88vh] w-full max-w-md overflow-y-auto border border-info bg-surface p-5 shadow-glow-cyan"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-3 top-3 h-7 w-7 border border-border bg-elevated font-mono text-muted active:scale-95"
        >
          ✕
        </button>

        <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
          {BRANCH_LABELS[node.branch]} · Tier {node.tier}
        </p>
        <h2 className="text-glitch mt-0.5 font-display text-2xl font-bold uppercase tracking-wide">
          {node.label}
        </h2>
        {tag && (
          <p className="mt-1 font-mono text-xs uppercase tracking-wide text-glitch">
            {tag}
          </p>
        )}

        <div className="mt-4 flex flex-col gap-4">
          <Section label="Efecto">{node.desc}</Section>
          {info && <Section label="Cómo se usa">{info.uso}</Section>}
          {info && <Section label="Objetivos posibles">{info.targets}</Section>}
          {info && <Section label="Qué sube el rango (1–5)">{info.rango}</Section>}
          {info && (
            <div className="clip-chamfer-sm border-l-2 border-accent bg-night p-3">
              <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-accent">
                // Ejemplo
              </p>
              <p className="font-sans text-sm italic leading-snug text-foreground">
                {info.ejemplo}
              </p>
            </div>
          )}
          <Section label="Requisitos">
            <ul className="flex flex-col gap-0.5">
              {reqs.map((r, i) => (
                <li key={i} className="flex gap-1.5">
                  <span className="text-info">›</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      </div>
    </div>
  );
}
