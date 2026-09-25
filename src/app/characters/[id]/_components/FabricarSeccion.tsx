"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import {
  ARMADURAS,
  ARMAS,
  ARMAS_MELEE,
  ARMAS_MELEE_KERZUL,
  FARMACOS,
  ARMAMENTO_PESADO,
  MUNICION_GRANADA,
  MATERIAL_TIERS,
  RAREZA_ORDEN,
  rarezaMaterial,
  precioMaterial,
  rarezaPermitida,
  modificadorAccion,
  resolverTirada,
  bonoAlcance,
  type Armadura,
  type ArmaFuego,
  type ArmaMelee,
  type Consumible,
  type ArmaPesada,
  type MunicionGranada,
  type Rareza,
  type Materiales,
  type MaterialTier,
  type Accion,
  type Sheet,
  type ModificadorConFuente,
} from "@/lib/rules";
import { Acordeon } from "@/components/Acordeon";
import { AccionModal } from "@/components/AccionModal";
import { type Lanzamiento } from "@/components/ResultadoTirada";
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
// Materiales en vez de en créditos. Sección, no modal propio (2026-09-25,
// segunda vuelta): vive DENTRO de ReparaFabricaModal.tsx, como panel de
// abajo, para que "Reparar" y "Fabricar" sean una sola acción — nada de
// buscador de texto en móvil, un menú por categorías es más tocable con el
// pulgar que una lista larga con scroll.
//
// Corrección de diseño 2026-09-25 (segunda pasada, tras revisión del
// usuario): Construir SÍ exige tirada — docs/equipamiento.md:1078-1081,
// Perspicacia + Tecnociencia o Biociencia, dificultad 7 +2 por rango de
// rareza. El gasto de materiales sigue siendo automático (fabricar(),
// rules/equipo.ts), pero ahora solo se entrega la pieza si la tirada sale
// bien — el material se gasta SIEMPRE, decisión explícita del usuario
// ("se gastan los materiales igual, falles o no"). La tirada reutiliza el
// mismo AccionModal que cualquier otra (mismo dado, misma transición,
// mismo desglose) montado aquí mismo, como overlay sobre este modal — NO se
// enruta por el `modal` único de AccionesTab.tsx a propósito: hacerlo
// obligaría a cerrar Reparar y Fabricar para tirar, perdiendo la categoría/
// pieza que el jugador tenía abierta. Si reutilizamos algo de AccionesTab es
// el propio historial/memoria (props `setHistorial`/`memoria`/`setMemoria`,
// ya levantados en CharacterSheet.tsx) para que la tirada aparezca en
// "Acciones recientes" igual que cualquier otra — no un historial paralelo.
// "Gran calidad" (éxito crítico) queda sin mecanizar a propósito, pedido
// explícito del usuario: primero esto, luego eso.
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

// Pieza mínima que necesita esta sección — más campos de los que declara
// `AccionFabricar` en su tipo de abajo, pero TS deja pasar el resto (los
// llamadores reales traen Armadura/ArmaFuego/etc. completos).
type PiezaFabricable = { id: string; label: string; rareza: Rareza; coste: number };

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

// Dificultad sugerida de la tirada de Fabricar (docs/equipamiento.md:1078-
// 1081): base 7 para Común, +2 por cada rango de rareza superior. Editable a
// mano en el propio AccionModal, igual que Radar/Escáner — esto es solo el
// valor con el que se abre.
function dificultadFabricar(rareza: Rareza): number {
  return 7 + 2 * RAREZA_ORDEN.indexOf(rareza);
}

function AccionFabricar({
  pieza,
  materiales,
  onConstruir,
}: {
  pieza: PiezaFabricable;
  materiales: Materiales;
  onConstruir: (pieza: PiezaFabricable, tier: MaterialTier) => void;
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
        onClick={() => onConstruir(pieza, tier)}
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
function FilaFabricable<T extends PiezaFabricable>({
  p,
  resumen,
  materiales,
  onConstruir,
  children,
}: {
  p: T;
  resumen: string;
  materiales: Materiales;
  onConstruir: (pieza: PiezaFabricable, tier: MaterialTier) => void;
  children: React.ReactNode;
}) {
  return (
    <Acordeon titulo={p.label} resumen={resumen} etiqueta={<BadgeRareza rareza={p.rareza} />}>
      {children}
      <AccionFabricar pieza={p} materiales={materiales} onConstruir={onConstruir} />
    </Acordeon>
  );
}

export function FabricarSeccion({
  sheet,
  mods,
  setHistorial,
  memoria,
  setMemoria,
  onFabricar,
  libre = false,
}: {
  sheet: Sheet;
  mods: ModificadorConFuente[];
  setHistorial: Dispatch<SetStateAction<Lanzamiento[]>>;
  memoria: Record<string, { dificultad: number | null; circunstancial: number }>;
  setMemoria: Dispatch<
    SetStateAction<Record<string, { dificultad: number | null; circunstancial: number }>>
  >;
  onFabricar: (catalogoId: string, tier: MaterialTier, exito: boolean) => void;
  // NpcEditor.tsx (edición libre de máster): sin tirada, Construir gasta y
  // entrega en el acto — mismo criterio que Reparar para NPCs.
  libre?: boolean;
}) {
  const [categoria, setCategoria] = useState<CategoriaId | null>(null);

  // Tirada de Fabricar en curso: null mientras se navega el catálogo. Vive
  // aquí, no en `modal` de AccionesTab.tsx — ver el comentario de cabecera.
  const [rollOpen, setRollOpen] = useState<{
    tirada: Accion;
    piezaLabel: string;
    catalogoId: string;
    tier: MaterialTier;
    modBase: number;
    desgloseBase: { etiqueta: string; valor: number }[];
    dificultadSugerida: number;
  } | null>(null);
  const [resultado, setResultado] = useState<Lanzamiento | null>(null);
  // Efecto de ESTA tirada en concreto ("has construido X" / "has perdido
  // los materiales") — no es información de la pieza como `nota` de la
  // Accion, así que vive aparte y solo se pinta junto al resultado
  // (AccionModal.tsx, prop `notaResultado`, ver su comentario).
  const [mensajeResultado, setMensajeResultado] = useState<string | null>(null);

  const onConstruir = (pieza: PiezaFabricable, tier: MaterialTier) => {
    if (libre) {
      onFabricar(pieza.id, tier, true);
      return;
    }
    const tirada: Accion = {
      id: `fabricar_${pieza.id}`,
      label: `Fabricar: ${pieza.label}`,
      grupo: "Acciones",
      aplicado: "perspicacia",
      habilidad: "tecnociencia",
      nota:
        "Perspicacia + Tecnociencia, o Biociencia según lo que se fabrique. Dificultad 7 para " +
        "lo común, +2 por cada rango de rareza superior. Éxito crítico: gran calidad (sin " +
        "mecanizar todavía). El material se gasta salga lo que salga.",
    };
    const mod = modificadorAccion(sheet, tirada, false, mods, false);
    setResultado(null);
    setMensajeResultado(null);
    setRollOpen({
      tirada,
      piezaLabel: pieza.label,
      catalogoId: pieza.id,
      tier,
      modBase: mod.total,
      desgloseBase: [
        { etiqueta: "Perspicacia", valor: mod.aplicado },
        { etiqueta: "Tecnociencia", valor: mod.habilidad ?? 0 },
      ],
      dificultadSugerida: dificultadFabricar(pieza.rareza),
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
    // r.exito es null solo si el jugador elige a propósito "sin dificultad"
    // en el modal — sin comparación no hay fracaso que señalar, se trata
    // como éxito (mismo comportamiento que antes de esta corrección).
    const exito = r.exito ?? true;
    setMensajeResultado(
      exito ? `Has construido: ${rollOpen.piezaLabel}.` : "Has perdido los materiales.",
    );
    onFabricar(rollOpen.catalogoId, rollOpen.tier, exito);
  };

  const cerrarRoll = () => {
    setRollOpen(null);
    setResultado(null);
    setMensajeResultado(null);
  };

  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-muted">
        Fabricar
      </h3>

      {categoria === null ? (
        <div className="grid grid-cols-2 gap-2">
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
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setCategoria(null)}
            className="mb-1 self-start font-mono text-[10px] uppercase tracking-wide text-muted active:scale-95"
          >
            {"‹ Categorías"}
          </button>

          {categoria === "armaduras" &&
            (ARMADURAS as Armadura[]).map((p) => (
              <FilaFabricable key={p.id} p={p} resumen={p.resumen} materiales={sheet.materiales} onConstruir={onConstruir}>
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
                    <FilaFabricable key={p.id} p={p} resumen={p.resumen} materiales={sheet.materiales} onConstruir={onConstruir}>
                      <DetalleArma p={p} />
                    </FilaFabricable>
                  ))}
                </div>
              );
            })}

          {categoria === "melee" &&
            (ARMAS_MELEE_FABRICABLES as (ArmaMelee & { coste: number; rareza: Rareza })[]).map((p) => (
              <FilaFabricable key={p.id} p={p} resumen={p.resumen} materiales={sheet.materiales} onConstruir={onConstruir}>
                <DetalleArmaMelee p={p} />
              </FilaFabricable>
            ))}

          {categoria === "kerzul" &&
            (KERZUL_FABRICABLES as (ArmaMelee & { coste: number; rareza: Rareza })[]).map((p) => (
              <FilaFabricable key={p.id} p={p} resumen={p.resumen} materiales={sheet.materiales} onConstruir={onConstruir}>
                <DetalleArmaMelee p={p} />
              </FilaFabricable>
            ))}

          {categoria === "medicina" &&
            (FARMACOS as Consumible[]).map((p) => (
              <FilaFabricable key={p.id} p={p} resumen={p.resumen} materiales={sheet.materiales} onConstruir={onConstruir}>
                <DetalleConsumible p={p} />
              </FilaFabricable>
            ))}

          {categoria === "pesado" && (
            <>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-muted">
                {`// Armamento pesado · ${ARMAMENTO_PESADO.length}`}
              </p>
              {(ARMAMENTO_PESADO as ArmaPesada[]).map((p) => (
                <FilaFabricable key={p.id} p={p} resumen={p.resumen} materiales={sheet.materiales} onConstruir={onConstruir}>
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
                  materiales={sheet.materiales}
                  onConstruir={onConstruir}
                >
                  <DetalleGranada p={p} />
                </FilaFabricable>
              ))}
            </>
          )}
        </div>
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
          notaResultado={mensajeResultado ?? undefined}
          onTirarDanio={() => {}}
          onCerrar={cerrarRoll}
          onTirar={onTirar}
        />
      )}
    </div>
  );
}
