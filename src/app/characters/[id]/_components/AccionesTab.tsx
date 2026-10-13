"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  ACCIONES,
  GRUPOS_ACCION,
  APLICADOS,
  HABILIDADES,
  montarTirada,
  tirarMontada,
  SIN_ELECCION,
  eleccionSinTocar,
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
  conExtrasDeFicha,
  accionesDePsionica,
  textoNivelEnAcciones,
  etiquetaEconomia,
  textoValor,
  prepararPoder,
  usarPoder,
  efectosDelResultado,
  tirarPeaje,
  SELECCION_PODER_VACIA,
  type SeleccionPoder,
  type EfectosDeUso,
  type PeajeDeUso,
  usarHabilidadAlternativa,
  conEsquivaLevitando,
  conPsionicaEnTiradaFija,
  etiquetaPoder,
  dificultadSobrecarga,
  danioSobrecarga,
  gradoDeTirada,
  tirarD12,
  type PoderDisponible,
  type Accion,
  type AccionDirecta,
  type Sheet,
  type EstadoCondiciones,
  type EleccionTirada,
  type FichaResuelta,
  type TiradaMontada,
  type NivelesPsionica,
  type DisciplinaId,
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
import { PeajePanel } from "./PeajePanel";
import { UsarPoderModal } from "./UsarPoderModal";
import { type DanioInfo, type Lanzamiento } from "@/components/ResultadoTirada";

function signo(n: number) {
  return n >= 0 ? `+${n}` : `${n}`;
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
  ficha,
  onAbrir,
}: {
  tirada: Accion;
  ficha: FichaResuelta;
  onAbrir: (t: Accion, enEspecialidad: boolean, sutilActivo: boolean) => void;
}) {
  const sheet = ficha.ficha;
  const [enEspecialidad, setEnEspecialidad] = useState(false);
  // Sutil (Feature 1, docs/equipamiento.md:848-850): pre-seleccionado por el
  // aplicado que dé más bonificador de ATAQUE, no de daño — es la parte que
  // decide si conviene tirar. Lazy initializer: solo se calcula una vez, al
  // montar la fila.
  const [sutilActivo, setSutilActivo] = useState(() =>
    tirada.aplicadoSutil
      ? ficha.aplicados[tirada.aplicadoSutil] > ficha.aplicados[tirada.aplicado]
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
  const montada = montarTirada(ficha, efectiva, eleccionSinTocar(efectiva, enEspEfectiva, sutilActivo));
  const nombreAplicado = APLICADOS.find((a) => a.id === montada.aplicado.id)!;
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
            {nombreAplicado.abbr} {montada.aplicado.valor}
            {nombreHabilidad && (
              <>
                {" + "}
                {nombreHabilidad} {montada.habilidad?.valor}
              </>
            )}
            {montada.ajustesFijos.map((a, i) => (
              <span key={i}> {signo(a.valor)}</span>
            ))}
          </span>
        </div>

        {/* El modificador completo (alcance, umbrales, casillas en su estado inicial):
            el mismo número que el modal recién abierto. */}
        <span className="font-mono text-2xl tabular-nums text-info">
          {signo(montada.modificador)}
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
  niveles,
  onAbrir,
}: {
  poder: PoderDisponible;
  sheet: Sheet;
  mods: ModificadorConFuente[];
  niveles: NivelesPsionica;
  onAbrir: (p: PoderDisponible) => void;
}) {
  // Mismo cálculo que el modal (usoPoder.ts), sin nada elegido todavía.
  const preparado = prepararPoder({ ficha: sheet, modificadores: mods, niveles, poder, seleccion: SELECCION_PODER_VACIA });
  if (!preparado) return null;
  const p = preparado.resuelto;
  // A cuánto tira, igual que FilaTirada (null en poderes sin dado).
  const { tirada, enEspecialidad, montada } = preparado;
  const nombreAplicado = montada ? APLICADOS.find((a) => a.id === montada.aplicado.id)! : null;
  const nombreHabilidad = tirada?.habilidad ? HABILIDADES.find((h) => h.id === tirada.habilidad)!.label : null;
  const danio = p.resolucion.tipo === "ataque" ? p.resolucion.danio : null;
  // Coste ya pasado por los descuentos por nivel (sin casillas marcadas).
  const fatiga = preparado.coste ? preparado.coste.total : textoValor(p.fatiga);
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
          {montada && nombreAplicado && (
            <span className="mt-1 block font-mono text-[10px] uppercase text-muted">
              {nombreAplicado.abbr} {montada.aplicado.valor}
              {nombreHabilidad && (
                <>
                  {" + "}
                  {nombreHabilidad}
                  {enEspecialidad ? " (esp.)" : ""} {montada.habilidad?.valor}
                </>
              )}
              {montada.ajustesFijos.map((a, i) => (
                <span key={i}> {signo(a.valor)}</span>
              ))}
            </span>
          )}
          <p className="mt-1 font-mono text-[11px] text-muted">{datos.join(" · ")}</p>
          {poder.bloqueo && <p className="mt-1 font-mono text-[11px] text-danger">{poder.bloqueo}</p>}
        </div>
        {montada && <span className="font-mono text-2xl tabular-nums text-info">{signo(montada.modificador)}</span>}
        <button
          type="button"
          disabled={!!poder.bloqueo}
          onClick={() => onAbrir(poder)}
          className="clip-chamfer-sm shrink-0 border border-accent bg-accent px-3 py-2 font-display text-xs font-semibold uppercase tracking-wide text-black active:scale-95 disabled:border-border disabled:bg-elevated disabled:text-muted disabled:active:scale-100"
        >
          Usar
        </button>
      </div>
    </HudCard>
  );
}

export function AccionesTab({
  ficha,
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
  // La ficha ya resuelta (useFichaResuelta). Fase 6b, 3.1b (D5: combate → ficha):
  // lleva dentro los estados que el máster le tenga puestos ahora mismo en el
  // Combate EN_CURSO, si el jugador está metido en uno, así que fila y modal ven
  // exactamente los mismos números.
  ficha: FichaResuelta;
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
  // Fatiga gastada al usar un poder psiónico (usoPoder.ts) — ausente
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
  const sheet = ficha.ficha;
  const mods = ficha.modificadores;
  const [reparaFabricaAbierta, setReparaFabricaAbierta] = useState(false);
  const [bloquearDanioAbierta, setBloquearDanioAbierta] = useState(false);
  const [modalDirecta, setModalDirecta] = useState<AccionDirecta | null>(null);
  // AccionDirecta con recursoInstanciaId (docs/tareas.md, 2026-09-28: "Detonar
  // pulso térmico") necesita el modal con contador, no el genérico "Usar" a
  // secas — ver abrirDirecta() más abajo.
  const [sacrificioModal, setSacrificioModal] = useState<AccionDirecta | null>(null);
  const [modal, setModal] = useState<{
    tirada: Accion;
    // La ficha al abrir el modal: el total se monta contra ella mientras está abierto.
    ficha: FichaResuelta;
    // Especialidad y estilo Sutil elegidos en la fila antes de abrir el modal
    // (Feature 1) — `tirar()` mira `sutil` para usar `modo.danio` o `modo.danioSutil`.
    eleccion: Pick<EleccionTirada, "enEspecialidad" | "sutil">;
    // null mientras se eligen condiciones/dificultad; el id del Lanzamiento
    // recién creado en cuanto se pulsa Tirar — el modal pasa a mostrar el
    // resultado in-place en vez de cerrarse (UX corregida 2026-09-23: cerrar
    // dejaba al jugador mirando la lista de botones si había hecho scroll).
    resultadoId: number | null;
  } | null>(null);

  // Casillas con alcance (equipo y especie) y textos de especie en CUALQUIER tirada —
  // de ataque, de herramienta o fija de ACCIONES — sin que ninguna sepa que existen:
  // conExtrasDeFicha (fichaResuelta.ts) consulta el índice y los textos de la
  // FichaResuelta, calculados una vez por cambio de ficha (docs/modificadores-tiradas.md §8).
  const indiceCondiciones = ficha.indiceCondiciones;
  const conExtras = (t: Accion): Accion => conExtrasDeFicha(ficha, t);

  // Igual que arriba: accionesDeAtaque()/accionesDeHerramientas() solo leen
  // sheet.equipo, salvo tiradaDeArmaFuego (dentro de accionesDeAtaque), que
  // además lee sheet.recursos vía recursoDe() para el aviso de munición
  // insuficiente — sin esa segunda dependencia, gastar/recargar munición no
  // invalidaría el aviso. `mods` (FichaResuelta): el daño melee/Sutil sale de la
  // ficha con estados y especie (M1b). conExtras no entra en las deps: su
  // comportamiento depende solo de indiceCondiciones y textosTirada, que ya están.
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
    const generadas = accionesDeAtaque(sheet, mods).map(conExtras);
    const directas = accionesDirectasDeAtaque(sheet);
    return {
      ataques: generadas.filter((t) => t.grupo === "Ataques"),
      defensaGenerada: generadas.filter((t) => t.grupo === "Defensa"),
      herramientas: accionesDeHerramientas(sheet).map(conExtras),
      // Sin conExtras: las acciones sin dado no llevan
      // condiciones de alcance (§8, modificadores-tiradas.md) todavía — nada
      // real las produce hoy, se añade el día que haga falta.
      herramientasDirectas: accionesDirectasDeHerramientas(sheet),
      // Fármacos (docs/prompt-gasto-recursos.md, Fase 2): leen sheet.farmacos,
      // no sheet.equipo — mismo patrón que Herramientas por lo demás.
      // Con las notas de especie (Irota, §14.9) de la FichaResuelta.
      farmacos: accionesDeFarmacos(sheet, ficha.notasFarmacos).map(conExtras),
      farmacosDirectas: accionesDirectasDeFarmacos(sheet, ficha.notasFarmacos),
      defensaDirecta: directas.filter((a) => a.grupo === "Defensa"),
      // Detonación de pulso térmico (Malla Plasmática, 2026-09-28) — primera
      // "acción sin dado" del grupo Ataques, antes solo tenía Defensa.
      ataqueDirecta: directas.filter((a) => a.grupo === "Ataques"),
      // "Volar" (Movilidad Aérea) — mismo criterio que Bloqueo en Defensa:
      // generada por equipo, se mezcla en el grupo fijo "Acciones" en vez de
      // vivir en su propia sección.
      accionesGeneradas: accionesDeMovimiento(sheet).map(conExtras),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet.equipo, sheet.recursos, sheet.farmacos, sheet.municionEspecial, indiceCondiciones, ficha.textosTirada, ficha.notasFarmacos, mods]);

  const abrir = (t: Accion, enEspecialidad: boolean, sutil: boolean) => {
    setModal({ tirada: t, ficha, eleccion: { enEspecialidad, sutil }, resultadoId: null });
  };

  const niveles = ficha.psionica.paraEfectos;
  const poderes = useMemo(() => accionesDePsionica(sheet, niveles), [sheet, niveles]);
  const disciplinasConPoderes = [...new Set(poderes.map((p) => p.disciplina))];
  // Poder cuyo modal está abierto y lo que el jugador ha elegido en él. Las
  // reglas (coste, bloqueo, tirada, efectos de usarlo) salen de usoPoder.ts:
  // aquí solo se pinta y se aplica. `directo` = poder sin tirada (UsarPoderModal
  // en vez de AccionModal).
  const [poderAbierto, setPoderAbierto] = useState<{
    poder: PoderDisponible;
    seleccion: SeleccionPoder;
    directo: boolean;
    usado: number | null; // fatiga pagada en el último uso sin tirada
  } | null>(null);
  // Se recalcula en cada render contra la ficha actual: "Tirar otra vez" se
  // apaga si ya no llega la fatiga.
  const preparado = poderAbierto
    ? prepararPoder({ ficha: sheet, modificadores: mods, niveles, poder: poderAbierto.poder, seleccion: poderAbierto.seleccion })
    : null;

  // Sobrecarga del último uso de un poder (null si no cruzó el umbral): nivel
  // para la dificultad/daño y la salvación ya tirada, si la hay.
  // Avisos del último uso de un poder (inconsciencia por quedarse sin fatiga,
  // daño propio aplicado).
  const [avisosPoder, setAvisosPoder] = useState<string[]>([]);
  const [sobrecarga, setSobrecarga] = useState<{
    nivel: number;
    salvacion: (Lanzamiento & { danio: number }) | null;
  } | null>(null);
  // Peajes neurológicos (Maolher, §14.9) del último uso y de cada turno prolongado de
  // Proeza, cada uno con su salvación. Se pintan después de la sobrecarga.
  const [peajes, setPeajes] = useState<
    { peaje: PeajeDeUso; salvacion: (Lanzamiento & { aviso: string | null }) | null }[]
  >([]);

  const tirarSalvacionPeaje = (i: number, id: number) => {
    const actual = peajes[i];
    if (!actual || actual.salvacion) return;
    const t = tirarPeaje(ficha, actual.peaje, tirarD12());
    if (t.danio > 0) onAjustarVida?.(-t.danio);
    const lanzamiento = {
      ...t.resultado,
      id,
      label: "Peaje neurológico: salvación de Fortaleza",
      aviso: t.aviso,
      ...(t.categoria && {
        danioResuelto: { base: t.danio, bonoExitos: 0, total: t.danio, categoria: t.categoria },
      }),
    };
    setHistorial((h) => [lanzamiento, ...h].slice(0, 6));
    setPeajes((ps) => ps.map((x, j) => (j === i ? { ...x, salvacion: lanzamiento } : x)));
  };

  // `id` llega del click (el compilador de React no acepta Date.now() aquí).
  const tirarSalvacionSobrecarga = (id: number) => {
    if (!sobrecarga || sobrecarga.salvacion) return;
    const salv = ACCIONES.find((a) => a.id === "salv_fortaleza")!;
    const dificultad = dificultadSobrecarga(sobrecarga.nivel);
    const r = tirarMontada(montarTirada(ficha, salv, SIN_ELECCION), tirarD12(), dificultad);
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

  // Abre (o reabre, al cambiar una elección) el modal del poder.
  const abrirPoder = (poder: PoderDisponible, seleccion: SeleccionPoder = SELECCION_PODER_VACIA) => {
    const p = prepararPoder({ ficha: sheet, modificadores: mods, niveles, poder, seleccion });
    if (!p) return;
    if (p.tirada) abrir(p.tirada, p.enEspecialidad, false);
    setSobrecarga(null);
    setPeajes([]);
    setAvisosPoder([]);
    setPoderAbierto({ poder, seleccion: p.seleccion, directo: !p.tirada, usado: null });
  };

  // Aplica a la ficha lo que devuelve usarPoder. Devuelve la fatiga pagada.
  // El peaje sale también sin onPagarFatiga (NPC en la consola): no depende de la
  // fatiga que quede, solo de lo que cuesta el uso. Un uso nuevo borra los anteriores;
  // prolongar Proeza añade el suyo sin perder uno aún sin tirar.
  const aplicarUso = (e: EfectosDeUso, modo: "uso" | "prolongar"): number => {
    const nuevo = e.peaje ? [{ peaje: e.peaje, salvacion: null }] : [];
    setPeajes((ps) => (modo === "uso" ? nuevo : [...ps, ...nuevo]));
    if (!onPagarFatiga) return e.fatiga.pagar;
    if (e.fatiga.pagar > 0) onPagarFatiga(e.fatiga.pagar, e.fatiga.temporal);
    if (e.cargas) onGastarRecurso?.(e.cargas.instanciaId, -e.cargas.gastar);
    if (e.vida > 0) onAjustarVida?.(-e.vida);
    if (e.sobrecarga.tipo === "salta") setSobrecarga({ nivel: e.sobrecarga.nivel, salvacion: null });
    else if (e.sobrecarga.tipo === "reiniciar") setSobrecarga(null);
    setAvisosPoder(e.avisos);
    return e.fatiga.pagar;
  };

  // Uso del poder (con tirada o sin ella), falle o no; "prolongar" = otro turno
  // de Proeza. Sin fatiga numérica se paga a mano: no se aplica nada.
  const pagarPoder = (modo: "uso" | "prolongar" = "uso"): number =>
    preparado?.coste ? aplicarUso(usarPoder(ficha, preparado, modo), modo) : 0;

  const registroSinDado = (id: number, label: string) =>
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

  // Proeza: cada turno que se prolonga el control se vuelve a pagar el extra.
  const prolongarProeza = (id: number) => {
    const extra = preparado?.extraProrroga ?? 0;
    if (extra <= 0 || !poderAbierto) return;
    pagarPoder("prolongar");
    registroSinDado(id, `${poderAbierto.poder.accion.label}: prolongar un turno (−${extra} fatiga)`);
  };

  // `id` llega del click, como en tirarSalvacionSobrecarga.
  const usarPoderDirecto = (id: number) => {
    if (!poderAbierto || !preparado || preparado.bloqueo) return;
    const pagado = pagarPoder();
    registroSinDado(id, etiquetaPoder(poderAbierto.poder.accion, preparado.resuelto));
    setPoderAbierto({ ...poderAbierto, usado: pagado });
  };

  const cerrarPoder = () => {
    setModal(null);
    setPoderAbierto(null);
    setSobrecarga(null);
    setPeajes([]);
    setAvisosPoder([]);
  };

  const extraProeza = preparado?.extraProrroga ?? 0;
  const piePoder =
    avisosPoder.length > 0 || sobrecarga || peajes.length > 0 || extraProeza > 0 ? (
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
        {peajes.map((x, i) => (
          <PeajePanel
            key={i}
            dificultad={x.peaje.dificultad}
            salvacion={x.salvacion}
            restado={!!onAjustarVida}
            onTirar={(id) => tirarSalvacionPeaje(i, id)}
          />
        ))}
      </>
    ) : undefined;

  const cabeceraPoder =
    poderAbierto && preparado ? (
      <CabeceraPoder
        accion={poderAbierto.poder.accion}
        poder={preparado.resuelto}
        coste={preparado.coste}
        fatigaActual={preparado.fatigaActual}
        toggles={preparado.casillas}
        togglesActivos={preparado.seleccion.casillas}
        onElegir={(eje, opcion) =>
          abrirPoder(poderAbierto.poder, {
            ...preparado.seleccion,
            elecciones: { ...preparado.seleccion.elecciones, [eje]: opcion },
          })
        }
        onToggles={(casillas) => abrirPoder(poderAbierto.poder, { ...preparado.seleccion, casillas })}
        cargas={
          preparado.cargas
            ? {
                nivel: preparado.cargas.derivacion.nivel,
                disponibles: preparado.cargas.derivacion.cargas,
                porPunto: preparado.cargas.derivacion.cargasPorPunto,
                puntos: preparado.cargas.puntos,
                max: preparado.cargas.max,
                onCambiar: (puntosCargas) =>
                  setPoderAbierto({ ...poderAbierto, seleccion: { ...poderAbierto.seleccion, puntosCargas } }),
              }
            : undefined
        }
        pesoKg={preparado.seleccion.pesoKg}
        onPeso={(pesoKg) => abrirPoder(poderAbierto.poder, { ...preparado.seleccion, pesoKg })}
      />
    ) : null;


  const tirar = ({
    dado,
    dados,
    montada,
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
    montada: TiradaMontada;
    estadoCondiciones: EstadoCondiciones;
    dificultad: number | null;
    circunstancial: number;
  }) => {
    if (!modal) return;
    const { tirada } = modal;
    const sutilActivo = modal.eleccion.sutil;
    // Total y márgenes de crítico (la VTM "complejo" incluida) vienen montados.
    const r = tirarMontada(montada, dado, dificultad);

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
    if (tirada.grupo === "Psiónica" && preparado) {
      pagarPoder();
      // Daño propio que depende del resultado (fracaso crítico del Sondeo).
      const tras = efectosDelResultado(preparado, gradoDeTirada(r));
      if (tras.vida > 0) onAjustarVida?.(-tras.vida);
      if (tras.avisos.length > 0) setAvisosPoder((a) => [...a, ...tras.avisos]);
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
    // Activar la visión del Arianyi (§14.9): la primera hora, por el camino de la fatiga
    // de los poderes; sin onPagarFatiga (consola), a mano.
    if (modalDirecta.costeFatiga) onPagarFatiga?.(modalDirecta.costeFatiga, false);
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
          <FilaTirada key={t.id} tirada={t} ficha={ficha} onAbrir={abrir} />
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
                {d.label} · {textoNivelEnAcciones(ficha.psionica.disciplinas[d.id as DisciplinaId])}
              </h3>
              {poderes
                .filter((p) => p.disciplina === d)
                .map((p) => (
                  <FilaPoder key={p.accion.id} poder={p} sheet={sheet} mods={mods} niveles={niveles} onAbrir={abrirPoder} />
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
            <FilaTirada key={t.id} tirada={t} ficha={ficha} onAbrir={abrir} />
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
            <FilaTirada key={t.id} tirada={t} ficha={ficha} onAbrir={abrir} />
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
            .map(conExtras)
            .map((t) => conPsionicaEnTiradaFija(niveles, conEsquivaLevitando(niveles, t)))
            // Defensa/Esquiva (fija) primero, Bloquear-con-X (generado por
            // equipo) detrás — mismo orden que Ataques: lo fijo antes que lo
            // que trae cada arma. "Volar" entra igual dentro de "Acciones".
            .concat(grupo === "Defensa" ? defensaGenerada : grupo === "Acciones" ? accionesGeneradas : [])
            .map((t) => (
              <FilaTirada key={t.id} tirada={t} ficha={ficha} onAbrir={abrir} />
            ))}
          {/* "Levantar [escudo]" — una fila por cada escudo equipado, generada
              por accionesDirectasDeAtaque() (combate.ts), no por el catálogo
              fijo de ACCIONES. */}
          {grupo === "Defensa" &&
            defensaDirecta.map((a) => <FilaUsar key={a.id} accion={a} onAbrir={abrirDirecta} />)}
          {/* Bloquear daño vive junto a Defensa/esquiva — tampoco es una
              tirada fija de ACCIONES (no tira dado, no muta la ficha). */}
          {grupo === "Defensa" && <FilaBloquearDanio onAbrir={() => setBloquearDanioAbierta(true)} />}
          {/* Acciones sin dado de la especie (activar la visión, §14.9): de la FichaResuelta. */}
          {grupo === "Acciones" &&
            ficha.accionesEspecie.map((a) => <FilaUsar key={a.id} accion={a} onAbrir={abrirDirecta} />)}
          {/* Reparar y Fabricar vive aquí, junto a Hackeo — no es una
              tirada fija de ACCIONES (no tira dado), así que se añade a
              mano en vez de venir del catálogo. */}
          {grupo === "Acciones" && onReparar && (
            <FilaReparaFabrica onAbrir={() => setReparaFabricaAbierta(true)} />
          )}
        </div>
      ))}

      {bloquearDanioAbierta && (
        <BloquearDanioModal ficha={ficha} onCerrar={() => setBloquearDanioAbierta(false)} />
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
          ficha={ficha}
          setHistorial={setHistorial}
          memoria={memoria}
          setMemoria={setMemoria}
          onReparar={onReparar}
          onFabricar={onFabricar}
          libre={libre}
          onCerrar={() => setReparaFabricaAbierta(false)}
        />
      )}

      {poderAbierto?.directo && preparado && (
        <UsarPoderModal
          titulo={etiquetaPoder(poderAbierto.poder.accion, preparado.resuelto)}
          cabecera={cabeceraPoder}
          bloqueo={preparado.bloqueo}
          usado={poderAbierto.usado !== null}
          costeUsado={poderAbierto.usado}
          objetivoTira={preparado.resuelto.objetivoTira.map((t) => ({
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
          bloqueo={modal.tirada.grupo === "Psiónica" ? (preparado?.bloqueo ?? null) : null}
          pieResultado={modal.tirada.grupo === "Psiónica" ? piePoder : undefined}
          ficha={modal.ficha}
          eleccion={modal.eleccion}
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
