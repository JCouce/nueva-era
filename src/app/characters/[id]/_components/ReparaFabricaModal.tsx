"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import {
  equipoPorId,
  capacidadDePieza,
  rarezaPermitida,
  MATERIAL_TIERS,
  RAREZA_ORDEN,
  rarezaMaterial,
  tieneVtf,
  modificadorAccion,
  resolverTirada,
  bonoAlcance,
  type Sheet,
  type MaterialTier,
  type Materiales,
  type RecursoInstancia,
  type Rareza,
  type Accion,
  type ModificadorConFuente,
} from "@/lib/rules";
import { HudCard } from "@/components/HudCard";
import { AccionModal } from "@/components/AccionModal";
import { FabricarSeccion } from "./FabricarSeccion";
import { type Lanzamiento } from "@/components/ResultadoTirada";

// Reparar y Fabricar (docs/tareas.md, tarea 8): una sola acción en vez de
// dos huecos sueltos en la pestaña (decisión del usuario, 2026-09-25,
// segunda vuelta — la primera versión dejaba "Construcción" como un botón
// aparte, huérfano de la fila de acciones). Reparación siempre visible aquí
// dentro; Fabricar solo si hay VTF equipada — mismo gating que antes, ahora
// como panel de abajo en vez de modal propio.
//
// Corrección 2026-09-25 (segunda revisión del usuario, "tiene que ser igual
// que lo otro"): Reparar también exige tirada — misma prosa de la VTF
// (docs/equipamiento.md:1095-1099), Perspicacia + la habilidad técnica
// aplicable, con -4 a la dificultad respecto a fabricar (dificultadReparar()
// más abajo). Mismo patrón que FabricarSeccion.tsx: el material se gasta
// SIEMPRE, la reparación solo se aplica con éxito, y el `AccionModal` se
// monta localmente aquí (no en el `modal` único de AccionesTab.tsx) para no
// perder el sitio en el que estaba el jugador.
function dificultadReparar(rareza: Rareza | null): number {
  return 7 + 2 * RAREZA_ORDEN.indexOf(rareza ?? "Común") - 4;
}

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
  mods,
  setHistorial,
  memoria,
  setMemoria,
  onReparar,
  libre,
}: {
  sheet: Sheet;
  mods: ModificadorConFuente[];
  setHistorial: Dispatch<SetStateAction<Lanzamiento[]>>;
  memoria: Record<string, { dificultad: number | null; circunstancial: number }>;
  setMemoria: Dispatch<
    SetStateAction<Record<string, { dificultad: number | null; circunstancial: number }>>
  >;
  onReparar: (instanciaId: string, tier: MaterialTier, exito: boolean) => void;
  libre: boolean;
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

  // Tirada de Reparar en curso: null mientras no se ha pulsado ningún tier.
  const [rollOpen, setRollOpen] = useState<{
    tirada: Accion;
    instanciaId: string;
    tier: MaterialTier;
    modBase: number;
    desgloseBase: { etiqueta: string; valor: number }[];
    dificultadSugerida: number;
  } | null>(null);
  const [resultado, setResultado] = useState<Lanzamiento | null>(null);

  const onElegirTier = (instanciaId: string, titulo: string, rareza: Rareza | null, tier: MaterialTier) => {
    if (libre) {
      onReparar(instanciaId, tier, true);
      return;
    }
    const tirada: Accion = {
      id: `reparar_${instanciaId}`,
      label: `Reparar: ${titulo}`,
      grupo: "Acciones",
      aplicado: "perspicacia",
      habilidad: "tecnociencia",
      nota:
        "Perspicacia + Tecnociencia, o la habilidad técnica aplicable. Dificultad 7 para lo común, " +
        "+2 por cada rango de rareza superior, -4 por ser reparación. El material se gasta salga " +
        "lo que salga.",
    };
    const mod = modificadorAccion(sheet, tirada, false, mods, false);
    setResultado(null);
    setRollOpen({
      tirada,
      instanciaId,
      tier,
      modBase: mod.total,
      desgloseBase: [
        { etiqueta: "Perspicacia", valor: mod.aplicado },
        { etiqueta: "Tecnociencia", valor: mod.habilidad ?? 0 },
      ],
      dificultadSugerida: dificultadReparar(rareza),
    });
  };

  const onTirar = ({
    dado,
    dificultad,
    circunstancial,
  }: {
    dado: number;
    dificultad: number | null;
    circunstancial: number;
  }) => {
    if (!rollOpen) return;
    const bono = bonoAlcance(mods, {
      id: rollOpen.tirada.id,
      grupo: rollOpen.tirada.grupo,
      habilidad: rollOpen.tirada.habilidad,
      modoElegido: null,
    });
    const r = resolverTirada({ dado, modificador: rollOpen.modBase + bono, circunstancial, dificultad });
    const id = Date.now();
    const lanzamiento: Lanzamiento = { ...r, id, label: rollOpen.tirada.label };
    setHistorial((h) => [lanzamiento, ...h].slice(0, 6));
    setMemoria((m) => ({ ...m, [rollOpen.tirada.id]: { dificultad, circunstancial } }));
    setResultado(lanzamiento);
    // Ver el mismo comentario en FabricarSeccion.tsx: sin dificultad elegida
    // a propósito no hay fracaso que señalar, se trata como éxito.
    onReparar(rollOpen.instanciaId, rollOpen.tier, r.exito ?? true);
  };

  const cerrarRoll = () => {
    setRollOpen(null);
    setResultado(null);
  };

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
            onReparar={(tier) => onElegirTier(p.instanciaId, p.titulo, p.rareza, tier)}
          />
        ))
      )}

      {rollOpen && (
        <AccionModal
          titulo={rollOpen.tirada.label}
          nota={rollOpen.tirada.nota}
          modBase={rollOpen.modBase}
          desgloseBase={rollOpen.desgloseBase}
          condiciones={[]}
          mods={mods}
          ctxBase={{ id: rollOpen.tirada.id, grupo: rollOpen.tirada.grupo, habilidad: rollOpen.tirada.habilidad }}
          dificultadInicial={memoria[rollOpen.tirada.id]?.dificultad ?? rollOpen.dificultadSugerida}
          circunstancialInicial={memoria[rollOpen.tirada.id]?.circunstancial ?? 0}
          resultado={resultado}
          onTirarDanio={() => {}}
          onCerrar={cerrarRoll}
          onTirar={onTirar}
        />
      )}
    </div>
  );
}

export function ReparaFabricaModal({
  sheet,
  mods,
  setHistorial,
  memoria,
  setMemoria,
  onReparar,
  onFabricar,
  libre = false,
  onCerrar,
}: {
  sheet: Sheet;
  // Compartidos por Reparar y Fabricar (las dos tiradas de este modal) — se
  // pasan porque AccionesTab ya los tenía calculados/levantados, sin
  // recomputarlos aquí. Solo se ESCRIBE en el historial (setHistorial) —
  // leerlo (para el log de arriba) es cosa de AccionesTab, este modal no lo
  // pinta.
  mods: ModificadorConFuente[];
  setHistorial: Dispatch<SetStateAction<Lanzamiento[]>>;
  memoria: Record<string, { dificultad: number | null; circunstancial: number }>;
  setMemoria: Dispatch<
    SetStateAction<Record<string, { dificultad: number | null; circunstancial: number }>>
  >;
  onReparar: (instanciaId: string, tier: MaterialTier, exito: boolean) => void;
  onFabricar?: (catalogoId: string, tier: MaterialTier, exito: boolean) => void;
  libre?: boolean;
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
            <ReparacionSeccion
              sheet={sheet}
              mods={mods}
              setHistorial={setHistorial}
              memoria={memoria}
              setMemoria={setMemoria}
              onReparar={onReparar}
              libre={libre}
            />

            {onFabricar && tieneVtf(sheet) && (
              <div className="border-t border-border pt-4">
                <FabricarSeccion
                  sheet={sheet}
                  mods={mods}
                  setHistorial={setHistorial}
                  memoria={memoria}
                  setMemoria={setMemoria}
                  onFabricar={onFabricar}
                  libre={libre}
                />
              </div>
            )}
          </div>
        </div>
      </HudCard>
    </div>
  );
}
