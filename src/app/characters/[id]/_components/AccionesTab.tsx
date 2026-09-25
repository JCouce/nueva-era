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
  accionesDeAtaque,
  accionesDeHerramientas,
  valorCondiciones,
  valorBonosTramo,
  modificadoresActivos,
  aplicado,
  modificadoresDeEstados,
  indiceDeCondiciones,
  consultaIndiceCondiciones,
  bonoAlcance,
  modoElegido,
  type Accion,
  type Sheet,
  type EstadoCondiciones,
  type EstadoActivo,
  type ModificadorConFuente,
  type MaterialTier,
} from "@/lib/rules";
import { HudCard } from "@/components/HudCard";
import { AccionModal } from "@/components/AccionModal";
import { ReparaFabricaModal } from "./ReparaFabricaModal";
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
  if (h.exito === null) return "text-foreground";
  if (h.exito) return h.critico ? "text-accent" : "text-info";
  return h.critico ? "text-danger" : "text-muted";
}

// "3 éxitos" / "1 fracaso" / "2 fracasos" — o el total a secas si la tirada
// no llevaba dificultad (no hay margen que contar).
function textoExitos(h: Lanzamiento): string {
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

  const especialidades = tirada.habilidad
    ? sheet.habilidades[tirada.habilidad].especialidades
    : [];
  const mod = modificadorAccion(sheet, tirada, enEspecialidad, mods, sutilActivo);
  const aplicadoActivoId = sutilActivo && tirada.aplicadoSutil ? tirada.aplicadoSutil : tirada.aplicado;
  const nombreAplicado = APLICADOS.find((a) => a.id === aplicadoActivoId)!;
  const nombreHabilidad = tirada.habilidad
    ? HABILIDADES.find((h) => h.id === tirada.habilidad)!.label
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
          onClick={() => onAbrir(tirada, enEspecialidad, sutilActivo)}
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

export function AccionesTab({
  sheet,
  estadosCombate = [],
  historial,
  setHistorial,
  memoria,
  setMemoria,
  onReparar,
  onFabricar,
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
  // NpcEditor.tsx (edición libre de máster): la tirada de Fabricar no aplica
  // — FabricarSeccion la salta y llama a onFabricar directo con éxito fijo,
  // mismo criterio que AtributosTab/HabilidadesTab con este mismo prop.
  libre?: boolean;
}) {
  const mods = [...modificadoresActivos(sheet), ...modificadoresDeEstados(estadosCombate)];
  const [reparaFabricaAbierta, setReparaFabricaAbierta] = useState(false);
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
  const { ataques, defensaGenerada, herramientas } = useMemo(() => {
    const generadas = accionesDeAtaque(sheet).map(conCondicionesDeEquipo);
    return {
      ataques: generadas.filter((t) => t.grupo === "Ataques"),
      defensaGenerada: generadas.filter((t) => t.grupo === "Defensa"),
      herramientas: accionesDeHerramientas(sheet).map(conCondicionesDeEquipo),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet.equipo, sheet.recursos, indiceCondiciones]);

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

  const tirar = ({
    dado,
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
    const r = resolverTirada({
      dado,
      modificador: modBase + bonoCondiciones + bonoTramo + bonoEquipoEspecie,
      circunstancial,
      dificultad,
    });

    setMemoria((m) => ({ ...m, [tirada.id]: { dificultad, circunstancial } }));

    let danioInfo: DanioInfo | null = null;
    if (tirada.ataque) {
      const modoId = typeof estadoCondiciones.modo === "string" ? estadoCondiciones.modo : tirada.ataque.modos[0].id;
      const modo = tirada.ataque.modos.find((m) => m.id === modoId) ?? tirada.ataque.modos[0];
      const danioBase = sutilActivo ? (modo.danioSutil ?? modo.danio) : modo.danio;
      danioInfo = { base: danioBase, formulaDanio: modo.formulaDanio, categoriaDanio: modo.categoriaDanio };
    }

    const id = Date.now();
    setHistorial((h) =>
      [
        { ...r, id, label: tirada.label, danioInfo, efectoCritico: tirada.efectoCritico, efectos: tirada.efectos },
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
      </div>

      {/* Como Ataques: dinámica, generada por lo que hay equipado, no del
          catálogo fijo (ver herramientas.ts). Solo se pinta si hay algo que
          la use — a diferencia de Ataques, es opcional para la mayoría de
          personajes y no merece un hueco vacío permanente. */}
      {herramientas.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="mt-2 border-b border-border pb-1 font-display text-sm font-semibold uppercase tracking-wide text-muted">
            Herramientas
          </h2>
          {herramientas.map((t) => (
            <FilaTirada key={t.id} tirada={t} sheet={sheet} mods={mods} onAbrir={abrir} />
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
            // Defensa/Esquiva (fija) primero, Bloquear-con-X (generado por
            // equipo) detrás — mismo orden que Ataques: lo fijo antes que lo
            // que trae cada arma.
            .concat(grupo === "Defensa" ? defensaGenerada : [])
            .map((t) => (
              <FilaTirada key={t.id} tirada={t} sheet={sheet} mods={mods} onAbrir={abrir} />
            ))}
          {/* Reparar y Fabricar vive aquí, junto a Hackeo — no es una
              tirada fija de ACCIONES (no tira dado), así que se añade a
              mano en vez de venir del catálogo. */}
          {grupo === "Acciones" && onReparar && (
            <FilaReparaFabrica onAbrir={() => setReparaFabricaAbierta(true)} />
          )}
        </div>
      ))}

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

      {modal && (
        <AccionModal
          titulo={modal.tirada.label}
          nota={modal.tirada.nota}
          subtitulo={
            especialidadesActuales.length > 0
              ? `especialidad: ${especialidadesActuales.join(" / ")}`
              : undefined
          }
          modBase={modal.modBase}
          desgloseBase={modal.desgloseBase}
          condiciones={modal.tirada.condiciones ?? []}
          bonosTramo={modal.tirada.bonosTramo ?? []}
          mods={modal.mods}
          ctxBase={modal.ctxBase}
          dificultadInicial={memoria[modal.tirada.id]?.dificultad ?? 7}
          circunstancialInicial={memoria[modal.tirada.id]?.circunstancial ?? 0}
          resultado={resultadoModal}
          onTirarDanio={tirarDanio}
          onCerrar={() => setModal(null)}
          onTirar={tirar}
        />
      )}
    </div>
  );
}
