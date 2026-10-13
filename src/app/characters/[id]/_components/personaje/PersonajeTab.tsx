"use client";

import { useState } from "react";
import {
  pasosPersonaje,
  subPestanaInicial,
  type CategoriaPrioridad,
  type EleccionEspecie,
  type EstadoPaso,
  type FichaResuelta,
  type LetraPrioridad,
  type PasoPersonaje,
  type PasoPersonajeId,
} from "@/lib/rules";
import { PrioridadCard } from "../PrioridadCard";
import { OrigenPanel } from "./OrigenPanel";
import { IdentidadPanel } from "./IdentidadPanel";
import { EstadoPanel } from "./EstadoPanel";

const NOMBRE: Record<PasoPersonajeId, string> = {
  origen: "Origen",
  prioridades: "Prioridades",
  identidad: "Identidad",
  estado: "Estado",
};

function marca(paso: PasoPersonaje): { texto: string; clase: string } {
  const porEstado: Record<Exclude<EstadoPaso, null>, { texto: string; clase: string }> = {
    hecho: { texto: "✓ hecho", clase: "text-neon-green" },
    pendiente: { texto: "● pendiente", clase: "text-accent" },
    fijado: { texto: "fijado", clase: "text-muted" },
  };
  if (paso.estado) return porEstado[paso.estado];
  // Sin marca: Estado siempre; Identidad en una ficha aprobada (sigue editable).
  return paso.id === "estado" ? { texto: "en juego", clase: "text-muted" } : { texto: "editable", clase: "text-muted" };
}

// La pestaña Personaje: los pasos de creación en orden (Origen → Prioridades →
// Identidad → Estado) como sub-pestañas, cada uno con su estado. Todo lo que decide
// sale de pasosPersonaje (@/lib/rules/personaje.ts).
export function PersonajeTab({
  name,
  ficha,
  aprobada,
  esMaster,
  creditos,
  onName,
  onEdad,
  onAltura,
  onPeso,
  onEspecie,
  onTrasfondo,
  onMotivacion,
  onPrioridad,
}: {
  name: string;
  ficha: FichaResuelta;
  aprobada: boolean;
  esMaster: boolean;
  creditos: number;
  onName: (v: string) => void;
  onEdad: (v: number | null) => void;
  onAltura: (v: number | null) => void;
  onPeso: (v: number | null) => void;
  onEspecie: (eleccion: EleccionEspecie) => void;
  onTrasfondo: (v: string) => void;
  onMotivacion: (v: string) => void;
  onPrioridad: (categoria: CategoriaPrioridad, letra: LetraPrioridad | null) => void;
}) {
  const sheet = ficha.ficha;
  const pasos = pasosPersonaje({ sheet, nombre: name, aprobada });
  const [sub, setSub] = useState<PasoPersonajeId>(() => subPestanaInicial(pasos, aprobada));
  // Si la ficha se aprueba estando en Prioridades, el paso desaparece: cae a Estado.
  const activa: PasoPersonajeId = pasos.some((p) => p.id === sub) ? sub : "estado";

  return (
    <div className="flex flex-col gap-4">
      {/* Sticky bajo la cabecera de la app (AppHeader, ~49px). */}
      <nav
        className="sticky top-[49px] z-[5] -mx-4 grid gap-1 border-b border-border bg-background/95 px-4 py-2 backdrop-blur"
        style={{ gridTemplateColumns: `repeat(${pasos.length}, minmax(0, 1fr))` }}
      >
        {pasos.map((p) => {
          const m = marca(p);
          const on = p.id === activa;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setSub(p.id)}
              className={`clip-chamfer-sm flex min-h-[52px] flex-col items-center justify-center gap-0.5 border px-1 py-1.5 ${
                on ? "!border-accent bg-accent/10" : "border-border bg-surface"
              }`}
            >
              <span
                className={`font-display text-xs font-semibold uppercase tracking-wide ${on ? "text-foreground" : "text-muted"}`}
              >
                {NOMBRE[p.id]}
              </span>
              <span className={`font-mono text-[9px] uppercase tracking-wide ${m.clase}`}>{m.texto}</span>
            </button>
          );
        })}
      </nav>

      {activa === "origen" && (
        <OrigenPanel ficha={ficha} aprobada={aprobada} esMaster={esMaster} creditos={creditos} onEspecie={onEspecie} />
      )}
      {activa === "prioridades" && <PrioridadCard prioridades={sheet.prioridades} onSet={onPrioridad} />}
      {activa === "identidad" && (
        <IdentidadPanel
          name={name}
          ficha={ficha}
          onName={onName}
          onEdad={onEdad}
          onAltura={onAltura}
          onPeso={onPeso}
          onMotivacion={onMotivacion}
          onTrasfondo={onTrasfondo}
        />
      )}
      {activa === "estado" && <EstadoPanel ficha={ficha} />}
    </div>
  );
}
