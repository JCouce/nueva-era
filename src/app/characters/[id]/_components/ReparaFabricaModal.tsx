"use client";

import {
  equipoPorId,
  capacidadDePieza,
  rarezaPermitida,
  MATERIAL_TIERS,
  rarezaMaterial,
  tieneVtf,
  type Sheet,
  type MaterialTier,
  type Materiales,
  type RecursoInstancia,
  type Rareza,
} from "@/lib/rules";
import { HudCard } from "@/components/HudCard";
import { FabricarSeccion } from "./FabricarSeccion";

// Reparar y Fabricar (docs/tareas.md, tarea 8): una sola acción sin dado en
// vez de dos huecos sueltos en la pestaña (decisión del usuario, 2026-09-25,
// segunda vuelta — la primera versión dejaba "Construcción" como un botón
// aparte, huérfano de la fila de acciones). Reparación siempre visible aquí
// dentro; Fabricar solo si hay VTF equipada — mismo gating que antes, ahora
// como panel de abajo en vez de modal propio.
function ReparacionCard({
  titulo,
  rareza,
  recurso,
  materiales,
  onReparar,
}: {
  titulo: string;
  rareza: Rareza | null;
  recurso: RecursoInstancia;
  materiales: Materiales;
  onReparar: (tier: MaterialTier) => void;
}) {
  return (
    <HudCard className="p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-display text-sm font-semibold uppercase text-foreground">{titulo}</p>
        <p className="font-mono text-lg tabular-nums text-danger">
          {recurso.actual}
          <span className="text-sm text-muted">/{recurso.max} PG</span>
        </p>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {MATERIAL_TIERS.map((tier) => {
          const tope = rarezaMaterial(tier);
          const cabe = tope !== null && rarezaPermitida(rareza, tope);
          const stock = materiales[tier];
          const disabled = !cabe || stock < 1;
          return (
            <button
              key={tier}
              type="button"
              onClick={() => onReparar(tier)}
              disabled={disabled}
              className="clip-chamfer-sm border border-accent bg-accent px-2 py-1.5 font-mono text-[10px] uppercase tracking-wide text-black active:scale-95 disabled:border-border disabled:bg-elevated disabled:text-muted"
            >
              {tier} ({stock})
            </button>
          );
        })}
      </div>
    </HudCard>
  );
}

function ReparacionSeccion({
  sheet,
  onReparar,
}: {
  sheet: Sheet;
  onReparar: (instanciaId: string, tier: MaterialTier) => void;
}) {
  const piezas = sheet.recursos.flatMap((recurso) => {
    if (recurso.actual >= recurso.max) return [];
    const pieza = sheet.equipo.find((p) => p.instanciaId === recurso.instanciaId);
    const cat = pieza ? equipoPorId(pieza.catalogoId) : null;
    if (!pieza || !cat) return [];
    const cap = capacidadDePieza(pieza);
    if (!cap || cap.tipo !== "durabilidad") return [];
    const rareza = cat.familia === "armaMelee" ? cat.rareza : null;
    return [{ instanciaId: pieza.instanciaId, titulo: cat.label, rareza, recurso }];
  });

  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-muted">
        Reparación
      </h3>
      {piezas.length === 0 ? (
        <HudCard className="border-dashed p-4 text-center">
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
            {"//SYSTEM · nada que reparar"}
          </p>
          <p className="mt-2 font-sans text-sm text-muted">
            Un Escudo equipado aparece aquí en cuanto pierde puntos de golpe.
          </p>
        </HudCard>
      ) : (
        piezas.map((p) => (
          <ReparacionCard
            key={p.instanciaId}
            titulo={p.titulo}
            rareza={p.rareza}
            recurso={p.recurso}
            materiales={sheet.materiales}
            onReparar={(tier) => onReparar(p.instanciaId, tier)}
          />
        ))
      )}
    </div>
  );
}

export function ReparaFabricaModal({
  sheet,
  onReparar,
  onFabricar,
  onCerrar,
}: {
  sheet: Sheet;
  onReparar: (instanciaId: string, tier: MaterialTier) => void;
  onFabricar?: (catalogoId: string, tier: MaterialTier) => void;
  onCerrar: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={onCerrar}
    >
      <HudCard className="max-h-[85vh] w-full max-w-md overflow-y-auto p-4 sm:mx-4">
        <div onClick={(e) => e.stopPropagation()}>
          <div className="flex items-start justify-between gap-2">
            <h2 className="font-display text-lg font-semibold uppercase leading-tight">
              Reparar y Fabricar
            </h2>
            <button
              type="button"
              onClick={onCerrar}
              aria-label="Cerrar"
              className="shrink-0 border border-border px-2 py-1 font-mono text-xs text-muted active:scale-95"
            >
              ✕
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-4">
            <ReparacionSeccion sheet={sheet} onReparar={onReparar} />

            {onFabricar && tieneVtf(sheet) && (
              <div className="border-t border-border pt-4">
                <FabricarSeccion materiales={sheet.materiales} onFabricar={onFabricar} />
              </div>
            )}
          </div>
        </div>
      </HudCard>
    </div>
  );
}
