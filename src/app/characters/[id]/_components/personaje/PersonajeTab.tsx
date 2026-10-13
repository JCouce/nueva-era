"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import {
  pasosPersonaje,
  subPestanaInicial,
  faltaParaEnviar,
  avisosParaEnviar,
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
import { BarraEnvio } from "../RevisionFicha";

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
  soloLectura,
  envio,
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
  // En revisión (jugador): los paneles van deshabilitados, pero las sub-pestañas no,
  // para poder leer cada paso. Por eso el fieldset vive aquí y no en CharacterSheet.
  soloLectura: boolean;
  // null: sin barra de envío (no es el dueño, o la ficha no está en creación).
  envio: { characterId: string; reviewNote: string | null; esperarGuardados: () => Promise<unknown> } | null;
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

      <PanelFieldset disabled={soloLectura}>
        {activa === "origen" && (
          <OrigenPanel ficha={ficha} aprobada={aprobada} esMaster={esMaster} creditos={creditos} soloLectura={soloLectura} onEspecie={onEspecie} />
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
      </PanelFieldset>

      {envio && (
        <BarraEnvio
          characterId={envio.characterId}
          falta={faltaParaEnviar(pasos)}
          avisos={avisosParaEnviar(sheet, ficha.ajusteCoste)}
          reviewNote={envio.reviewNote}
          esperarGuardados={envio.esperarGuardados}
        />
      )}
    </div>
  );
}

// fieldset sin los estilos del navegador (borde, padding, min-width: min-content).
export function PanelFieldset({ disabled, children }: { disabled: boolean; children: ReactNode }) {
  return (
    <fieldset disabled={disabled} className="m-0 flex min-w-0 flex-col gap-4 border-0 p-0">
      {children}
    </fieldset>
  );
}
