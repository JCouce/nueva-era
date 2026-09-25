import {
  equipoPorId,
  capacidadDePieza,
  PRECIO_CARGADOR_BALAS,
  PRECIO_BATERIA_PORTATIL,
  MATERIAL_TIERS,
  catalogoDeMaterial,
  precioMaterial,
  type Sheet,
  type RecursoInstancia,
  type MaterialTier,
} from "@/lib/rules";
import { HudCard } from "@/components/HudCard";

// RECURSOS (docs/tareas.md, fase 6b): una tarjeta por instancia de pieza
// equipada que rastree un recurso (armas de fuego → balas, subsistemas con
// célula → batería). Compartida entre CharacterSheet.tsx y NpcEditor.tsx,
// mismo patrón que EquipoTab — la única diferencia es si hay `creditos` que
// cobrar al recargar (jugador) o no (NPC, edición libre).
function BotonDelta({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="h-8 w-8 shrink-0 border border-border bg-elevated font-mono text-base leading-none text-foreground active:scale-95 disabled:opacity-30"
    >
      {children}
    </button>
  );
}

export function RecursosTab({
  sheet,
  creditos,
  onAjustar,
  onRecargar,
  onAjustarMaterial,
  onComprarMaterial,
}: {
  sheet: Sheet;
  // Ausente para un NPC: edición libre, sin cartera de créditos que cobrar
  // al recargar/comprar — mismo criterio que EquipoTab.
  creditos?: number;
  onAjustar: (instanciaId: string, delta: number) => void;
  onRecargar: (instanciaId: string) => void;
  onAjustarMaterial: (tier: MaterialTier, delta: number) => void;
  onComprarMaterial: (tier: MaterialTier) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="border-b border-border pb-2 font-mono text-[10px] uppercase tracking-widest text-muted">
        {"//SYSTEM · materiales"}
      </p>
      {MATERIAL_TIERS.map((tier) => {
        const cat = catalogoDeMaterial(tier);
        if (!cat) return null;
        const precio = precioMaterial(tier);
        const sinFondos = creditos !== undefined && precio > creditos;
        return (
          <MaterialCard
            key={tier}
            titulo={cat.label}
            cantidad={sheet.materiales[tier]}
            precio={creditos !== undefined ? precio : null}
            sinFondos={sinFondos}
            onAjustar={(delta) => onAjustarMaterial(tier, delta)}
            onComprar={() => onComprarMaterial(tier)}
          />
        );
      })}

      {sheet.recursos.length === 0 ? (
        <HudCard className="mt-2 border-dashed p-5">
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
            {"//SYSTEM · recursos"}
          </p>
          <p className="mt-2 font-sans text-sm leading-relaxed text-muted">
            No llevas equipado nada que gaste munición o batería. Un arma de fuego o un
            subsistema con célula (Camuflaje Trifásico, Derivación Psiónica...) aparece aquí
            solo con equiparlo.
          </p>
        </HudCard>
      ) : (
        <>
          <p className="mt-2 border-b border-border pb-2 font-mono text-[10px] uppercase tracking-widest text-muted">
            {"//SYSTEM · recursos"}
          </p>
          {sheet.recursos.map((recurso) => {
            const pieza = sheet.equipo.find((p) => p.instanciaId === recurso.instanciaId);
            const cat = pieza ? equipoPorId(pieza.catalogoId) : null;
            if (!pieza || !cat) return null;
            const cap = capacidadDePieza(pieza);
            if (!cap) return null;

            const esStock = cap.tipo === "stock";
            const precio = esStock ? PRECIO_CARGADOR_BALAS : PRECIO_BATERIA_PORTATIL;
            const etiquetaRecarga = esStock ? "Cargador" : "Batería";
            const sinFondos = creditos !== undefined && precio > creditos;

            return (
              <RecursoCard
                key={recurso.instanciaId}
                titulo={cat.label}
                recurso={recurso}
                etiquetaRecarga={etiquetaRecarga}
                precio={creditos !== undefined ? precio : null}
                sinFondos={sinFondos}
                onAjustar={(delta) => onAjustar(recurso.instanciaId, delta)}
                onRecargar={() => onRecargar(recurso.instanciaId)}
              />
            );
          })}
        </>
      )}
    </div>
  );
}

function MaterialCard({
  titulo,
  cantidad,
  precio,
  sinFondos,
  onAjustar,
  onComprar,
}: {
  titulo: string;
  cantidad: number;
  // null: NPC, edición libre, sin precio que enseñar.
  precio: number | null;
  sinFondos: boolean;
  onAjustar: (delta: number) => void;
  onComprar: () => void;
}) {
  return (
    <HudCard className="p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-display text-sm font-semibold uppercase text-foreground">{titulo}</p>
        <p className="font-mono text-lg tabular-nums text-foreground">{cantidad}</p>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <BotonDelta onClick={() => onAjustar(-1)} disabled={cantidad <= 0}>
            −
          </BotonDelta>
          <BotonDelta onClick={() => onAjustar(1)}>+</BotonDelta>
        </div>
        <button
          type="button"
          onClick={onComprar}
          disabled={sinFondos}
          className="clip-chamfer-sm border border-accent bg-accent px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide text-black active:scale-95 disabled:border-border disabled:bg-elevated disabled:text-muted"
        >
          Comprar
          {precio !== null && <span className="ml-1 opacity-80">{precio} cr.</span>}
        </button>
      </div>
    </HudCard>
  );
}

function RecursoCard({
  titulo,
  recurso,
  etiquetaRecarga,
  precio,
  sinFondos,
  onAjustar,
  onRecargar,
}: {
  titulo: string;
  recurso: RecursoInstancia;
  etiquetaRecarga: string;
  // null: NPC, edición libre, sin precio que enseñar.
  precio: number | null;
  sinFondos: boolean;
  onAjustar: (delta: number) => void;
  onRecargar: () => void;
}) {
  const vacio = recurso.actual === 0;
  return (
    <HudCard className="p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-display text-sm font-semibold uppercase text-foreground">{titulo}</p>
        <p
          className={`font-mono text-lg tabular-nums ${vacio ? "text-danger" : "text-foreground"}`}
        >
          {recurso.actual}
          <span className="text-sm text-muted">/{recurso.max}</span>
        </p>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <BotonDelta onClick={() => onAjustar(-1)} disabled={recurso.actual <= 0}>
            −
          </BotonDelta>
          <BotonDelta onClick={() => onAjustar(1)} disabled={recurso.actual >= recurso.max}>
            +
          </BotonDelta>
        </div>
        <button
          type="button"
          onClick={onRecargar}
          disabled={sinFondos}
          className="clip-chamfer-sm border border-accent bg-accent px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide text-black active:scale-95 disabled:border-border disabled:bg-elevated disabled:text-muted"
        >
          {etiquetaRecarga}
          {precio !== null && <span className="ml-1 opacity-80">{precio} cr.</span>}
        </button>
      </div>
    </HudCard>
  );
}
