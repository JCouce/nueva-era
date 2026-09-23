"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  clampInt,
  ATRIBUTO_MIN,
  ATRIBUTO_MAX,
  HABILIDAD_NO_ENTRENADA,
  HABILIDAD_MAX,
  type Sheet,
  type AtributoId,
  type HabilidadId,
  type PiezaEquipada,
} from "@/lib/rules";
import { AtributosTab } from "@/app/characters/[id]/_components/AtributosTab";
import { HabilidadesTab } from "@/app/characters/[id]/_components/HabilidadesTab";
import { AccionesTab } from "@/app/characters/[id]/_components/AccionesTab";
import type { Lanzamiento } from "@/components/ResultadoTirada";
import { EquipoTab } from "@/app/characters/[id]/_components/EquipoTab";
import { TiendaTab } from "@/app/characters/[id]/_components/TiendaTab";
import { RecursosTab } from "@/app/characters/[id]/_components/RecursosTab";
import {
  renombrarNpcAction,
  setNotaNpcAction,
  setAtributoNpcAction,
  setHabilidadNpcAction,
  addEspecialidadNpcAction,
  removeEspecialidadNpcAction,
  equiparNpcAction,
  desequiparNpcAction,
  ajustarRecursoNpcAction,
  comprarRecargaNpcAction,
  eliminarNpcAction,
  type NpcResult,
} from "../actions";

// Fase 6b 5.1: espejo simplificado de CharacterSheet.tsx — reusa sus tabs de
// Atributos/Habilidades/Equipo/Tienda en modo "libre" (sin point-buy, sin
// pool, sin tope de rareza, ver master/npcs/actions.ts) en vez de un editor
// desde cero.
//
// Atributos/habilidades SÍ usan la cola con debounce y estado optimista de
// CharacterSheet.tsx (añadido 2026-09-22 tras medir en producción: sin esto,
// cada click esperaba el viaje completo a Vercel/Neon — 200-700ms, con
// picos por el salto de región cdg1→iad1 — sin ningún feedback visual, y
// clicks rápidos ni siquiera se acumulaban porque cada uno partía del mismo
// valor todavía no confirmado por el servidor). El resto (nombre, nota,
// especialidades, equipo) se queda con el viaje directo: son ediciones de
// texto o de un solo click, no steppers que se mashean.
const AUTOSAVE_DEBOUNCE_MS = 500;
const TABS = [
  { id: "identidad", label: "Identidad" },
  { id: "attrs", label: "Atributos" },
  { id: "skills", label: "Habilidades" },
  { id: "acciones", label: "Acciones" },
  { id: "equipo", label: "Equipo" },
  { id: "recursos", label: "Recursos" },
  { id: "tienda", label: "Tienda" },
] as const;
type TabId = (typeof TABS)[number]["id"];
type SaveStatus = "idle" | "saving" | "saved" | "error";

function TabButton({
  tab,
  active,
  onClick,
}: {
  tab: { id: TabId; label: string };
  active: boolean;
  onClick: (id: TabId) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(tab.id)}
      className={`-mb-px border-b-2 px-3 py-2 font-display text-sm font-semibold uppercase tracking-wide ${
        active ? "border-accent text-foreground" : "border-transparent text-muted"
      }`}
    >
      {tab.label}
    </button>
  );
}

export function NpcEditor({
  npcId,
  initialNombre,
  initialNota,
  initialSheet,
}: {
  npcId: string;
  initialNombre: string;
  initialNota: string;
  initialSheet: Sheet;
}) {
  const router = useRouter();
  const [active, setActive] = useState<TabId>("identidad");
  const [sheet, setSheet] = useState<Sheet>(initialSheet);
  const [nombre, setNombre] = useState(initialNombre);
  const [nota, setNota] = useState(initialNota);
  const [status, setStatus] = useState<SaveStatus>("idle");
  // Mismo motivo que en CharacterSheet.tsx (2026-09-24): AccionesTab se
  // desmonta al cambiar de tab, así que su historial sube aquí para
  // sobrevivir al ir y volver a "Acciones" mientras se edita el NPC.
  const [accionesHistorial, setAccionesHistorial] = useState<Lanzamiento[]>([]);
  const [accionesMemoria, setAccionesMemoria] = useState<
    Record<string, { dificultad: number | null; circunstancial: number }>
  >({});

  const nombreTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onNombre = (v: string) => {
    setNombre(v);
    if (nombreTimer.current) clearTimeout(nombreTimer.current);
    nombreTimer.current = setTimeout(async () => {
      setStatus("saving");
      const res = await renombrarNpcAction(npcId, v);
      setStatus(res.ok ? "saved" : "error");
    }, AUTOSAVE_DEBOUNCE_MS);
  };
  const onNota = (v: string) => {
    setNota(v);
    if (notaTimer.current) clearTimeout(notaTimer.current);
    notaTimer.current = setTimeout(async () => {
      setStatus("saving");
      const res = await setNotaNpcAction(npcId, v);
      setStatus(res.ok ? "saved" : "error");
    }, AUTOSAVE_DEBOUNCE_MS);
  };

  // Cola secuencial (evita carreras load-modify-write si dos guardados se
  // cruzan) + debounce por campo (clics rápidos en un stepper colapsan en un
  // único guardado) — mismo mecanismo que CharacterSheet.tsx, ver comentario
  // de cabecera.
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const pendingTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const runSave = useCallback((fn: () => Promise<NpcResult>, onOk?: (s: Sheet) => void) => {
    setStatus("saving");
    queue.current = queue.current.then(() => fn()).then(
      (res) => {
        if (res.ok) {
          onOk?.(res.sheet);
          setStatus("saved");
        } else setStatus("error");
      },
      () => setStatus("error"),
    );
  }, []);

  const scheduleCommit = (key: string, fn: () => Promise<NpcResult>, onOk?: (s: Sheet) => void) => {
    const existing = pendingTimers.current.get(key);
    if (existing) clearTimeout(existing);
    pendingTimers.current.set(
      key,
      setTimeout(() => {
        pendingTimers.current.delete(key);
        runSave(fn, onOk);
      }, AUTOSAVE_DEBOUNCE_MS),
    );
  };

  // Pinta ya con el mismo clamp que aplica el servidor (sin pool: modo
  // libre, ver master/npcs/actions.ts — mismos límites en las dos
  // direcciones, sin ningún guardarraíl extra que el cliente no conozca).
  // Sin reconciliar al volver el servidor, a propósito: a diferencia de
  // CharacterSheet.tsx (que sí reconcilia cuando `aprobada`, porque ahí el
  // servidor aplica un guardarraíl de XP que el cliente no puede calcular),
  // aquí cliente y servidor siempre calculan el mismo número — reconciliar
  // igualmente solo servía para que una respuesta en vuelo pisara, un
  // instante, un valor ya más nuevo si subías y bajabas rápido (flick
  // reportado en directo el 2026-09-22).
  const commitAtributo = (id: AtributoId, value: number) => {
    const v = clampInt(value, ATRIBUTO_MIN, ATRIBUTO_MAX, sheet.atributos[id]);
    setSheet((s) => ({ ...s, atributos: { ...s.atributos, [id]: v } }));
    scheduleCommit(`atributo:${id}`, () => setAtributoNpcAction(npcId, id, value));
  };
  const commitHabilidad = (id: HabilidadId, value: number) => {
    const v = clampInt(value, HABILIDAD_NO_ENTRENADA, HABILIDAD_MAX, sheet.habilidades[id].valor);
    setSheet((s) => ({ ...s, habilidades: { ...s.habilidades, [id]: { ...s.habilidades[id], valor: v } } }));
    scheduleCommit(`habilidad:${id}`, () => setHabilidadNpcAction(npcId, id, value));
  };
  const commitAddEspecialidad = async (id: HabilidadId, esp: string) => {
    setStatus("saving");
    const res = await addEspecialidadNpcAction(npcId, id, esp);
    if (res.ok) setSheet(res.sheet);
    setStatus(res.ok ? "saved" : "error");
  };
  const commitRemoveEspecialidad = async (id: HabilidadId, esp: string) => {
    setStatus("saving");
    const res = await removeEspecialidadNpcAction(npcId, id, esp);
    if (res.ok) setSheet(res.sheet);
    setStatus(res.ok ? "saved" : "error");
  };
  const commitEquipar = async (pieza: PiezaEquipada) => {
    setStatus("saving");
    const res = await equiparNpcAction(npcId, pieza);
    if (res.ok) setSheet(res.sheet);
    setStatus(res.ok ? "saved" : "error");
  };
  const commitDesequipar = async (instanciaId: string) => {
    setStatus("saving");
    const res = await desequiparNpcAction(npcId, instanciaId);
    if (res.ok) setSheet(res.sheet);
    setStatus(res.ok ? "saved" : "error");
  };
  const commitAjustarRecurso = async (instanciaId: string, delta: number) => {
    setStatus("saving");
    const res = await ajustarRecursoNpcAction(npcId, instanciaId, delta);
    if (res.ok) setSheet(res.sheet);
    setStatus(res.ok ? "saved" : "error");
  };
  const commitRecargar = async (instanciaId: string) => {
    setStatus("saving");
    const res = await comprarRecargaNpcAction(npcId, instanciaId);
    if (res.ok) setSheet(res.sheet);
    setStatus(res.ok ? "saved" : "error");
  };

  // Sin confirm() — bloquea el hilo con un diálogo nativo, y el resto de la
  // app (deleteCharacter en characters/page.tsx) tampoco pide confirmación
  // para borrar: mismo criterio aquí.
  const eliminar = async () => {
    await eliminarNpcAction(npcId);
    router.push("/master/npcs");
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-3xl font-bold uppercase tracking-wide">
        {nombre || "Sin nombre"}
      </h1>

      {status === "error" && (
        <p className="font-mono text-[11px] uppercase tracking-wide text-danger">
          Error al guardar — vuelve a intentarlo
        </p>
      )}

      <nav className="flex flex-wrap gap-1 border-b border-border">
        {TABS.map((t) => (
          <TabButton key={t.id} tab={t} active={active === t.id} onClick={setActive} />
        ))}
      </nav>

      {active === "identidad" && (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted">Nombre</span>
            <input
              value={nombre}
              onChange={(e) => onNombre(e.target.value)}
              maxLength={80}
              className="clip-chamfer-sm border border-border bg-night px-3 py-2 font-mono outline-none focus:border-accent"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
              Nota (libre, visible solo para el máster)
            </span>
            <textarea
              value={nota}
              onChange={(e) => onNota(e.target.value)}
              maxLength={2000}
              rows={5}
              className="clip-chamfer-sm border border-border bg-night px-3 py-2 font-mono text-sm outline-none focus:border-accent"
            />
          </label>
          <button
            type="button"
            onClick={eliminar}
            className="clip-chamfer-sm mt-2 self-start border border-danger px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide text-danger active:scale-95"
          >
            Borrar NPC
          </button>
        </div>
      )}
      {active === "attrs" && (
        <AtributosTab sheet={sheet} libre onSet={commitAtributo} />
      )}
      {active === "skills" && (
        <HabilidadesTab
          sheet={sheet}
          libre
          onSet={commitHabilidad}
          onAddEspecialidad={commitAddEspecialidad}
          onRemoveEspecialidad={commitRemoveEspecialidad}
        />
      )}
      {active === "acciones" && (
        <div className="flex flex-col gap-3">
          {/* 5.6: preview en reposo, sin estados — una NpcTemplate no tiene
              dónde guardarlos (rondasRestantes solo lo consume el motor de
              turnos de un Combate real, ver docs/fase-6b.md). Para tirar
              con confuso/enfermo/etc. aplicados, la 5.5 en la consola de
              combate usa el sheet+estados congelados del Combatiente. */}
          <p className="font-mono text-[11px] leading-relaxed text-muted">
            Vista previa en reposo, sin estados aplicados — para eso hace falta un
            combate real (fase 6b, subtarea 5.5).
          </p>
          <AccionesTab
            sheet={sheet}
            historial={accionesHistorial}
            setHistorial={setAccionesHistorial}
            memoria={accionesMemoria}
            setMemoria={setAccionesMemoria}
          />
        </div>
      )}
      {active === "equipo" && <EquipoTab sheet={sheet} onDesequipar={commitDesequipar} />}
      {active === "recursos" && (
        <RecursosTab sheet={sheet} onAjustar={commitAjustarRecurso} onRecargar={commitRecargar} />
      )}
      {active === "tienda" && (
        <TiendaTab sheet={sheet} topeRareza={null} libre onEquipar={commitEquipar} />
      )}
    </div>
  );
}
