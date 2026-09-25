"use client";

import { useState } from "react";
import {
  ARMADURAS,
  ARMAS,
  ARMAS_MELEE,
  ARMAS_MELEE_KERZUL,
  FARMACOS,
  ARMAMENTO_PESADO,
  MUNICION_GRANADA,
  MATERIAL_TIERS,
  rarezaMaterial,
  precioMaterial,
  rarezaPermitida,
  type Armadura,
  type ArmaFuego,
  type ArmaMelee,
  type Consumible,
  type ArmaPesada,
  type MunicionGranada,
  type Rareza,
  type Materiales,
  type MaterialTier,
} from "@/lib/rules";
import { HudCard } from "@/components/HudCard";
import { Acordeon } from "@/components/Acordeon";
import {
  BadgeRareza,
  DetalleArmadura,
  DetalleArma,
  DetalleArmaMelee,
  DetalleArmaPesada,
  DetalleGranada,
  DetalleConsumible,
} from "./equipo/PiezaDetalle";
import { TIPOS_ARMA } from "./TiendaTab";

// Fabricar (docs/tareas.md, tarea 8): mismo lenguaje visual que TiendaTab
// (Tile → categoría → Acordeon con Detalle*), pero SOLO las familias sueltas
// sin nivel (ver PIEZAS_FABRICABLES, catalog/equipo.ts) y pagando en
// Materiales en vez de en créditos. Modal en vez de tab: pedido explícito
// del usuario (2026-09-25) — nada de buscador de texto en móvil, un menú por
// categorías es más tocable con el pulgar que una lista larga con scroll.
const ARMAS_MELEE_FABRICABLES = ARMAS_MELEE.filter(
  (p) => !ARMAS_MELEE_KERZUL.includes(p) && p.coste !== null,
);
const KERZUL_FABRICABLES = ARMAS_MELEE_KERZUL.filter((p) => p.coste !== null);

const CATEGORIAS = [
  { id: "armaduras", titulo: "Armaduras", cantidad: ARMADURAS.length },
  { id: "armasFuego", titulo: "Armas de fuego", cantidad: ARMAS.length },
  { id: "melee", titulo: "Armas melee", cantidad: ARMAS_MELEE_FABRICABLES.length },
  { id: "kerzul", titulo: "Armas Kerzul", cantidad: KERZUL_FABRICABLES.length },
  { id: "medicina", titulo: "Medicina", cantidad: FARMACOS.length },
  {
    id: "pesado",
    titulo: "Armamento pesado y munición",
    cantidad: ARMAMENTO_PESADO.length + MUNICION_GRANADA.length,
  },
] as const;

type CategoriaId = (typeof CATEGORIAS)[number]["id"];

const ETIQUETA_TIER: Record<MaterialTier, string> = {
  sencillos: "Sencillos",
  sofisticados: "Sofisticados",
  avanzados: "Avanzados",
};

function Tile({
  titulo,
  cantidad,
  activo,
  onClick,
}: {
  titulo: string;
  cantidad: number;
  activo: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={`clip-chamfer border p-3 text-left active:scale-95 ${
        activo ? "border-accent bg-elevated shadow-glow-yellow" : "border-border bg-surface"
      }`}
    >
      <span
        className={`block font-display text-xs font-semibold uppercase leading-tight ${
          activo ? "text-accent" : "text-foreground"
        }`}
      >
        {titulo}
      </span>
      <span className="mt-1 block font-mono text-[10px] tabular-nums text-muted">
        {cantidad} {cantidad === 1 ? "pieza" : "piezas"}
      </span>
    </button>
  );
}

// El tier más barato que cubre la rareza de la pieza — preseleccionado para
// no obligar a pensar antes de mirar el precio; el jugador puede cambiarlo.
function tierPorDefecto(rareza: Rareza): MaterialTier {
  for (const tier of MATERIAL_TIERS) {
    const tope = rarezaMaterial(tier);
    if (tope && rarezaPermitida(rareza, tope)) return tier;
  }
  return MATERIAL_TIERS[MATERIAL_TIERS.length - 1];
}

function AccionFabricar({
  pieza,
  materiales,
  onFabricar,
}: {
  pieza: { id: string; rareza: Rareza; coste: number };
  materiales: Materiales;
  onFabricar: (catalogoId: string, tier: MaterialTier) => void;
}) {
  const [tier, setTier] = useState<MaterialTier>(() => tierPorDefecto(pieza.rareza));

  const tope = rarezaMaterial(tier);
  const cabeRareza = tope !== null && rarezaPermitida(pieza.rareza, tope);
  const precioUnidad = precioMaterial(tier);
  const unidades = precioUnidad > 0 ? Math.ceil(pieza.coste / precioUnidad) : 0;
  const disponibles = materiales[tier];
  const sinStock = disponibles < unidades;

  return (
    <div className="mt-3 border-t border-border pt-3">
      <div className="flex flex-wrap gap-1.5">
        {MATERIAL_TIERS.map((t) => {
          const topeT = rarezaMaterial(t);
          const cabe = topeT !== null && rarezaPermitida(pieza.rareza, topeT);
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTier(t)}
              disabled={!cabe}
              aria-pressed={tier === t}
              className={`clip-chamfer-sm border px-2 py-1 font-mono text-[10px] uppercase tracking-wide active:scale-95 disabled:opacity-30 ${
                tier === t ? "border-info text-info" : "border-border text-muted"
              }`}
            >
              {ETIQUETA_TIER[t]} ({materiales[t]})
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => onFabricar(pieza.id, tier)}
        disabled={!cabeRareza || sinStock}
        className="clip-chamfer-sm mt-2 w-full border border-accent bg-accent py-2 font-display text-xs font-semibold uppercase tracking-wide text-black active:scale-95 disabled:border-border disabled:bg-elevated disabled:text-muted"
      >
        Construir · {unidades} {ETIQUETA_TIER[tier].toLowerCase()}
      </button>
      {!cabeRareza && (
        <p className="mt-1 font-sans text-[11px] leading-relaxed text-danger">
          Necesitas material de rareza {pieza.rareza} o superior.
        </p>
      )}
      {cabeRareza && sinStock && (
        <p className="mt-1 font-sans text-[11px] leading-relaxed text-danger">
          Te faltan {unidades - disponibles} unidades de {ETIQUETA_TIER[tier]}.
        </p>
      )}
    </div>
  );
}

// `resumen` aparte de `p` (no leído de p.resumen): las granadas no tienen
// ese campo, usan `areaEfecto` como resumen (mismo criterio que TiendaTab).
function FilaFabricable<T extends { id: string; label: string; rareza: Rareza; coste: number }>({
  p,
  resumen,
  materiales,
  onFabricar,
  children,
}: {
  p: T;
  resumen: string;
  materiales: Materiales;
  onFabricar: (catalogoId: string, tier: MaterialTier) => void;
  children: React.ReactNode;
}) {
  return (
    <Acordeon titulo={p.label} resumen={resumen} etiqueta={<BadgeRareza rareza={p.rareza} />}>
      {children}
      <AccionFabricar pieza={p} materiales={materiales} onFabricar={onFabricar} />
    </Acordeon>
  );
}

export function ConstruccionModal({
  materiales,
  onFabricar,
  onCerrar,
}: {
  materiales: Materiales;
  onFabricar: (catalogoId: string, tier: MaterialTier) => void;
  onCerrar: () => void;
}) {
  const [categoria, setCategoria] = useState<CategoriaId | null>(null);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center"
      onClick={onCerrar}
    >
      <HudCard className="max-h-[85vh] w-full max-w-md overflow-y-auto p-4 sm:mx-4">
        <div onClick={(e) => e.stopPropagation()}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="font-display text-lg font-semibold uppercase leading-tight">
                Construcción
              </h2>
              <p className="mt-0.5 font-mono text-[10px] uppercase text-muted">
                {categoria ? CATEGORIAS.find((c) => c.id === categoria)!.titulo : "Elige una categoría"}
              </p>
            </div>
            <button
              type="button"
              onClick={onCerrar}
              aria-label="Cerrar"
              className="shrink-0 border border-border px-2 py-1 font-mono text-xs text-muted active:scale-95"
            >
              ✕
            </button>
          </div>

          {categoria === null ? (
            <div className="mt-4 grid grid-cols-2 gap-2">
              {CATEGORIAS.map((c) => (
                <Tile
                  key={c.id}
                  titulo={c.titulo}
                  cantidad={c.cantidad}
                  activo={false}
                  onClick={() => setCategoria(c.id)}
                />
              ))}
            </div>
          ) : (
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setCategoria(null)}
                className="mb-1 self-start font-mono text-[10px] uppercase tracking-wide text-muted active:scale-95"
              >
                {"‹ Categorías"}
              </button>

              {categoria === "armaduras" &&
                (ARMADURAS as Armadura[]).map((p) => (
                  <FilaFabricable key={p.id} p={p} resumen={p.resumen} materiales={materiales} onFabricar={onFabricar}>
                    <DetalleArmadura p={p} />
                  </FilaFabricable>
                ))}

              {categoria === "armasFuego" &&
                TIPOS_ARMA.map(({ tipo, titulo }) => {
                  const piezas = (ARMAS as ArmaFuego[]).filter((p) => p.tipo === tipo);
                  if (piezas.length === 0) return null;
                  return (
                    <div key={tipo} className="flex flex-col gap-2">
                      <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-muted">
                        {`// ${titulo} · ${piezas.length}`}
                      </p>
                      {piezas.map((p) => (
                        <FilaFabricable key={p.id} p={p} resumen={p.resumen} materiales={materiales} onFabricar={onFabricar}>
                          <DetalleArma p={p} />
                        </FilaFabricable>
                      ))}
                    </div>
                  );
                })}

              {categoria === "melee" &&
                (ARMAS_MELEE_FABRICABLES as (ArmaMelee & { coste: number; rareza: Rareza })[]).map((p) => (
                  <FilaFabricable key={p.id} p={p} resumen={p.resumen} materiales={materiales} onFabricar={onFabricar}>
                    <DetalleArmaMelee p={p} />
                  </FilaFabricable>
                ))}

              {categoria === "kerzul" &&
                (KERZUL_FABRICABLES as (ArmaMelee & { coste: number; rareza: Rareza })[]).map((p) => (
                  <FilaFabricable key={p.id} p={p} resumen={p.resumen} materiales={materiales} onFabricar={onFabricar}>
                    <DetalleArmaMelee p={p} />
                  </FilaFabricable>
                ))}

              {categoria === "medicina" &&
                (FARMACOS as Consumible[]).map((p) => (
                  <FilaFabricable key={p.id} p={p} resumen={p.resumen} materiales={materiales} onFabricar={onFabricar}>
                    <DetalleConsumible p={p} />
                  </FilaFabricable>
                ))}

              {categoria === "pesado" && (
                <>
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-muted">
                    {`// Armamento pesado · ${ARMAMENTO_PESADO.length}`}
                  </p>
                  {(ARMAMENTO_PESADO as ArmaPesada[]).map((p) => (
                    <FilaFabricable key={p.id} p={p} resumen={p.resumen} materiales={materiales} onFabricar={onFabricar}>
                      <DetalleArmaPesada p={p} />
                    </FilaFabricable>
                  ))}
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-muted">
                    {`// Munición y granadas · ${MUNICION_GRANADA.length}`}
                  </p>
                  {(MUNICION_GRANADA as MunicionGranada[]).map((p) => (
                    <FilaFabricable
                      key={p.id}
                      p={p}
                      resumen={p.areaEfecto}
                      materiales={materiales}
                      onFabricar={onFabricar}
                    >
                      <DetalleGranada p={p} />
                    </FilaFabricable>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </HudCard>
    </div>
  );
}
