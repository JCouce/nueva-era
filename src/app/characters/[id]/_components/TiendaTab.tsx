"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { BarraProgreso } from "@/components/BarraProgreso";
import {
  ARMADURAS,
  ARMAS,
  MEJORAS_ESTANDAR,
  SUBSISTEMAS,
  MEJORAS_ARMA,
  MOVIMIENTO,
  ARMAS_MELEE,
  ARMAS_MELEE_KERZUL,
  VALIJA_TACTICA_MEDICA,
  FARMACOS,
  VALIJA_TACTICA_FABRICACION,
  RADAR,
  DISFRAZ_HOLOGRAFICO,
  ESCANER_DETECTOR,
  MATERIALES,
  ARMAMENTO_PESADO,
  MUNICION_GRANADA,
  equipoPorId,
  validarInstalacion,
  nuevaInstanciaId,
  rarezaPermitida,
  type Sheet,
  type PiezaEquipada,
  type Armadura,
  type ArmaFuego,
  type ArmaMelee,
  type TipoArma,
  type MejoraEstandar,
  type Subsistema,
  type MejoraDeArma,
  type MejoraMovimiento,
  type Herramienta,
  type Consumible,
  type ArmaPesada,
  type MunicionGranada,
  type Rareza,
} from "@/lib/rules";
import { Acordeon } from "@/components/Acordeon";
import {
  BadgeRareza,
  DetalleArmadura,
  DetalleArma,
  DetalleArmaMelee,
  DetalleModulo,
  DetalleConsumible,
  DetalleArmaPesada,
  DetalleGranada,
} from "./equipo/PiezaDetalle";

// Las cuatro herramientas con niveles de la categoría "Herramientas" — igual
// que VALIJA_TACTICA_MEDICA en Medicina, ninguna se instala en nada. Arriba
// de CATEGORIAS porque esta ya cuenta cuántas hay.
const HERRAMIENTAS_CON_NIVEL: Herramienta[] = [
  VALIJA_TACTICA_FABRICACION,
  RADAR,
  DISFRAZ_HOLOGRAFICO,
  ESCANER_DETECTOR,
];

// El catálogo entero (~110 piezas) como menú de terminal: un grid de
// categorías —mismo lenguaje que las tiles de Aplicados en AtributosTab— en
// vez de nueve secciones apiladas y siempre visibles. Se elige una y solo esa
// pinta su lista debajo; cambiar de categoría es un tap, no un scroll.
const CATEGORIAS = [
  { id: "armaduras", titulo: "Armaduras", cantidad: ARMADURAS.length },
  { id: "armas", titulo: "Armas de fuego", cantidad: ARMAS.length },
  {
    id: "melee",
    titulo: "Armas melee",
    cantidad: ARMAS_MELEE.length - ARMAS_MELEE_KERZUL.length,
  },
  { id: "kerzul", titulo: "Armas Kerzul", cantidad: ARMAS_MELEE_KERZUL.length },
  { id: "mejorasEstandar", titulo: "Mejoras estándar", cantidad: MEJORAS_ESTANDAR.length },
  { id: "subsistemas", titulo: "Subsistemas", cantidad: SUBSISTEMAS.length },
  { id: "mejorasArma", titulo: "Mejoras de arma", cantidad: MEJORAS_ARMA.length },
  { id: "movimiento", titulo: "Movimiento", cantidad: MOVIMIENTO.length },
  { id: "medicina", titulo: "Medicina", cantidad: 1 + FARMACOS.length },
  { id: "herramientas", titulo: "Herramientas", cantidad: HERRAMIENTAS_CON_NIVEL.length + MATERIALES.length },
  {
    id: "armamentoPesado",
    titulo: "Armamento Pesado",
    cantidad: ARMAMENTO_PESADO.length + MUNICION_GRANADA.length,
  },
] as const;

type CategoriaId = (typeof CATEGORIAS)[number]["id"];

// Mismo orden que el catálogo (catalog/equipo.ts): de la más ligera a la más
// pesada. 39 armas en una sola lista era mucho scroll para encontrar un
// fusil de precisión — subdividir por tipo es lo mismo que ya hace Armas
// Melee/Kerzul, pero dentro de una sola categoría en vez de dos tiles.
const TIPOS_ARMA: { tipo: TipoArma; titulo: string }[] = [
  { tipo: "pistola", titulo: "Pistolas" },
  { tipo: "escopeta", titulo: "Escopetas" },
  { tipo: "subfusil", titulo: "Subfusiles" },
  { tipo: "fusil_asalto", titulo: "Fusiles de Asalto" },
  { tipo: "fusil_precision", titulo: "Fusiles de Precisión" },
  { tipo: "ametralladora", titulo: "Ametralladoras" },
];

// Las únicas cuatro familias que viven dentro de otra pieza (armadura o
// arma): a esas les vale el filtro "solo lo instalable ahora".
const INSTALABLES = new Set<CategoriaId>([
  "mejorasEstandar",
  "subsistemas",
  "mejorasArma",
  "movimiento",
]);

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

function Precio({ coste }: { coste: number | null }) {
  return (
    <span className="whitespace-nowrap font-mono text-[10px] uppercase text-muted">
      {coste === null ? "no se compra" : `${coste} cr.`}
    </span>
  );
}

const BOTON_EQUIPAR =
  "clip-chamfer-sm w-full border border-accent bg-accent py-2 font-display text-xs font-semibold " +
  "uppercase tracking-wide text-black active:scale-95 disabled:border-border disabled:bg-elevated disabled:text-muted";

const VINCULANDO_MS = 900;
const VINCULADO_MS = 550;

// El equipar en sí es instantáneo (estado optimista, ver CharacterSheet), así
// que la secuencia de abajo no espera a nada real: es la confirmación táctil
// de "esto se ha instalado", no una carga. Tres fases con el mismo lenguaje
// que el resto de la ficha — mono/info para "el sistema está trabajando",
// display/accent-glow para el resultado, como el crítico en TiradasTab.
function BotonEquipar({
  onClick,
  disabled = false,
  className = "",
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const [fase, setFase] = useState<"lista" | "vinculando" | "vinculado">("lista");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const t = timers.current;
    return () => t.forEach(clearTimeout);
  }, []);

  const disparar = () => {
    onClick();
    setFase("vinculando");
    timers.current.push(setTimeout(() => setFase("vinculado"), VINCULANDO_MS));
    timers.current.push(setTimeout(() => setFase("lista"), VINCULANDO_MS + VINCULADO_MS));
  };

  if (fase === "vinculando") {
    return (
      <button
        type="button"
        disabled
        className={`clip-chamfer-sm w-full border border-info bg-elevated px-3 py-2 text-center ${className}`}
      >
        <span className="font-mono text-[11px] uppercase tracking-widest text-info">
          {"// vinculando"}
          <span className="animate-pulse">_</span>
        </span>
        <BarraProgreso ms={VINCULANDO_MS} />
      </button>
    );
  }
  if (fase === "vinculado") {
    return (
      <button
        type="button"
        disabled
        className={`clip-chamfer-sm w-full border border-accent bg-elevated py-2 font-display text-xs font-semibold uppercase tracking-wide text-accent shadow-glow-yellow ${className}`}
      >
        ✓ Equipado
      </button>
    );
  }
  return (
    <button type="button" disabled={disabled} onClick={disparar} className={`${BOTON_EQUIPAR} ${className}`}>
      {children}
    </button>
  );
}

// Armas, armaduras, armas melee y consumibles (fármacos) no necesitan dónde
// instalarse: un botón y ya — salvo que no llegue el saldo o se pase de la
// rareza que permite la letra de Recursos, entonces se bloquea igual que
// AccionInstalable bloquea por falta de hueco.
function AccionSimple({
  pieza,
  creditos,
  topeRareza,
  onEquipar,
}: {
  pieza: Armadura | ArmaFuego | ArmaMelee | Consumible | ArmaPesada | MunicionGranada;
  creditos: number;
  topeRareza: Rareza | null;
  onEquipar: (p: PiezaEquipada) => void;
}) {
  const coste = pieza.coste ?? 0;
  const sinFondos = coste > creditos;
  const sinRareza = topeRareza !== null && !rarezaPermitida(pieza.rareza, topeRareza);
  return (
    <>
      <BotonEquipar
        className="mt-3"
        disabled={sinFondos || sinRareza}
        onClick={() => onEquipar({ instanciaId: nuevaInstanciaId(), catalogoId: pieza.id })}
      >
        Equipar
      </BotonEquipar>
      {sinRareza && (
        <p className="mt-1 font-sans text-[11px] leading-relaxed text-danger">
          Tu letra de Recursos no llega a {pieza.rareza}: tope {topeRareza}.
        </p>
      )}
      {sinFondos && (
        <p className="mt-1 font-sans text-[11px] leading-relaxed text-danger">
          Te faltan {(coste - creditos).toLocaleString("es-ES")} créditos.
        </p>
      )}
    </>
  );
}

// Mejoras estándar y subsistemas necesitan una armadura donde vivir; las
// mejoras de arma, un arma. Mismo flujo en los dos casos — "¿dónde lo
// instalas?" y, si no hay hueco o no es compatible, el motivo —
// validarInstalacion ya lo explica y ya sabe distinguir un host de otro,
// aquí solo se elige la lista y se muestra.
function AccionInstalable({
  pieza,
  sheet,
  creditos,
  topeRareza,
  onEquipar,
}: {
  pieza: MejoraEstandar | Subsistema | MejoraDeArma | MejoraMovimiento;
  sheet: Sheet;
  creditos: number;
  topeRareza: Rareza | null;
  onEquipar: (p: PiezaEquipada) => void;
}) {
  const [nivel, setNivel] = useState(pieza.niveles[0].nivel);
  const familiaHost = pieza.familia === "mejoraArma" ? "arma" : "armadura";
  const hosts = sheet.equipo.filter((p) => equipoPorId(p.catalogoId)?.familia === familiaHost);
  const sinHostTexto =
    familiaHost === "armadura"
      ? "Necesitas tener puesta una armadura para instalarlo."
      : "Necesitas tener un arma equipada para instalarlo.";
  const nivelInfo = pieza.niveles.find((n) => n.nivel === nivel);
  const costeNivel = nivelInfo?.coste ?? 0;
  const sinFondos = costeNivel > creditos;
  const sinRareza =
    topeRareza !== null && !!nivelInfo && !rarezaPermitida(nivelInfo.rareza, topeRareza);

  return (
    <div className="mt-3 border-t border-border pt-3">
      {pieza.niveles.length > 1 && (
        <>
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
              {"// Nivel a instalar"}
            </p>
            <Precio coste={costeNivel} />
          </div>
          <div className="mt-1.5 flex gap-1">
            {pieza.niveles.map((n) => (
              <button
                key={n.nivel}
                type="button"
                onClick={() => setNivel(n.nivel)}
                className={`clip-chamfer-sm flex-1 border py-1.5 font-mono text-xs active:scale-95 ${
                  nivel === n.nivel ? "border-accent text-accent" : "border-border text-muted"
                }`}
              >
                {n.nivel}
              </button>
            ))}
          </div>
        </>
      )}

      <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-muted">
        {"// Instalar en"}
      </p>
      {hosts.length === 0 ? (
        <p className="mt-1.5 font-sans text-[11px] leading-relaxed text-danger">{sinHostTexto}</p>
      ) : (
        <div className="mt-1.5 flex flex-col gap-2">
          {hosts.map((h) => {
            const cat = equipoPorId(h.catalogoId)!;
            const v = validarInstalacion(sheet, pieza.id, h.instanciaId, nivel);
            const motivo = !v.ok
              ? v.motivo
              : sinRareza
                ? `Tu letra de Recursos no llega a ${nivelInfo!.rareza}: tope ${topeRareza}.`
                : sinFondos
                  ? `Te faltan ${(costeNivel - creditos).toLocaleString("es-ES")} créditos.`
                  : null;
            return (
              <div key={h.instanciaId}>
                <BotonEquipar
                  disabled={!v.ok || sinFondos || sinRareza}
                  onClick={() =>
                    onEquipar({
                      instanciaId: nuevaInstanciaId(),
                      catalogoId: pieza.id,
                      nivel,
                      instaladoEnId: h.instanciaId,
                    })
                  }
                >
                  Equipar en {cat.label}
                </BotonEquipar>
                {motivo && (
                  <p className="mt-1 font-sans text-[11px] leading-relaxed text-danger">
                    {motivo}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Herramientas (Valija Táctica Médica, y lo que llegue después): elige
// nivel y equipa directo — a diferencia de AccionInstalable, no hay paso de
// "instalar en X", porque no viven dentro de ninguna otra pieza.
function AccionHerramienta({
  pieza,
  creditos,
  topeRareza,
  onEquipar,
}: {
  pieza: Herramienta;
  creditos: number;
  topeRareza: Rareza | null;
  onEquipar: (p: PiezaEquipada) => void;
}) {
  const [nivel, setNivel] = useState(pieza.niveles[0].nivel);
  const nivelInfo = pieza.niveles.find((n) => n.nivel === nivel);
  const costeNivel = nivelInfo?.coste ?? 0;
  const sinFondos = costeNivel > creditos;
  const sinRareza =
    topeRareza !== null && !!nivelInfo && !rarezaPermitida(nivelInfo.rareza, topeRareza);
  const motivo = sinRareza
    ? `Tu letra de Recursos no llega a ${nivelInfo!.rareza}: tope ${topeRareza}.`
    : sinFondos
      ? `Te faltan ${(costeNivel - creditos).toLocaleString("es-ES")} créditos.`
      : null;

  return (
    <div className="mt-3 border-t border-border pt-3">
      {pieza.niveles.length > 1 && (
        <>
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
              {"// Nivel"}
            </p>
            <Precio coste={costeNivel} />
          </div>
          <div className="mt-1.5 flex gap-1">
            {pieza.niveles.map((n) => (
              <button
                key={n.nivel}
                type="button"
                onClick={() => setNivel(n.nivel)}
                className={`clip-chamfer-sm flex-1 border py-1.5 font-mono text-xs active:scale-95 ${
                  nivel === n.nivel ? "border-accent text-accent" : "border-border text-muted"
                }`}
              >
                {n.nivel}
              </button>
            ))}
          </div>
        </>
      )}
      <BotonEquipar
        className="mt-3"
        disabled={sinFondos || sinRareza}
        onClick={() => onEquipar({ instanciaId: nuevaInstanciaId(), catalogoId: pieza.id, nivel })}
      >
        Equipar
      </BotonEquipar>
      {motivo && <p className="mt-1 font-sans text-[11px] leading-relaxed text-danger">{motivo}</p>}
    </div>
  );
}

// Instalable o ya instalada: si solo mirásemos "instalable ahora mismo",
// equipar algo lo saca de la lista en cuanto se instala (ya no hay hueco
// libre para él) y la pieza desaparece de debajo del propio botón que
// acabas de pulsar, cortando en seco la animación de BotonEquipar. Contar
// también lo ya puesto evita ese parpadeo y de paso deja ver aquí mismo qué
// llevas encima, sin saltar a la tab Equipo.
function relevanteAhora(
  sheet: Sheet,
  pieza: MejoraEstandar | Subsistema | MejoraDeArma | MejoraMovimiento,
): boolean {
  const familiaHost = pieza.familia === "mejoraArma" ? "arma" : "armadura";
  const hosts = sheet.equipo.filter((p) => equipoPorId(p.catalogoId)?.familia === familiaHost);
  const yaInstalada = sheet.equipo.some((p) => p.catalogoId === pieza.id && p.instaladoEnId);
  if (yaInstalada) return true;
  return hosts.some((h) =>
    pieza.niveles.some((n) => validarInstalacion(sheet, pieza.id, h.instanciaId, n.nivel).ok),
  );
}

const SIN_COMPATIBLES: Record<
  Exclude<
    CategoriaId,
    "armaduras" | "armas" | "melee" | "kerzul" | "medicina" | "herramientas" | "armamentoPesado"
  >,
  string
> = {
  mejorasEstandar: "Nada instalable ni instalado: necesitas una armadura equipada.",
  subsistemas: "Nada instalable ni instalado: necesitas una armadura equipada con ranuras libres.",
  mejorasArma: "Nada instalable ni instalado: necesitas un arma equipada y compatible.",
  movimiento: "Nada instalable ni instalado: necesitas una armadura equipada que admita movimiento.",
};

// Las cuatro categorías "instalables" comparten forma: filtrar por
// compatibilidad, y si eso las vacía, explicar por qué en vez de dejar el
// hueco en blanco.
function ListaInstalable({
  piezas,
  mensajeVacio,
  sheet,
  creditos,
  topeRareza,
  onEquipar,
}: {
  piezas: readonly (MejoraEstandar | Subsistema | MejoraDeArma | MejoraMovimiento)[];
  mensajeVacio: string;
  sheet: Sheet;
  creditos: number;
  topeRareza: Rareza | null;
  onEquipar: (p: PiezaEquipada) => void;
}) {
  if (piezas.length === 0) {
    return <p className="font-sans text-[11px] leading-relaxed text-muted">{mensajeVacio}</p>;
  }
  return (
    <>
      {piezas.map((p) => (
        <Acordeon key={p.id} titulo={p.label} resumen={p.resumen}>
          <DetalleModulo p={p} />
          <AccionInstalable
            pieza={p}
            sheet={sheet}
            creditos={creditos}
            topeRareza={topeRareza}
            onEquipar={onEquipar}
          />
        </Acordeon>
      ))}
    </>
  );
}

export function TiendaTab({
  sheet,
  creditos,
  topeRareza,
  // NPC (fase 6b 5.1): el máster no tiene cartera que gastar ni tope de
  // rareza (mismo criterio que master/npcs/actions.ts) — todo el catálogo
  // sale siempre "asequible" y se oculta el número de créditos, que aquí no
  // significaría nada real.
  libre = false,
  onEquipar,
}: {
  sheet: Sheet;
  creditos?: number;
  topeRareza: Rareza | null;
  libre?: boolean;
  onEquipar: (p: PiezaEquipada) => void;
}) {
  const [categoria, setCategoria] = useState<CategoriaId>("armaduras");
  const [soloCompatible, setSoloCompatible] = useState(false);
  const creditosEfectivos = libre ? Number.POSITIVE_INFINITY : creditos!;

  const filtrar = <T extends MejoraEstandar | Subsistema | MejoraDeArma | MejoraMovimiento>(
    piezas: readonly T[],
  ) => (soloCompatible ? piezas.filter((p) => relevanteAhora(sheet, p)) : piezas);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
        <div className="flex flex-col gap-0.5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
            {"//SYSTEM · catálogo"}
          </p>
          {topeRareza && (
            <p className="font-mono text-[10px] uppercase text-muted">
              Tope de rareza en creación: <span className="text-foreground">{topeRareza}</span>
            </p>
          )}
        </div>
        {libre ? (
          <p className="font-mono text-[10px] uppercase tracking-widest text-info">Edición libre</p>
        ) : (
          <p className="font-mono text-sm tabular-nums text-accent">
            {creditos!.toLocaleString("es-ES")} <span className="text-[10px] text-muted">cr.</span>
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {CATEGORIAS.map((c) => (
          <Tile
            key={c.id}
            titulo={c.titulo}
            cantidad={c.cantidad}
            activo={categoria === c.id}
            onClick={() => setCategoria(c.id)}
          />
        ))}
      </div>

      <div className="flex items-center justify-between gap-2 border-b border-border pb-1">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted">
          {CATEGORIAS.find((c) => c.id === categoria)!.titulo}
        </h2>
        {INSTALABLES.has(categoria) && (
          <button
            type="button"
            onClick={() => setSoloCompatible((v) => !v)}
            className={`clip-chamfer-sm shrink-0 border px-2 py-1 font-mono text-[10px] uppercase tracking-wide active:scale-95 ${
              soloCompatible ? "border-info text-info" : "border-border text-muted"
            }`}
          >
            {soloCompatible ? "✓ " : ""}Instalable o instalado
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {categoria === "armaduras" &&
          ARMADURAS.map((p) => (
            <Acordeon
              key={p.id}
              titulo={p.label}
              resumen={p.resumen}
              etiqueta={
                <div className="flex flex-col items-end gap-1">
                  <BadgeRareza rareza={p.rareza} />
                  <Precio coste={p.coste} />
                </div>
              }
            >
              <DetalleArmadura p={p} />
              <AccionSimple pieza={p} creditos={creditosEfectivos} topeRareza={topeRareza} onEquipar={onEquipar} />
            </Acordeon>
          ))}

        {categoria === "armas" &&
          TIPOS_ARMA.map(({ tipo, titulo }) => {
            const piezas = ARMAS.filter((p) => p.tipo === tipo);
            if (piezas.length === 0) return null;
            return (
              <div key={tipo} className="flex flex-col gap-2">
                <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-muted">
                  {`// ${titulo} · ${piezas.length}`}
                </p>
                {piezas.map((p) => (
                  <Acordeon
                    key={p.id}
                    titulo={p.label}
                    resumen={p.resumen}
                    etiqueta={
                      <div className="flex flex-col items-end gap-1">
                        <BadgeRareza rareza={p.rareza} />
                        <Precio coste={p.coste} />
                      </div>
                    }
                  >
                    <DetalleArma p={p} />
                    <AccionSimple pieza={p} creditos={creditosEfectivos} topeRareza={topeRareza} onEquipar={onEquipar} />
                  </Acordeon>
                ))}
              </div>
            );
          })}

        {categoria === "mejorasEstandar" && (
          <ListaInstalable
            piezas={filtrar(MEJORAS_ESTANDAR)}
            mensajeVacio={SIN_COMPATIBLES.mejorasEstandar}
            sheet={sheet}
            creditos={creditosEfectivos}
            topeRareza={topeRareza}
            onEquipar={onEquipar}
          />
        )}

        {categoria === "subsistemas" && (
          <ListaInstalable
            piezas={filtrar(SUBSISTEMAS)}
            mensajeVacio={SIN_COMPATIBLES.subsistemas}
            sheet={sheet}
            creditos={creditosEfectivos}
            topeRareza={topeRareza}
            onEquipar={onEquipar}
          />
        )}

        {categoria === "mejorasArma" && (
          <ListaInstalable
            piezas={filtrar(MEJORAS_ARMA)}
            mensajeVacio={SIN_COMPATIBLES.mejorasArma}
            sheet={sheet}
            creditos={creditosEfectivos}
            topeRareza={topeRareza}
            onEquipar={onEquipar}
          />
        )}

        {categoria === "movimiento" && (
          <ListaInstalable
            piezas={filtrar(MOVIMIENTO)}
            mensajeVacio={SIN_COMPATIBLES.movimiento}
            sheet={sheet}
            creditos={creditosEfectivos}
            topeRareza={topeRareza}
            onEquipar={onEquipar}
          />
        )}

        {categoria === "melee" &&
          ARMAS_MELEE.filter((p) => !ARMAS_MELEE_KERZUL.includes(p)).map((p) => (
            <Acordeon
              key={p.id}
              titulo={p.label}
              resumen={p.resumen}
              etiqueta={
                <div className="flex flex-col items-end gap-1">
                  <BadgeRareza rareza={p.rareza} />
                  <Precio coste={p.coste} />
                </div>
              }
            >
              <DetalleArmaMelee p={p} />
              <AccionSimple pieza={p} creditos={creditosEfectivos} topeRareza={topeRareza} onEquipar={onEquipar} />
            </Acordeon>
          ))}

        {categoria === "kerzul" &&
          ARMAS_MELEE_KERZUL.map((p) => (
            <Acordeon
              key={p.id}
              titulo={p.label}
              resumen={p.resumen}
              etiqueta={
                <div className="flex flex-col items-end gap-1">
                  <BadgeRareza rareza={p.rareza} />
                  <Precio coste={p.coste} />
                </div>
              }
            >
              <DetalleArmaMelee p={p} />
              <AccionSimple pieza={p} creditos={creditosEfectivos} topeRareza={topeRareza} onEquipar={onEquipar} />
            </Acordeon>
          ))}

        {categoria === "medicina" && (
          <>
            <Acordeon
              key={VALIJA_TACTICA_MEDICA.id}
              titulo={VALIJA_TACTICA_MEDICA.label}
              resumen={VALIJA_TACTICA_MEDICA.resumen}
            >
              <DetalleModulo p={VALIJA_TACTICA_MEDICA} />
              <AccionHerramienta
                pieza={VALIJA_TACTICA_MEDICA}
                creditos={creditosEfectivos}
                topeRareza={topeRareza}
                onEquipar={onEquipar}
              />
            </Acordeon>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-muted">
              {`// Fármacos · ${FARMACOS.length}`}
            </p>
            {FARMACOS.map((p) => (
              <Acordeon
                key={p.id}
                titulo={p.label}
                resumen={p.resumen}
                etiqueta={
                  <div className="flex flex-col items-end gap-1">
                    <BadgeRareza rareza={p.rareza} />
                    <Precio coste={p.coste} />
                  </div>
                }
              >
                <DetalleConsumible p={p} />
                <AccionSimple pieza={p} creditos={creditosEfectivos} topeRareza={topeRareza} onEquipar={onEquipar} />
              </Acordeon>
            ))}
          </>
        )}

        {categoria === "herramientas" && (
          <>
            {HERRAMIENTAS_CON_NIVEL.map((h) => (
              <Acordeon key={h.id} titulo={h.label} resumen={h.resumen}>
                <DetalleModulo p={h} />
                <AccionHerramienta
                  pieza={h}
                  creditos={creditosEfectivos}
                  topeRareza={topeRareza}
                  onEquipar={onEquipar}
                />
              </Acordeon>
            ))}
            <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-muted">
              {`// Materiales · ${MATERIALES.length}`}
            </p>
            {MATERIALES.map((p) => (
              <Acordeon
                key={p.id}
                titulo={p.label}
                resumen={p.resumen}
                etiqueta={
                  <div className="flex flex-col items-end gap-1">
                    <BadgeRareza rareza={p.rareza} />
                    <Precio coste={p.coste} />
                  </div>
                }
              >
                <DetalleConsumible p={p} />
                <AccionSimple pieza={p} creditos={creditosEfectivos} topeRareza={topeRareza} onEquipar={onEquipar} />
              </Acordeon>
            ))}
          </>
        )}

        {categoria === "armamentoPesado" && (
          <>
            {ARMAMENTO_PESADO.map((p) => (
              <Acordeon
                key={p.id}
                titulo={p.label}
                resumen={p.resumen}
                etiqueta={
                  <div className="flex flex-col items-end gap-1">
                    <BadgeRareza rareza={p.rareza} />
                    <Precio coste={p.coste} />
                  </div>
                }
              >
                <DetalleArmaPesada p={p} />
                <AccionSimple pieza={p} creditos={creditosEfectivos} topeRareza={topeRareza} onEquipar={onEquipar} />
              </Acordeon>
            ))}
            <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-muted">
              {`// Granadas · ${MUNICION_GRANADA.length}`}
            </p>
            {MUNICION_GRANADA.map((p) => (
              <Acordeon
                key={p.id}
                titulo={p.label}
                resumen={p.areaEfecto}
                etiqueta={
                  <div className="flex flex-col items-end gap-1">
                    <BadgeRareza rareza={p.rareza} />
                    <Precio coste={p.coste} />
                  </div>
                }
              >
                <DetalleGranada p={p} />
                <AccionSimple pieza={p} creditos={creditosEfectivos} topeRareza={topeRareza} onEquipar={onEquipar} />
              </Acordeon>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
