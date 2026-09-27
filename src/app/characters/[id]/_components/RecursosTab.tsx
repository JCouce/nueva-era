import {
  equipoPorId,
  capacidadDePieza,
  PRECIO_CARGADOR_BALAS,
  PRECIO_BATERIA_PORTATIL,
  MATERIAL_TIERS,
  catalogoDeMaterial,
  precioMaterial,
  MUNICION_GRANADA,
  salud,
  type Sheet,
  type RecursoInstancia,
  type MaterialTier,
} from "@/lib/rules";
import { HudCard } from "@/components/HudCard";
import { BarraVital, type TonoVital } from "@/components/BarraVital";

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
  onAjustarGranada,
  onAjustarVida,
  onAjustarFatiga,
}: {
  sheet: Sheet;
  // Ausente para un NPC: edición libre, sin cartera de créditos que cobrar
  // al recargar/comprar — mismo criterio que EquipoTab.
  creditos?: number;
  onAjustar: (instanciaId: string, delta: number) => void;
  onRecargar: (instanciaId: string) => void;
  onAjustarMaterial: (tier: MaterialTier, delta: number) => void;
  onComprarMaterial: (tier: MaterialTier) => void;
  onAjustarGranada: (catalogoId: string, delta: number) => void;
  onAjustarVida: (delta: number) => void;
  onAjustarFatiga: (delta: number) => void;
}) {
  const { vida, fatiga } = salud(sheet);
  // Solo los tipos que ya se poseen (docs/tareas.md, 2026-09-27) — para
  // descubrir/comprar tipos nuevos ya está Tienda, que es donde se compran
  // (comprar NO vive aquí, a diferencia de Materiales: 14 piezas con ficha
  // propia se quedan en su sitio de siempre, no las 3 cifras genéricas de
  // Materiales). Orden de catálogo.
  const granadasEnStock = MUNICION_GRANADA.filter((g) => (sheet.granadas[g.id] ?? 0) > 0);

  // Tres categorías, para que la lista no sea un totum revolutum: Materiales
  // (pool de personaje, más abajo), munición/batería y durabilidad se
  // separan aquí porque son conceptos distintos aunque compartan el mismo
  // array (sheet.recursos) por debajo.
  const recursosMunicionBateria = sheet.recursos.flatMap((recurso) => {
    const pieza = sheet.equipo.find((p) => p.instanciaId === recurso.instanciaId);
    const cat = pieza ? equipoPorId(pieza.catalogoId) : null;
    if (!pieza || !cat) return [];
    const cap = capacidadDePieza(pieza);
    if (!cap || cap.tipo === "durabilidad") return [];
    return [{ recurso, cat, cap }];
  });

  // Durabilidad (hoy solo Escudos): el −/+ manual vive aquí, igual que
  // munición/batería — para anotar daño recibido en combate (sin mecanismo
  // automático todavía) o corregir a mano. Reparar GASTANDO Materiales sigue
  // en Acciones (sección Reparación) — dos caminos para el mismo número,
  // igual que munición ya tiene el −/+ manual Y el botón "Cargador" de pago.
  const recursosDurabilidad = sheet.recursos.flatMap((recurso) => {
    const pieza = sheet.equipo.find((p) => p.instanciaId === recurso.instanciaId);
    const cat = pieza ? equipoPorId(pieza.catalogoId) : null;
    if (!pieza || !cat) return [];
    const cap = capacidadDePieza(pieza);
    if (!cap || cap.tipo !== "durabilidad") return [];
    return [{ recurso, cat }];
  });

  // Colchón (hoy solo Malla Plasmática, docs/tareas.md 2026-09-27): mismo
  // shape/PG que durabilidad, pero es un buffer que se regenera con el
  // tiempo (manual, sin turnos automatizados) en vez de repararse con
  // Materiales — categoría propia para no mezclar los dos conceptos.
  const recursosColchon = sheet.recursos.flatMap((recurso) => {
    const pieza = sheet.equipo.find((p) => p.instanciaId === recurso.instanciaId);
    const cat = pieza ? equipoPorId(pieza.catalogoId) : null;
    if (!pieza || !cat) return [];
    const cap = capacidadDePieza(pieza);
    if (!cap || cap.tipo !== "colchon") return [];
    return [{ recurso, cat }];
  });

  return (
    <div className="flex flex-col gap-3">
      <p className="border-b border-border pb-2 font-mono text-[10px] uppercase tracking-widest text-muted">
        {"//SYSTEM · vida y fatiga"}
      </p>
      <EstadoCard
        titulo="Vida"
        actual={sheet.vidaActual}
        max={vida}
        tono="danger"
        onAjustar={onAjustarVida}
      />
      {/* Escudo (colchón de Malla Plasmática) justo debajo de Vida, pedido
          del usuario 2026-09-27 — mismo criterio que un HUD de videojuego:
          vida y su escudo van juntos, fatiga es un recurso aparte. */}
      {recursosColchon.map(({ recurso, cat }) => (
        <EstadoCard
          key={recurso.instanciaId}
          titulo={cat.label}
          actual={recurso.actual}
          max={recurso.max}
          tono="glitch"
          onAjustar={(delta) => onAjustar(recurso.instanciaId, delta)}
        />
      ))}
      <EstadoCard
        titulo="Fatiga"
        actual={sheet.fatigaActual}
        max={fatiga}
        tono="info"
        onAjustar={onAjustarFatiga}
      />

      <p className="mt-2 border-b border-border pb-2 font-mono text-[10px] uppercase tracking-widest text-muted">
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

      {granadasEnStock.length === 0 ? (
        <HudCard className="mt-2 border-dashed p-5">
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
            {"//SYSTEM · granadas"}
          </p>
          <p className="mt-2 font-sans text-sm leading-relaxed text-muted">
            No llevas ninguna granada — cómpralas en la Tienda.
          </p>
        </HudCard>
      ) : (
        <>
          <p className="mt-2 border-b border-border pb-2 font-mono text-[10px] uppercase tracking-widest text-muted">
            {"//SYSTEM · granadas"}
          </p>
          {granadasEnStock.map((g) => (
            <GranadaCard
              key={g.id}
              titulo={g.label}
              cantidad={sheet.granadas[g.id] ?? 0}
              onAjustar={(delta) => onAjustarGranada(g.id, delta)}
            />
          ))}
        </>
      )}

      {recursosMunicionBateria.length === 0 ? (
        <HudCard className="mt-2 border-dashed p-5">
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
            {"//SYSTEM · equipo · munición y batería"}
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
            {"//SYSTEM · equipo · munición y batería"}
          </p>
          {recursosMunicionBateria.map(({ recurso, cat, cap }) => {
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

      {recursosDurabilidad.length === 0 ? (
        <HudCard className="mt-2 border-dashed p-5">
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
            {"//SYSTEM · equipo · durabilidad"}
          </p>
          <p className="mt-2 font-sans text-sm leading-relaxed text-muted">
            No llevas equipado nada con durabilidad propia. Un Escudo aparece aquí solo con
            equiparlo — para repararlo gastando Materiales, ve a Acciones.
          </p>
        </HudCard>
      ) : (
        <>
          <p className="mt-2 border-b border-border pb-2 font-mono text-[10px] uppercase tracking-widest text-muted">
            {"//SYSTEM · equipo · durabilidad"}
          </p>
          {recursosDurabilidad.map(({ recurso, cat }) => (
            <DurabilidadCard
              key={recurso.instanciaId}
              titulo={cat.label}
              recurso={recurso}
              onAjustar={(delta) => onAjustar(recurso.instanciaId, delta)}
            />
          ))}
        </>
      )}

    </div>
  );
}

// Vida/Fatiga/colchón: la barra segmentada de BarraVital + el +/- manual de
// siempre debajo. Las tres comparten esqueleto, solo cambian etiqueta/tono.
function EstadoCard({
  titulo,
  actual,
  max,
  tono,
  onAjustar,
}: {
  titulo: string;
  actual: number;
  max: number;
  tono: TonoVital;
  onAjustar: (delta: number) => void;
}) {
  return (
    <HudCard className="p-3">
      <BarraVital label={titulo} actual={actual} max={max} tono={tono} />
      <div className="mt-2 flex items-center gap-1.5">
        <BotonDelta onClick={() => onAjustar(-1)} disabled={actual <= 0}>
          −
        </BotonDelta>
        <BotonDelta onClick={() => onAjustar(1)} disabled={actual >= max}>
          +
        </BotonDelta>
      </div>
    </HudCard>
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

function DurabilidadCard({
  titulo,
  recurso,
  onAjustar,
}: {
  titulo: string;
  recurso: RecursoInstancia;
  onAjustar: (delta: number) => void;
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
          <span className="text-sm text-muted">/{recurso.max} PG</span>
        </p>
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <BotonDelta onClick={() => onAjustar(-1)} disabled={recurso.actual <= 0}>
          −
        </BotonDelta>
        <BotonDelta onClick={() => onAjustar(1)} disabled={recurso.actual >= recurso.max}>
          +
        </BotonDelta>
      </div>
    </HudCard>
  );
}

// Granadas: solo cantidad + −/+ manual (gasto en partida) — sin botón
// comprar, eso se queda en Tienda (docs/tareas.md, 2026-09-27). Mismo
// esqueleto que DurabilidadCard, sin denominador "/max": aquí no hay tope.
function GranadaCard({
  titulo,
  cantidad,
  onAjustar,
}: {
  titulo: string;
  cantidad: number;
  onAjustar: (delta: number) => void;
}) {
  return (
    <HudCard className="p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-display text-sm font-semibold uppercase text-foreground">{titulo}</p>
        <p className="font-mono text-lg tabular-nums text-foreground">{cantidad}</p>
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <BotonDelta onClick={() => onAjustar(-1)} disabled={cantidad <= 0}>
          −
        </BotonDelta>
        <BotonDelta onClick={() => onAjustar(1)}>+</BotonDelta>
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
