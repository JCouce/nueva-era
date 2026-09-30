"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  ACCIONES,
  GRUPOS_ACCION,
  APLICADOS,
  HABILIDADES,
  modificadorAccion,
  resolverTirada,
  resolverDanio,
  resolverVuelo,
  gastoTotal,
  gastoMunicionEspecial,
  municionEspecialElegida,
  accionesDeAtaque,
  accionesDirectasDeAtaque,
  accionesDeHerramientas,
  accionesDirectasDeHerramientas,
  accionesDeMovimiento,
  accionesDeFarmacos,
  accionesDirectasDeFarmacos,
  recursoDe,
  valorCondiciones,
  valorBonosTramo,
  modificadoresActivos,
  aplicado,
  modificadoresDeEstados,
  indiceDeCondiciones,
  consultaIndiceCondiciones,
  bonoAlcance,
  modoElegido,
  accionesDePsionica,
  etiquetaEconomia,
  textoValor,
  resolverPoder,
  valoresHabilidad,
  efectosDeCasillas,
  FUENTES_EXTERNAS_FATIGA,
  derivacionDeFicha,
  pagoConCargas,
  maxPuntosConCargas,
  tiradaDePoder,
  enEspecialidadDePoder,
  aplicados,
  costeFatiga,
  bloqueoPorFatiga,
  togglesDeFatiga,
  fatigaEfectiva,
  usarHabilidadAlternativa,
  conEsquivaLevitando,
  conPsionicaEnTiradaFija,
  etiquetaPoder,
  cruzaSobrecarga,
  dificultadSobrecarga,
  danioSobrecarga,
  gradoDeTirada,
  salud,
  tirarD12,
  type PoderDisponible,
  type Accion,
  type AccionDirecta,
  type Sheet,
  type EstadoCondiciones,
  type EstadoActivo,
  type ModificadorConFuente,
  type MaterialTier,
} from "@/lib/rules";
import { HudCard } from "@/components/HudCard";
import { AccionModal } from "@/components/AccionModal";
import { UsarModal } from "@/components/UsarModal";
import { SacrificioRecursoModal } from "@/components/SacrificioRecursoModal";
import { ReparaFabricaModal } from "./ReparaFabricaModal";
import { BloquearDanioModal } from "./BloquearDanioModal";
import { CabeceraPoder } from "./CabeceraPoder";
import { SobrecargaPanel } from "./SobrecargaPanel";
import { UsarPoderModal } from "./UsarPoderModal";
import { type DanioInfo, type Lanzamiento } from "@/components/ResultadoTirada";

function signo(n: number) {
  return n >= 0 ? `+${n}` : `${n}`;
}

function sumaAjustesFijos(tirada: Accion): number {
  return (tirada.ajustesFijos ?? []).reduce((t, a) => t + a.valor, 0);
}

// Color por resultado — mismas 4 categorías que ya usa ContenidoResultado
// (tono), reutilizadas aquí para que el historial compacto hable el mismo
// idioma que la vista completa: acento = éxito crítico, cian = éxito,
// peligro = pifia (fracaso crítico), apagado = fracaso.
function tonoResultado(h: Lanzamiento): string {
  if (h.sinDado) return "text-info";
  if (h.exito === null) return "text-foreground";
  if (h.exito) return h.critico ? "text-accent" : "text-info";
  return h.critico ? "text-danger" : "text-muted";
}

// "3 éxitos" / "1 fracaso" / "2 fracasos" — o el total a secas si la tirada
// no llevaba dificultad (no hay margen que contar). "usado", sin más, para
// una AccionDirecta (sinDado) — no hay dado ni margen que resumir.
function textoExitos(h: Lanzamiento): string {
  if (h.sinDado) return "usado";
  if (h.margen === null) return `total ${h.total}`;
  const n = Math.abs(h.margen);
  return h.margen >= 0 ? `${n} éxito${n === 1 ? "" : "s"}` : `${n} fracaso${n === 1 ? "" : "s"}`;
}

// Una fila del historial — reemplaza al Marcador de antes (2026-09-23/24):
// mostrar solo la última tirada, sola, en su propio panel, no compensaba
// (se perdía al cambiar de tab y no aportaba mucho estéticamente). Ahora es
// una lista compacta de las últimas tiradas (acotado a 6, ver `tirar()` más
// abajo), "Nombre --- N éxitos", coloreada por
// resultado — pedido explícito del usuario. El detalle completo (dado,
// modificador, avisos de condiciones) sigue viviendo en AccionModal mientras
// se tira; esto es el log, no un sustituto de esa vista.
function FilaHistorial({ h }: { h: Lanzamiento }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-border py-1.5 font-mono text-[11px] last:border-0">
      <span className="truncate text-muted">{h.label}</span>
      <span className={`shrink-0 tabular-nums ${tonoResultado(h)}`}>
        {textoExitos(h)}
        {h.danioResuelto && <span className="text-danger"> · daño {h.danioResuelto.total}</span>}
        {h.vueloResuelto && (
          <span className="text-info">
            {" · "}
            {h.vueloResuelto.descontrolado ? "descontrolado" : `vuelas ${h.vueloResuelto.metros}m`}
          </span>
        )}
      </span>
    </div>
  );
}

function FilaTirada({
  tirada,
  sheet,
  mods,
  onAbrir,
}: {
  tirada: Accion;
  sheet: Sheet;
  mods: ModificadorConFuente[];
  onAbrir: (t: Accion, enEspecialidad: boolean, sutilActivo: boolean) => void;
}) {
  const [enEspecialidad, setEnEspecialidad] = useState(false);
  // Sutil (Feature 1, docs/equipamiento.md:848-850): pre-seleccionado por el
  // aplicado que dé más bonificador de ATAQUE, no de daño — es la parte que
  // decide si conviene tirar. Lazy initializer: solo se calcula una vez, al
  // montar la fila.
  const [sutilActivo, setSutilActivo] = useState(() =>
    tirada.aplicadoSutil
      ? aplicado(sheet, tirada.aplicadoSutil, mods) > aplicado(sheet, tirada.aplicado, mods)
      : false,
  );

  // Habilidad alternativa (Levitando: Física): con la casilla marcada la fila y
  // el modal trabajan con la tirada cambiada y la especialidad ya resuelta.
  const [alternativaActiva, setAlternativaActiva] = useState(false);
  const alternativa = alternativaActiva ? usarHabilidadAlternativa(sheet, tirada) : null;
  const efectiva = alternativa?.tirada ?? tirada;
  const enEspEfectiva = alternativa ? alternativa.enEspecialidad : enEspecialidad;

  const especialidades = !alternativa && tirada.habilidad
    ? sheet.habilidades[tirada.habilidad].especialidades
    : [];
  const mod = modificadorAccion(sheet, efectiva, enEspEfectiva, mods, sutilActivo);
  const aplicadoActivoId = sutilActivo && tirada.aplicadoSutil ? tirada.aplicadoSutil : tirada.aplicado;
  const nombreAplicado = APLICADOS.find((a) => a.id === aplicadoActivoId)!;
  const nombreHabilidad = efectiva.habilidad
    ? HABILIDADES.find((h) => h.id === efectiva.habilidad)!.label +
      (alternativa ? ` (${tirada.habilidadAlternativa!.especialidad}${enEspEfectiva ? "" : ", mitad"})` : "")
    : null;

  if (tirada.bloqueada) {
    return (
      <HudCard className="border-dashed p-3 opacity-60">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-display text-sm font-semibold uppercase text-muted">
            {tirada.label}
          </span>
          <span className="font-mono text-[10px] uppercase text-danger">
            sin definir
          </span>
        </div>
        <p className="mt-1 font-mono text-[10px] leading-relaxed text-muted">
          {tirada.bloqueada}
        </p>
      </HudCard>
    );
  }

  return (
    <HudCard className="p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span className="block font-display text-base font-semibold uppercase leading-tight">
            {tirada.label}
          </span>
          <span className="mt-1 block font-mono text-[10px] uppercase text-muted">
            {nombreAplicado.abbr} {mod.aplicado}
            {nombreHabilidad && (
              <>
                {" + "}
                {nombreHabilidad} {mod.habilidad}
              </>
            )}
            {(tirada.ajustesFijos ?? []).map((a, i) => (
              <span key={i}> {signo(a.valor)}</span>
            ))}
          </span>
        </div>

        <span className="font-mono text-2xl tabular-nums text-info">
          {signo(mod.total + sumaAjustesFijos(tirada))}
        </span>

        <button
          type="button"
          onClick={() => onAbrir(efectiva, enEspEfectiva, sutilActivo)}
          className="clip-chamfer-sm shrink-0 border border-accent bg-accent px-3 py-2 font-display text-xs font-semibold uppercase tracking-wide text-black active:scale-95"
        >
          Tirar
        </button>
      </div>

      {tirada.aplicadoSutil && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[10px] uppercase text-muted">
            estilo:
          </span>
          <button
            type="button"
            onClick={() => setSutilActivo((v) => !v)}
            className={`clip-chamfer-sm border px-2 py-1 font-mono text-[10px] uppercase active:scale-95 ${
              sutilActivo
                ? "border-info text-info"
                : "border-border text-muted"
            }`}
          >
            {sutilActivo ? "✓ " : ""}
            Sutil
          </button>
        </div>
      )}

      {tirada.habilidadAlternativa && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            aria-pressed={alternativaActiva}
            onClick={() => setAlternativaActiva((v) => !v)}
            className={`clip-chamfer-sm border px-2 py-1 font-mono text-[10px] uppercase active:scale-95 ${
              alternativaActiva ? "border-info text-info" : "border-border text-muted"
            }`}
          >
            {alternativaActiva ? "✓ " : ""}
            {tirada.habilidadAlternativa.etiqueta}
          </button>
        </div>
      )}

      {especialidades.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[10px] uppercase text-muted">
            especialidad:
          </span>
          <button
            type="button"
            onClick={() => setEnEspecialidad((v) => !v)}
            className={`clip-chamfer-sm border px-2 py-1 font-mono text-[10px] uppercase active:scale-95 ${
              enEspecialidad
                ? "border-info text-info"
                : "border-border text-muted"
            }`}
          >
            {enEspecialidad ? "✓ " : ""}
            {especialidades.join(" / ")}
          </button>
        </div>
      )}

      {tirada.nota && (
        <p className="mt-2 font-sans text-[11px] leading-relaxed text-muted">
          {tirada.nota}
        </p>
      )}
    </HudCard>
  );
}

// Reparar y Fabricar (docs/tareas.md, tarea 8): una fila más en el grupo
// "Acciones", mismo lenguaje visual que FilaTirada (HudCard, título +
// botón) — "Abrir" en vez de "Tirar" lleva al modal combinado
// (ReparaFabricaModal.tsx), esta fila en sí no tira. Antes eran dos huecos
// sueltos fuera de la lista de acciones (una sección siempre visible + un
// botón aparte); unificarlos aquí evita que la tirada fija "tecnica" (ahora
// solo Hackeo) se quede huérfana de su propio Reparar/Fabricar.
function FilaReparaFabrica({ onAbrir }: { onAbrir: () => void }) {
  return (
    <HudCard className="p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span className="block font-display text-base font-semibold uppercase leading-tight">
            Reparar y Fabricar
          </span>
          <span className="mt-1 block font-mono text-[10px] uppercase text-muted">
            Tira dado al reparar o construir
          </span>
        </div>
        <button
          type="button"
          onClick={onAbrir}
          className="clip-chamfer-sm shrink-0 border border-accent bg-accent px-3 py-2 font-display text-xs font-semibold uppercase tracking-wide text-black active:scale-95"
        >
          Abrir
        </button>
      </div>
    </HudCard>
  );
}

// "Bloquear daño" (Hallazgo #5, docs/tareas.md): calculador puro de blindaje,
// sin dado — no necesita onXxx: a diferencia de Reparar/Fabricar, no muta la
// ficha, solo lee sheet. Por eso no lleva ninguna prop de gating (siempre
// visible, jugador y NPC).
function FilaBloquearDanio({ onAbrir }: { onAbrir: () => void }) {
  return (
    <HudCard className="p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span className="block font-display text-base font-semibold uppercase leading-tight">
            Bloquear daño
          </span>
          <span className="mt-1 block font-mono text-[10px] uppercase text-muted">
            Cuánto absorbe tu blindaje ahora mismo
          </span>
        </div>
        <button
          type="button"
          onClick={onAbrir}
          className="clip-chamfer-sm shrink-0 border border-accent bg-accent px-3 py-2 font-display text-xs font-semibold uppercase tracking-wide text-black active:scale-95"
        >
          Abrir
        </button>
      </div>
    </HudCard>
  );
}

// Fila de una "acción sin dado" (docs/motor.md) — mismo lenguaje visual que
// FilaTirada, botón "Usar" en vez de "Tirar" y sin desglose de aplicado ni
// habilidad (no hay ninguno). Hoy solo la genera accionesDirectasDeHerramientas()
// (Radar nv4 "Marcar objetivo"); cuando llegue una segunda familia con acción
// sin dado propia, esta fila se reutiliza tal cual.
function FilaUsar({ accion, onAbrir }: { accion: AccionDirecta; onAbrir: (a: AccionDirecta) => void }) {
  return (
    <HudCard className="p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span className="block font-display text-base font-semibold uppercase leading-tight">
            {accion.label}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onAbrir(accion)}
          className="clip-chamfer-sm shrink-0 border border-accent bg-accent px-3 py-2 font-display text-xs font-semibold uppercase tracking-wide text-black active:scale-95"
        >
          Usar
        </button>
      </div>
    </HudCard>
  );
}

// Poder psiónico: resumen al nivel poseído; "Usar" abre el modal de tirada con
// la cabecera de nivel empleado y forma (CabeceraPoder).
function FilaPoder({
  poder,
  sheet,
  mods,
  onAbrir,
}: {
  poder: PoderDisponible;
  sheet: Sheet;
  mods: ModificadorConFuente[];
  onAbrir: (p: PoderDisponible) => void;
}) {
  const p = poder.porDefecto;
  // A cuánto tira, igual que FilaTirada (null en poderes sin dado).
  const tirada = tiradaDePoder(poder.accion, p);
  const enEspecialidad = enEspecialidadDePoder(sheet, p);
  const mod = tirada ? modificadorAccion(sheet, tirada, enEspecialidad, mods) : null;
  const nombreAplicado = tirada ? APLICADOS.find((a) => a.id === tirada.aplicado)! : null;
  const nombreHabilidad = tirada?.habilidad ? HABILIDADES.find((h) => h.id === tirada.habilidad)!.label : null;
  const danio = p.resolucion.tipo === "ataque" ? p.resolucion.danio : null;
  // Coste ya pasado por los descuentos por nivel (sin casillas marcadas).
  const fatiga =
    typeof p.fatiga === "number" ? costeFatiga(poder.disciplina, poder.accion.id, p).total : textoValor(p.fatiga);
  const datos = [
    etiquetaEconomia(p.economia),
    `${fatiga} fatiga`,
    p.alcance !== null ? `${textoValor(p.alcance)} ${p.unidades.alcance ?? "m"}` : null,
    danio !== null ? `daño ${textoValor(danio)}` : null,
  ].filter(Boolean);
  return (
    <HudCard className="p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span className="block font-display text-base font-semibold uppercase leading-tight">{poder.accion.label}</span>
          {mod && nombreAplicado && (
            <span className="mt-1 block font-mono text-[10px] uppercase text-muted">
              {nombreAplicado.abbr} {mod.aplicado}
              {nombreHabilidad && (
                <>
                  {" + "}
                  {nombreHabilidad}
                  {enEspecialidad ? " (esp.)" : ""} {mod.habilidad}
                </>
              )}
              {(tirada?.ajustesFijos ?? []).map((a, i) => (
                <span key={i}> {signo(a.valor)}</span>
              ))}
            </span>
          )}
          <p className="mt-1 font-mono text-[11px] text-muted">{datos.join(" · ")}</p>
        </div>
        {mod && tirada && (
          <span className="font-mono text-2xl tabular-nums text-info">{signo(mod.total + sumaAjustesFijos(tirada))}</span>
        )}
        <button
          type="button"
          onClick={() => onAbrir(poder)}
          className="clip-chamfer-sm shrink-0 border border-accent bg-accent px-3 py-2 font-display text-xs font-semibold uppercase tracking-wide text-black active:scale-95"
        >
          Usar
        </button>
      </div>
    </HudCard>
  );
}

export function AccionesTab({
  sheet,
  estadosCombate = [],
  historial,
  setHistorial,
  memoria,
  setMemoria,
  onReparar,
  onFabricar,
  onGastarRecurso,
  onAjustarFarmaco,
  onAjustarMunicionEspecial,
  onPagarFatiga,
  onAjustarVida,
  libre = false,
}: {
  sheet: Sheet;
  // Fase 6b, 3.1b (D5: combate → ficha): los estados que el máster le tenga
  // puestos ahora mismo en el Combate EN_CURSO, si el jugador está metido en
  // uno — vacío si no hay combate o no está dentro. Se combinan con los
  // modificadores "en reposo" de la ficha antes de que nada se calcule, así
  // que fila y modal ven exactamente los mismos números.
  estadosCombate?: EstadoActivo[];
  // Viven en CharacterSheet, no aquí — sobreviven a cambiar de tab (ver el
  // comentario junto a su useState en CharacterSheet.tsx). Última
  // dificultad/circunstancial por tirada, no un valor global: un
  // francotirador repite la misma tirada varias veces por turno, pero eso no
  // dice nada de la siguiente salvación o de otra arma.
  historial: Lanzamiento[];
  setHistorial: Dispatch<SetStateAction<Lanzamiento[]>>;
  memoria: Record<string, { dificultad: number | null; circunstancial: number }>;
  setMemoria: Dispatch<
    SetStateAction<Record<string, { dificultad: number | null; circunstancial: number }>>
  >;
  // Ausente en NpcAccionesPanel.tsx (combate en vivo): ese `sheet` es la foto
  // congelada de un Combatiente, sin characterId/npcId al que persistir un
  // gasto de materiales — la sección Reparación no tiene sentido ahí y no se
  // pinta. `exito` (corrección 2026-09-25, segunda revisión): resultado de
  // la tirada de Reparar ya resuelta en el cliente (ReparaFabricaModal.tsx)
  // — NpcEditor.tsx (edición libre, sin tirada) ignora este tercer argumento.
  onReparar?: (instanciaId: string, tier: MaterialTier, exito: boolean) => void;
  // Mismo motivo que onReparar: ausente en el combate en vivo. `exito`
  // (corrección 2026-09-25): resultado de la tirada de Fabricar ya resuelta
  // en el cliente (FabricarSeccion.tsx) — NpcEditor.tsx (edición libre, sin
  // tirada) ignora este tercer argumento, ver su propio commitFabricar.
  onFabricar?: (catalogoId: string, tier: MaterialTier, exito: boolean) => void;
  // Gasto automático de RECURSOS al confirmar una tirada
  // (docs/prompt-gasto-recursos.md, Fase 1) — mismo motivo que
  // onReparar/onFabricar para estar ausente en NpcAccionesPanel.tsx (combate
  // en vivo, `sheet` es la foto congelada de un Combatiente, sin
  // characterId/npcId al que persistir el gasto).
  onGastarRecurso?: (instanciaId: string, delta: number) => void;
  // Gasto de 1 dosis de sheet.farmacos al confirmar "Usar [fármaco]"
  // (docs/prompt-gasto-recursos.md, Fase 2) — mismo motivo de ausencia que
  // onGastarRecurso en NpcAccionesPanel.tsx.
  onAjustarFarmaco?: (catalogoId: string, delta: number) => void;
  // Gasto de munición especial al disparar con ella (docs/tareas.md,
  // "Munición Especial — fase 2") — mismo motivo de ausencia que los de arriba.
  onAjustarMunicionEspecial?: (municionId: string, delta: number) => void;
  // Fatiga gastada al usar un poder psiónico (poderes.ts, costeFatiga) — ausente
  // donde no se gasta (edición de NPC del máster).
  // Con `permiteTemporal` (Proeza) el exceso sobre la fatiga que se tiene pasa
  // a fatiga temporal (vitalidad.ts, pagarFatiga).
  onPagarFatiga?: (coste: number, permiteTemporal: boolean) => void;
  // Daño de la sobrecarga psiónica, restado de la vida de la ficha.
  onAjustarVida?: (delta: number) => void;
  // NpcEditor.tsx (edición libre de máster): la tirada de Fabricar no aplica
  // — FabricarSeccion la salta y llama a onFabricar directo con éxito fijo,
  // mismo criterio que AtributosTab/HabilidadesTab con este mismo prop.
  libre?: boolean;
}) {
  const mods = [...modificadoresActivos(sheet), ...modificadoresDeEstados(estadosCombate)];
  const [reparaFabricaAbierta, setReparaFabricaAbierta] = useState(false);
  const [bloquearDanioAbierta, setBloquearDanioAbierta] = useState(false);
  const [modalDirecta, setModalDirecta] = useState<AccionDirecta | null>(null);
  // AccionDirecta con recursoInstanciaId (docs/tareas.md, 2026-09-28: "Detonar
  // pulso térmico") necesita el modal con contador, no el genérico "Usar" a
  // secas — ver abrirDirecta() más abajo.
  const [sacrificioModal, setSacrificioModal] = useState<AccionDirecta | null>(null);
  const [modal, setModal] = useState<{
    tirada: Accion;
    modBase: number;
    desgloseBase: { etiqueta: string; valor: number }[];
    mods: ModificadorConFuente[];
    ctxBase: { id: string; grupo: Accion["grupo"]; habilidad: Accion["habilidad"] };
    // Estilo Sutil elegido en la fila antes de abrir el modal (Feature 1) —
    // `tirar()` lo necesita para saber si usar `modo.danio` o `modo.danioSutil`.
    sutilActivo: boolean;
    // null mientras se eligen condiciones/dificultad; el id del Lanzamiento
    // recién creado en cuanto se pulsa Tirar — el modal pasa a mostrar el
    // resultado in-place en vez de cerrarse (UX corregida 2026-09-23: cerrar
    // dejaba al jugador mirando la lista de botones si había hecho scroll).
    resultadoId: number | null;
  } | null>(null);

  // Mezcla las condiciones de alcance (Visor Nocturno y lo que venga después,
  // ver docs/modificadores-tiradas.md §8) en CUALQUIER tirada — de ataque,
  // de herramienta o fija de ACCIONES — sin que ninguna de las tres sepa que
  // eso existe. `modoElegido: null` aquí a propósito: en este punto la tirada
  // ni siquiera se ha abierto, así que una condición con alcance "modo" no
  // tiene nada que matchear todavía (no tiene sentido de origen de todos
  // modos, ver indiceDeCondiciones en equipo.ts).
  //
  // Antes esto llamaba a condicionesActivas(sheet, ctx) una vez POR TIRADA,
  // repitiendo una pasada completa de sheet.equipo cada vez (docs/motor.md,
  // "Escalabilidad para las fases que vienen"). El índice se construye una
  // sola vez aquí y cada tirada solo consulta (T2).
  //
  // T3: todo esto se recalculaba en CADA render del componente, sea cual sea
  // la causa — incluidos cambios de atributos/habilidades que no tocan el
  // equipo para nada, porque `sheet` cambia de referencia entera en
  // CharacterSheet.tsx con cualquier setSheet(...) (spread). indiceDeCondiciones()
  // solo lee sheet.equipo (verificado, ningún otro campo) — se memoiza aparte
  // porque también la usa la lista de tiradas fijas más abajo, no solo
  // ataques/herramientas.
  // Deps a propósito: solo sheet.equipo importa aquí, no sheet entero (ver
  // comentario de arriba).
  const indiceCondiciones = useMemo(
    () => indiceDeCondiciones(sheet),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sheet.equipo],
  );
  const conCondicionesDeEquipo = (t: Accion): Accion => {
    const extra = consultaIndiceCondiciones(indiceCondiciones, { id: t.id, grupo: t.grupo, habilidad: t.habilidad, modoElegido: null });
    return extra.length > 0 ? { ...t, condiciones: [...(t.condiciones ?? []), ...extra] } : t;
  };

  // Igual que arriba: accionesDeAtaque()/accionesDeHerramientas() solo leen
  // sheet.equipo, salvo tiradaDeArmaFuego (dentro de accionesDeAtaque), que
  // además lee sheet.recursos vía recursoDe() para el aviso de munición
  // insuficiente — sin esa segunda dependencia, gastar/recargar munición no
  // invalidaría el aviso. conCondicionesDeEquipo no entra en las deps: su
  // comportamiento depende solo de indiceCondiciones, que ya está.
  // accionesDeAtaque() ya no es solo "Ataques": desde que Bloqueo (pregunta 31)
  // se genera junto al Golpear de cada arma melee, trae filas con
  // `grupo: "Defensa"` también — se separan aquí por `grupo`, no se asume que
  // todo lo que venga de equipo vaya a la sección Ataques.
  const {
    ataques,
    ataqueDirecta,
    defensaGenerada,
    defensaDirecta,
    herramientas,
    herramientasDirectas,
    farmacos,
    farmacosDirectas,
    accionesGeneradas,
  } = useMemo(() => {
    const generadas = accionesDeAtaque(sheet).map(conCondicionesDeEquipo);
    const directas = accionesDirectasDeAtaque(sheet);
    return {
      ataques: generadas.filter((t) => t.grupo === "Ataques"),
      defensaGenerada: generadas.filter((t) => t.grupo === "Defensa"),
      herramientas: accionesDeHerramientas(sheet).map(conCondicionesDeEquipo),
      // Sin conCondicionesDeEquipo: las acciones sin dado no llevan
      // condiciones de alcance (§8, modificadores-tiradas.md) todavía — nada
      // real las produce hoy, se añade el día que haga falta.
      herramientasDirectas: accionesDirectasDeHerramientas(sheet),
      // Fármacos (docs/prompt-gasto-recursos.md, Fase 2): leen sheet.farmacos,
      // no sheet.equipo — mismo patrón que Herramientas por lo demás.
      farmacos: accionesDeFarmacos(sheet).map(conCondicionesDeEquipo),
      farmacosDirectas: accionesDirectasDeFarmacos(sheet),
      defensaDirecta: directas.filter((a) => a.grupo === "Defensa"),
      // Detonación de pulso térmico (Malla Plasmática, 2026-09-28) — primera
      // "acción sin dado" del grupo Ataques, antes solo tenía Defensa.
      ataqueDirecta: directas.filter((a) => a.grupo === "Ataques"),
      // "Volar" (Movilidad Aérea) — mismo criterio que Bloqueo en Defensa:
      // generada por equipo, se mezcla en el grupo fijo "Acciones" en vez de
      // vivir en su propia sección.
      accionesGeneradas: accionesDeMovimiento(sheet).map(conCondicionesDeEquipo),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet.equipo, sheet.recursos, sheet.farmacos, sheet.municionEspecial, indiceCondiciones]);

  const abrir = (t: Accion, enEspecialidad: boolean, sutilActivo: boolean) => {
    const mod = modificadorAccion(sheet, t, enEspecialidad, mods, sutilActivo);
    const aplicadoId = sutilActivo && t.aplicadoSutil ? t.aplicadoSutil : t.aplicado;
    const nombreAplicado = APLICADOS.find((a) => a.id === aplicadoId)!;
    const nombreHabilidad = t.habilidad ? HABILIDADES.find((h) => h.id === t.habilidad)!.label : null;
    const desgloseBase = [
      { etiqueta: nombreAplicado.label, valor: mod.aplicado },
      ...(nombreHabilidad
        ? [{ etiqueta: `${nombreHabilidad}${enEspecialidad ? " (especialidad)" : ""}`, valor: mod.habilidad ?? 0 }]
        : []),
      ...(t.ajustesFijos ?? []).map((a) => ({ etiqueta: a.fuente, valor: a.valor })),
    ];
    setModal({
      tirada: t,
      modBase: mod.total + sumaAjustesFijos(t),
      desgloseBase,
      mods,
      ctxBase: { id: t.id, grupo: t.grupo, habilidad: t.habilidad },
      sutilActivo,
      resultadoId: null,
    });
  };

  const poderes = useMemo(() => accionesDePsionica(sheet), [sheet]);
  const disciplinasConPoderes = [...new Set(poderes.map((p) => p.disciplina))];
  // Poder cuyo modal está abierto, con las elecciones y casillas de fatiga
  // actuales. Cada cambio vuelve a resolver el poder y reconstruye la tirada del
  // modal. `directo` = poder sin tirada (UsarPoderModal en vez de AccionModal).
  const [poderAbierto, setPoderAbierto] = useState<{
    poder: PoderDisponible;
    elecciones: Record<string, string>;
    toggles: string[];
    directo: boolean;
    usado: number | null; // fatiga pagada en el último uso sin tirada
    pesoKg?: number; // Proeza
  } | null>(null);
  const resolverAbierto = (poder: PoderDisponible, elecciones: Record<string, string>, pesoKg?: number) =>
    resolverPoder(poder.accion, {
      nivelPoseido: poder.nivelPoseido,
      elecciones,
      aplicados: aplicados(sheet, mods),
      habilidades: valoresHabilidad(sheet),
      niveles: sheet.psionica,
      disciplina: poder.disciplina,
      pesoKg,
    });
  // Coste y bloqueo del poder abierto, contra la fatiga actual de la ficha (se
  // recalcula solo tras cada gasto: "Tirar otra vez" se apaga si ya no llega).
  const poderResuelto = poderAbierto
    ? resolverAbierto(poderAbierto.poder, poderAbierto.elecciones, poderAbierto.pesoKg)
    : null;
  const costeSinCargas =
    poderAbierto && poderResuelto && typeof poderResuelto.fatiga === "number"
      ? costeFatiga(poderAbierto.poder.disciplina, poderAbierto.poder.accion.id, poderResuelto, {
          externos: FUENTES_EXTERNAS_FATIGA,
          toggles: new Set(poderAbierto.toggles),
        })
      : null;
  // Derivación Psiónica: puntos pagados con cargas, último paso de la cadena.
  const [puntosCargas, setPuntosCargas] = useState(0);
  const derivacion = derivacionDeFicha(sheet);
  const pagoCargas = costeSinCargas && derivacion ? pagoConCargas(costeSinCargas, derivacion, puntosCargas) : null;
  const costePoder = pagoCargas?.coste ?? costeSinCargas;
  const bloqueoPoder =
    poderResuelto?.exceso?.bloqueo ??
    (poderAbierto && costePoder
      ? bloqueoPorFatiga(poderAbierto.poder.accion, costePoder.total, Math.max(0, fatigaEfectiva(sheet)))
      : null);

  // Sobrecarga del último uso de un poder (null si no cruzó el umbral): nivel
  // para la dificultad/daño y la salvación ya tirada, si la hay.
  // Avisos del último uso de un poder (inconsciencia por quedarse sin fatiga,
  // daño propio aplicado).
  const [avisosPoder, setAvisosPoder] = useState<string[]>([]);
  const [sobrecarga, setSobrecarga] = useState<{
    nivel: number;
    salvacion: (Lanzamiento & { danio: number }) | null;
  } | null>(null);

  // `id` llega del click (el compilador de React no acepta Date.now() aquí).
  const tirarSalvacionSobrecarga = (id: number) => {
    if (!sobrecarga || sobrecarga.salvacion) return;
    const salv = ACCIONES.find((a) => a.id === "salv_fortaleza")!;
    const modificador =
      modificadorAccion(sheet, salv, false, mods).total +
      bonoAlcance(mods, { id: salv.id, grupo: salv.grupo, habilidad: salv.habilidad, modoElegido: null });
    const dificultad = dificultadSobrecarga(sobrecarga.nivel);
    const r = resolverTirada({ dado: tirarD12(), modificador, dificultad });
    const danio = danioSobrecarga(sobrecarga.nivel, gradoDeTirada(r)!);
    if (danio > 0) onAjustarVida?.(-danio);
    const lanzamiento = {
      ...r,
      id,
      label: "Sobrecarga: salvación de Fortaleza",
      danio,
      danioInfo: { base: danio, formulaDanio: null, categoriaDanio: "Letal no absorbible" },
      danioResuelto: { base: danio, bonoExitos: 0, total: danio, categoria: "Letal no absorbible" },
    };
    setHistorial((h) => [lanzamiento, ...h].slice(0, 6));
    setSobrecarga({ ...sobrecarga, salvacion: lanzamiento });
  };

  const abrirPoder = (
    poder: PoderDisponible,
    elecciones: Record<string, string> = {},
    toggles: string[] = [],
    pesoKg?: number,
  ) => {
    const resuelto = resolverAbierto(poder, elecciones, pesoKg);
    if (!resuelto) return;
    const base = tiradaDePoder(poder.accion, resuelto);
    // Casillas externas marcadas (Xovromium +1, Supresora −2): líneas del desglose.
    const { ajustes } = efectosDeCasillas(FUENTES_EXTERNAS_FATIGA, new Set(toggles));
    const t = base && ajustes.length > 0 ? { ...base, ajustesFijos: [...(base.ajustesFijos ?? []), ...ajustes] } : base;
    if (t) abrir(t, enEspecialidadDePoder(sheet, resuelto), false);
    setSobrecarga(null);
    setAvisosPoder([]);
    setPoderAbierto({ poder, elecciones: resuelto.elecciones, toggles, directo: !t, usado: null, pesoKg });
  };

  // Gasto de fatiga al usar un poder (con tirada o sin ella), falle o no; si el
  // gasto cruza el umbral de exhausto, sobrecarga.
  // Umbrales y sobrecarga van contra la fatiga EFECTIVA (menos la temporal de
  // Proeza). El daño propio del poder (Proeza al 200 %) se resta al usarlo.
  // `coste` distinto del del poder: prolongar una Proeza (solo el extra).
  const pagarPoder = (coste = costePoder?.total ?? 0, conDanioPropio = true): number => {
    if (!costePoder || !poderResuelto || !poderAbierto) return 0;
    if (!onPagarFatiga) return coste;
    if (coste > 0) onPagarFatiga(coste, poderAbierto.poder.accion.permiteFatigaTemporal);
    // Las cargas solo en el uso normal (prolongar una Proeza cobra solo el extra).
    if (conDanioPropio && derivacion && pagoCargas && pagoCargas.cargas > 0) {
      onGastarRecurso?.(derivacion.instanciaId, -pagoCargas.cargas);
    }
    const antes = fatigaEfectiva(sheet);
    const despues = antes - coste;
    const cruza = cruzaSobrecarga(antes, despues, salud(sheet).fatiga);
    // Un uso nuevo reinicia la sobrecarga; prolongar (conDanioPropio = false) solo
    // la añade si cruza, sin borrar una salvación que aún esté pendiente.
    if (cruza) setSobrecarga({ nivel: poderResuelto.nivelEmpleado, salvacion: null });
    else if (conDanioPropio) setSobrecarga(null);
    const propio = conDanioPropio ? poderResuelto.danioPropio : null;
    if (propio && typeof propio.valor === "number" && propio.valor > 0) onAjustarVida?.(-propio.valor);
    // Supresora con fallo crítico: 1 de daño por punto de fatiga gastado.
    const porPunto = efectosDeCasillas(FUENTES_EXTERNAS_FATIGA, new Set(poderAbierto.toggles)).danioPorPunto;
    if (porPunto && coste > 0) onAjustarVida?.(-coste);
    const avisos = [
      ...(despues <= 0 && !cruza ? ["Te has quedado sin fatiga: quedas inconsciente al terminar la acción."] : []),
      ...(porPunto && coste > 0 ? [`Munición Supresora: recibes ${coste} de daño ${porPunto} (ya restado).`] : []),
      ...(propio && typeof propio.valor === "number" && propio.valor > 0
        ? [
            `Recibes ${propio.valor} de daño ${propio.categoria} (ya restado)${
              poderResuelto.exceso?.enLimite ? " y quedas inconsciente al terminar la acción" : ""
            }.`,
          ]
        : []),
    ];
    setAvisosPoder(avisos);
    return coste;
  };

  // Proeza: cada turno que se prolonga el control se vuelve a pagar el extra.
  const prolongarProeza = (id: number) => {
    const extra = poderResuelto?.exceso?.extra ?? 0;
    if (extra <= 0 || !poderAbierto) return;
    pagarPoder(extra, false);
    setHistorial((h) =>
      [
        {
          id,
          label: `${poderAbierto.poder.accion.label}: prolongar un turno (−${extra} fatiga)`,
          dado: 0,
          modificador: 0,
          circunstancial: 0,
          total: 0,
          dificultad: null,
          margen: null,
          exito: null,
          critico: false,
          sinDado: true,
        },
        ...h,
      ].slice(0, 6),
    );
  };

  // `id` llega del click, como en tirarSalvacionSobrecarga.
  const usarPoderDirecto = (id: number) => {
    if (!poderAbierto || !poderResuelto || bloqueoPoder) return;
    const pagado = pagarPoder();
    const label = etiquetaPoder(poderAbierto.poder.accion, poderResuelto);
    setHistorial((h) =>
      [
        {
          id,
          label,
          dado: 0,
          modificador: 0,
          circunstancial: 0,
          total: 0,
          dificultad: null,
          margen: null,
          exito: null,
          critico: false,
          sinDado: true,
        },
        ...h,
      ].slice(0, 6),
    );
    setPoderAbierto({ ...poderAbierto, usado: pagado });
  };

  const cerrarPoder = () => {
    setModal(null);
    setPoderAbierto(null);
    setPuntosCargas(0);
    setSobrecarga(null);
    setAvisosPoder([]);
  };

  const extraProeza = poderResuelto?.exceso?.extra ?? 0;
  const piePoder =
    avisosPoder.length > 0 || sobrecarga || extraProeza > 0 ? (
      <>
        {extraProeza > 0 && (
          <button
            type="button"
            onClick={() => prolongarProeza(Date.now())}
            className="clip-chamfer-sm mt-3 w-full border border-accent py-2 font-display text-xs font-semibold uppercase tracking-wide text-accent active:scale-[0.98]"
          >
            Prolongar un turno (−{extraProeza} fatiga)
          </button>
        )}
        {avisosPoder.map((a) => (
          <p key={a} className="mt-3 border-l-2 border-danger pl-2 font-sans text-[12px] font-semibold leading-relaxed text-danger">
            {a}
          </p>
        ))}
        {sobrecarga && (
          <SobrecargaPanel
            dificultad={dificultadSobrecarga(sobrecarga.nivel)}
            salvacion={sobrecarga.salvacion}
            onTirar={tirarSalvacionSobrecarga}
          />
        )}
      </>
    ) : undefined;

  const cabeceraPoder =
    poderAbierto && poderResuelto ? (
      <CabeceraPoder
        accion={poderAbierto.poder.accion}
        poder={poderResuelto}
        coste={costePoder}
        fatigaActual={fatigaEfectiva(sheet)}
        toggles={togglesDeFatiga(
          poderAbierto.poder.disciplina,
          poderAbierto.poder.accion.id,
          poderResuelto,
          FUENTES_EXTERNAS_FATIGA,
        )}
        togglesActivos={poderAbierto.toggles}
        onElegir={(eje, opcion) =>
          abrirPoder(poderAbierto.poder, { ...poderAbierto.elecciones, [eje]: opcion }, poderAbierto.toggles, poderAbierto.pesoKg)
        }
        onToggles={(toggles) => abrirPoder(poderAbierto.poder, poderAbierto.elecciones, toggles, poderAbierto.pesoKg)}
        cargas={
          derivacion && costeSinCargas
            ? {
                nivel: derivacion.nivel,
                disponibles: derivacion.cargas,
                porPunto: derivacion.cargasPorPunto,
                puntos: pagoCargas?.puntos ?? 0,
                max: maxPuntosConCargas(costeSinCargas.total, derivacion),
                onCambiar: setPuntosCargas,
              }
            : undefined
        }
        pesoKg={poderAbierto.pesoKg}
        onPeso={(kg) => abrirPoder(poderAbierto.poder, poderAbierto.elecciones, poderAbierto.toggles, kg)}
      />
    ) : null;


  const tirar = ({
    dado,
    dados,
    estadoCondiciones,
    dificultad,
    circunstancial,
  }: {
    // El dado ya se tiró dentro de AccionModal, al pulsar Tirar — no aquí.
    // Así el modal conoce el valor real desde el principio de la animación
    // de "rodar" y puede aterrizar en él en vez de en uno aleatorio más
    // (UX 2026-09-23: dejar el número real fijo un momento antes de pasar
    // al resultado completo).
    dado: number;
    dados?: [number, number];
    estadoCondiciones: EstadoCondiciones;
    dificultad: number | null;
    circunstancial: number;
  }) => {
    if (!modal) return;
    const { tirada, modBase, mods, ctxBase, sutilActivo } = modal;
    const bonoCondiciones = valorCondiciones(tirada.condiciones ?? [], estadoCondiciones);
    const bonoTramo = valorBonosTramo(tirada.bonosTramo ?? [], estadoCondiciones);
    const bonoEquipoEspecie = bonoAlcance(mods, {
      ...ctxBase,
      modoElegido: modoElegido(tirada.condiciones ?? [], estadoCondiciones),
    });
    // VTM nivel 4 ("Tratar heridas"): selector "vtm_tratamiento" (medicina.ts)
    // — elegir "complejo" baja el umbral de crítico a 0 en el lado de éxito.
    // Inocuo en cualquier otra tirada: ese id de condición solo existe aquí.
    const margenCriticoExito = estadoCondiciones.vtm_tratamiento === "complejo" ? 0 : undefined;
    const r = resolverTirada({
      dado,
      modificador: modBase + bonoCondiciones + bonoTramo + bonoEquipoEspecie,
      circunstancial,
      dificultad,
      margenCriticoExito,
    });

    setMemoria((m) => ({ ...m, [tirada.id]: { dificultad, circunstancial } }));

    const modoId = tirada.ataque
      ? typeof estadoCondiciones.modo === "string"
        ? estadoCondiciones.modo
        : tirada.ataque.modos[0].id
      : null;

    let danioInfo: DanioInfo | null = null;
    if (tirada.ataque) {
      const modo = tirada.ataque.modos.find((m) => m.id === modoId) ?? tirada.ataque.modos[0];
      const danioBase = sutilActivo ? (modo.danioSutil ?? modo.danio) : modo.danio;
      // Munición especial: +/- niveles de daño sobre la base (mínimo 0).
      const municion = municionEspecialElegida(tirada, estadoCondiciones);
      const ajusteMunicion = municion?.ajusteDanio ?? 0;
      const ignoraBlindaje = [
        ...(tirada.ignoraBlindaje ? [tirada.ignoraBlindaje] : []),
        ...(municion?.ignoraBlindaje ? [{ valor: municion.ignoraBlindaje, fuente: municion.label }] : []),
      ];
      danioInfo = {
        base: danioBase === null ? null : Math.max(0, danioBase + ajusteMunicion),
        formulaDanio: modo.formulaDanio,
        categoriaDanio: modo.categoriaDanio,
        ignoraBlindaje: ignoraBlindaje.length > 0 ? ignoraBlindaje : undefined,
        alFallar: tirada.ataque.danioAlFallar,
      };
    }

    // "Volar" (Movilidad Aérea): Máxima Potencia es el toggle
    // "maxima_potencia" dentro de esta misma tirada, no una acción aparte —
    // ver resolverVuelo() (acciones.ts) y movimiento.ts.
    const vueloResuelto =
      tirada.vuelo && r.margen !== null
        ? resolverVuelo(tirada.vuelo, r.margen, Boolean(estadoCondiciones.maxima_potencia))
        : undefined;

    // Gasto automático de RECURSOS al confirmar (docs/prompt-gasto-recursos.md,
    // Fase 1) — nunca bloquea el botón de tirar, se gasta lo que haya
    // (ajustarRecurso ya clampa a [0, max]); en segundo plano, sin esperar al
    // servidor para pintar el resultado del dado.
    if (tirada.recursoInstanciaId) {
      const gasto = gastoTotal(tirada, modoId, estadoCondiciones);
      if (gasto > 0) onGastarRecurso?.(tirada.recursoInstanciaId, -gasto);
    }
    // Fármacos (docs/prompt-gasto-recursos.md, Fase 2): 1 dosis por uso, sin
    // excepciones — no depende de gastoTotal() (pool distinto, sheet.farmacos
    // por catalogoId) ni del resultado de la tirada.
    if (tirada.farmacoId) onAjustarFarmaco?.(tirada.farmacoId, -1);
    if (tirada.grupo === "Psiónica") {
      pagarPoder();
      // Daño propio que depende del resultado (fracaso crítico del Sondeo).
      const grado = gradoDeTirada(r);
      const propio = grado ? tirada.poder?.danioPropio?.[grado] : undefined;
      if (propio) {
        onAjustarVida?.(-propio.valor);
        setAvisosPoder((a) => [...a, `Recibes ${propio.valor} de daño ${propio.categoria} (ya restado).`]);
      }
    }
    const gastoEspecial = gastoMunicionEspecial(tirada, modoId, estadoCondiciones);
    if (gastoEspecial && gastoEspecial.cantidad > 0) onAjustarMunicionEspecial?.(gastoEspecial.id, -gastoEspecial.cantidad);

    const id = Date.now();
    setHistorial((h) =>
      [
        {
          ...r,
          id,
          label: tirada.label,
          dados,
          danioInfo,
          efectoCritico: tirada.efectoCritico,
          efectos: tirada.efectos,
          poder: tirada.poder,
          vueloResuelto,
        },
        ...h,
      ].slice(0, 6),
    );
    setModal((m) => (m ? { ...m, resultadoId: id } : m));
  };

  const tirarDanio = () => {
    setHistorial((h) => {
      const [ultimo, ...resto] = h;
      if (!ultimo?.danioInfo || ultimo.danioInfo.base === null || ultimo.margen === null) return h;
      const danioResuelto = resolverDanio(ultimo.danioInfo.base, ultimo.margen, ultimo.danioInfo.categoriaDanio);
      return [{ ...ultimo, danioResuelto }, ...resto];
    });
  };

  // Deja rastro en "Acciones recientes" al confirmar una AccionDirecta —
  // mismo hueco de 6 que las tiradas (`tirar()` arriba). Los campos de
  // Resultado son relleno inerte: `sinDado` hace que FilaHistorial nunca los
  // lea (ver tonoResultado/textoExitos).
  const usarDirecta = () => {
    if (!modalDirecta) return;
    // Fármacos sin tirada (docs/prompt-gasto-recursos.md, Fase 2): mismo
    // criterio que en tirar(), 1 dosis al confirmar.
    if (modalDirecta.farmacoId) onAjustarFarmaco?.(modalDirecta.farmacoId, -1);
    const id = Date.now();
    setHistorial((h) =>
      [
        {
          id,
          label: modalDirecta.label,
          dado: 0,
          modificador: 0,
          circunstancial: 0,
          total: 0,
          dificultad: null,
          margen: null,
          exito: null,
          critico: false,
          sinDado: true,
        },
        ...h,
      ].slice(0, 6),
    );
  };

  // Con recursoInstanciaId (Detonar pulso térmico): contador propio, no el
  // genérico "Usar" a secas — ver el comentario de sacrificioModal arriba.
  const abrirDirecta = (a: AccionDirecta) => {
    if (a.recursoInstanciaId) setSacrificioModal(a);
    else setModalDirecta(a);
  };

  // Confirmar SacrificioRecursoModal: gasta los puntos elegidos (nunca más
  // de lo que había, el propio modal ya acota el contador) y deja el daño
  // resultante en Acciones recientes vía danioResuelto — mismo campo que ya
  // pinta FilaHistorial para el daño de un ataque normal (docs/tareas.md,
  // 2026-09-28: antes el jugador calculaba esto a mano y lo restaba aparte).
  const confirmarSacrificio = (puntos: number) => {
    if (!sacrificioModal?.recursoInstanciaId || puntos <= 0) return;
    onGastarRecurso?.(sacrificioModal.recursoInstanciaId, -puntos);
    const id = Date.now();
    setHistorial((h) =>
      [
        {
          id,
          label: sacrificioModal.label,
          dado: 0,
          modificador: 0,
          circunstancial: 0,
          total: 0,
          dificultad: null,
          margen: null,
          exito: null,
          critico: false,
          sinDado: true,
          danioResuelto: { base: puntos, bonoExitos: 0, total: puntos, categoria: sacrificioModal.categoriaDanio ?? "Daño" },
        },
        ...h,
      ].slice(0, 6),
    );
  };

  const especialidadesActuales = modal?.tirada.habilidad
    ? sheet.habilidades[modal.tirada.habilidad].especialidades
    : [];
  // El resultado vive en `historial` (tirarDanio lo actualiza ahí), no
  // duplicado en el propio `modal` — se busca por id para que las dos vistas
  // (Marcador arriba, AccionModal) lean siempre el mismo objeto.
  const resultadoModal =
    modal?.resultadoId != null ? (historial.find((h) => h.id === modal.resultadoId) ?? null) : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <h2 className="mt-2 border-b border-border pb-1 font-display text-sm font-semibold uppercase tracking-wide text-muted">
          Acciones recientes
        </h2>
        {historial.length === 0 ? (
          <HudCard className="border-dashed p-4 text-center">
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
              {"//SYSTEM · sin tiradas"}
            </p>
            <p className="mt-2 font-sans text-sm text-muted">
              Elige una acción y pulsa Tirar.
            </p>
          </HudCard>
        ) : (
          <HudCard className="p-3">
            <div className="flex flex-col">
              {historial.map((h) => (
                <FilaHistorial key={h.id} h={h} />
              ))}
            </div>
          </HudCard>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="mt-2 border-b border-border pb-1 font-display text-sm font-semibold uppercase tracking-wide text-muted">
          Ataques
        </h2>
        {ataques.map((t) => (
          <FilaTirada key={t.id} tirada={t} sheet={sheet} mods={mods} onAbrir={abrir} />
        ))}
        {/* Detonación de pulso térmico (Malla Plasmática) — generada por
            accionesDirectasDeAtaque() (combate.ts), no tira dado. */}
        {ataqueDirecta.map((a) => (
          <FilaUsar key={a.id} accion={a} onAbrir={abrirDirecta} />
        ))}
      </div>

      {/* Psiónica: generada por los niveles de disciplina (poderes.ts), solo si
          hay algún poder — mismo criterio que Herramientas. */}
      {poderes.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="mt-2 border-b border-border pb-1 font-display text-sm font-semibold uppercase tracking-wide text-muted">
            Psiónica
          </h2>
          {disciplinasConPoderes.map((d) => (
            <div key={d.id} className="flex flex-col gap-2">
              <h3 className="font-mono text-[10px] uppercase tracking-widest text-muted">
                {d.label} · nivel {poderes.find((p) => p.disciplina === d)!.nivelPoseido}
              </h3>
              {poderes
                .filter((p) => p.disciplina === d)
                .map((p) => (
                  <FilaPoder key={p.accion.id} poder={p} sheet={sheet} mods={mods} onAbrir={abrirPoder} />
                ))}
            </div>
          ))}
        </div>
      )}

      {/* Como Ataques: dinámica, generada por lo que hay equipado, no del
          catálogo fijo (ver herramientas.ts). Solo se pinta si hay algo que
          la use — a diferencia de Ataques, es opcional para la mayoría de
          personajes y no merece un hueco vacío permanente. */}
      {(herramientas.length > 0 || herramientasDirectas.length > 0) && (
        <div className="flex flex-col gap-2">
          <h2 className="mt-2 border-b border-border pb-1 font-display text-sm font-semibold uppercase tracking-wide text-muted">
            Herramientas
          </h2>
          {herramientas.map((t) => (
            <FilaTirada key={t.id} tirada={t} sheet={sheet} mods={mods} onAbrir={abrir} />
          ))}
          {herramientasDirectas.map((a) => (
            <FilaUsar key={a.id} accion={a} onAbrir={abrirDirecta} />
          ))}
        </div>
      )}

      {/* Fármacos (docs/prompt-gasto-recursos.md, Fase 2): dinámica, generada
          por sheet.farmacos, no por sheet.equipo (ver farmacos.ts) — mismo
          criterio de "solo si hay algo que la use" que Herramientas. */}
      {(farmacos.length > 0 || farmacosDirectas.length > 0) && (
        <div className="flex flex-col gap-2">
          <h2 className="mt-2 border-b border-border pb-1 font-display text-sm font-semibold uppercase tracking-wide text-muted">
            Fármacos
          </h2>
          {farmacos.map((t) => (
            <FilaTirada key={t.id} tirada={t} sheet={sheet} mods={mods} onAbrir={abrir} />
          ))}
          {farmacosDirectas.map((a) => (
            <FilaUsar key={a.id} accion={a} onAbrir={abrirDirecta} />
          ))}
        </div>
      )}

      {GRUPOS_ACCION.map((grupo) => (
        <div key={grupo} className="flex flex-col gap-2">
          <h2 className="mt-2 border-b border-border pb-1 font-display text-sm font-semibold uppercase tracking-wide text-muted">
            {grupo}
          </h2>
          {ACCIONES.filter((t) => t.grupo === grupo)
            .map(conCondicionesDeEquipo)
            .map((t) => conPsionicaEnTiradaFija(sheet, conEsquivaLevitando(sheet, t)))
            // Defensa/Esquiva (fija) primero, Bloquear-con-X (generado por
            // equipo) detrás — mismo orden que Ataques: lo fijo antes que lo
            // que trae cada arma. "Volar" entra igual dentro de "Acciones".
            .concat(grupo === "Defensa" ? defensaGenerada : grupo === "Acciones" ? accionesGeneradas : [])
            .map((t) => (
              <FilaTirada key={t.id} tirada={t} sheet={sheet} mods={mods} onAbrir={abrir} />
            ))}
          {/* "Levantar [escudo]" — una fila por cada escudo equipado, generada
              por accionesDirectasDeAtaque() (combate.ts), no por el catálogo
              fijo de ACCIONES. */}
          {grupo === "Defensa" &&
            defensaDirecta.map((a) => <FilaUsar key={a.id} accion={a} onAbrir={abrirDirecta} />)}
          {/* Bloquear daño vive junto a Defensa/esquiva — tampoco es una
              tirada fija de ACCIONES (no tira dado, no muta la ficha). */}
          {grupo === "Defensa" && <FilaBloquearDanio onAbrir={() => setBloquearDanioAbierta(true)} />}
          {/* Reparar y Fabricar vive aquí, junto a Hackeo — no es una
              tirada fija de ACCIONES (no tira dado), así que se añade a
              mano en vez de venir del catálogo. */}
          {grupo === "Acciones" && onReparar && (
            <FilaReparaFabrica onAbrir={() => setReparaFabricaAbierta(true)} />
          )}
        </div>
      ))}

      {bloquearDanioAbierta && (
        <BloquearDanioModal sheet={sheet} onCerrar={() => setBloquearDanioAbierta(false)} />
      )}

      {modalDirecta && (
        <UsarModal
          titulo={modalDirecta.label}
          nota={modalDirecta.nota}
          condiciones={modalDirecta.condiciones}
          confirmarLabel={modalDirecta.confirmarLabel}
          onUsar={usarDirecta}
          onCerrar={() => setModalDirecta(null)}
        />
      )}

      {sacrificioModal?.recursoInstanciaId &&
        (() => {
          const recurso = recursoDe(sheet, sacrificioModal.recursoInstanciaId);
          if (!recurso) return null;
          const categoria = (sacrificioModal.categoriaDanio ?? "daño").toLowerCase();
          return (
            <SacrificioRecursoModal
              titulo={sacrificioModal.label}
              nota={sacrificioModal.nota}
              recursoActual={recurso}
              confirmarLabel={sacrificioModal.confirmarLabel}
              previewTexto={(puntos) =>
                puntos > 0 ? `→ ${puntos} de daño de ${categoria}.` : "Elige cuántos puntos sacrificar."
              }
              onConfirmar={confirmarSacrificio}
              onCerrar={() => setSacrificioModal(null)}
            />
          );
        })()}

      {reparaFabricaAbierta && onReparar && (
        <ReparaFabricaModal
          sheet={sheet}
          mods={mods}
          setHistorial={setHistorial}
          memoria={memoria}
          setMemoria={setMemoria}
          onReparar={onReparar}
          onFabricar={onFabricar}
          libre={libre}
          onCerrar={() => setReparaFabricaAbierta(false)}
        />
      )}

      {poderAbierto?.directo && poderResuelto && (
        <UsarPoderModal
          titulo={etiquetaPoder(poderAbierto.poder.accion, poderResuelto)}
          cabecera={cabeceraPoder}
          bloqueo={bloqueoPoder}
          usado={poderAbierto.usado !== null}
          costeUsado={poderAbierto.usado}
          objetivoTira={poderResuelto.objetivoTira.map((t) => ({
            que: t.que,
            dificultad: t.dificultad === undefined ? undefined : textoValor(t.dificultad),
            grados: t.grados,
          }))}
          pie={piePoder}
          onUsar={() => usarPoderDirecto(Date.now())}
          onCerrar={cerrarPoder}
        />
      )}

      {modal && (
        <AccionModal
          // Una opción de poder que cambia la dificultad fija (Rastreo: conocido 6,
          // desconocido 12) remonta el modal para que la traiga puesta.
          key={`${modal.tirada.id}:${modal.tirada.dificultadSugerida ?? ""}`}
          titulo={modal.tirada.label}
          nota={modal.tirada.nota}
          tirada={modal.tirada}
          recursoActual={
            modal.tirada.recursoInstanciaId ? recursoDe(sheet, modal.tirada.recursoInstanciaId) : undefined
          }
          subtitulo={
            especialidadesActuales.length > 0
              ? `especialidad: ${especialidadesActuales.join(" / ")}`
              : undefined
          }
          cabecera={modal.tirada.grupo === "Psiónica" ? cabeceraPoder : undefined}
          bloqueo={modal.tirada.grupo === "Psiónica" ? bloqueoPoder : null}
          pieResultado={modal.tirada.grupo === "Psiónica" ? piePoder : undefined}
          modBase={modal.modBase}
          desgloseBase={modal.desgloseBase}
          condiciones={modal.tirada.condiciones ?? []}
          bonosTramo={modal.tirada.bonosTramo ?? []}
          mods={modal.mods}
          ctxBase={modal.ctxBase}
          dificultadInicial={memoria[modal.tirada.id]?.dificultad ?? modal.tirada.dificultadSugerida ?? 7}
          circunstancialInicial={memoria[modal.tirada.id]?.circunstancial ?? 0}
          resultado={resultadoModal}
          onTirarDanio={tirarDanio}
          onCerrar={cerrarPoder}
          onTirar={tirar}
        />
      )}
    </div>
  );
}
