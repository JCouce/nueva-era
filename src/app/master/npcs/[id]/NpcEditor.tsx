"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Sheet, AtributoId, HabilidadId, PiezaEquipada } from "@/lib/rules";
import { AtributosTab } from "@/app/characters/[id]/_components/AtributosTab";
import { HabilidadesTab } from "@/app/characters/[id]/_components/HabilidadesTab";
import { TiradasTab } from "@/app/characters/[id]/_components/TiradasTab";
import { EquipoTab } from "@/app/characters/[id]/_components/EquipoTab";
import { TiendaTab } from "@/app/characters/[id]/_components/TiendaTab";
import {
  renombrarNpcAction,
  setNotaNpcAction,
  setAtributoNpcAction,
  setHabilidadNpcAction,
  addEspecialidadNpcAction,
  removeEspecialidadNpcAction,
  equiparNpcAction,
  desequiparNpcAction,
  eliminarNpcAction,
} from "../actions";

// Fase 6b 5.1: espejo simplificado de CharacterSheet.tsx — reusa sus tabs de
// Atributos/Habilidades/Equipo/Tienda en modo "libre" (sin point-buy, sin
// pool, sin tope de rareza, ver master/npcs/actions.ts) en vez de un editor
// desde cero. Sin XP ni build en cola: cada cambio es un único viaje al
// servidor, no la cola secuencial con estado optimista que sí necesita el
// autosave del jugador — aquí no hay carreras que evitar, es el máster
// editando una plantilla, no un jugador tecleando en directo.
const TABS = [
  { id: "identidad", label: "Identidad" },
  { id: "attrs", label: "Atributos" },
  { id: "skills", label: "Habilidades" },
  { id: "tiradas", label: "Tiradas" },
  { id: "equipo", label: "Equipo" },
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

  const nombreTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onNombre = (v: string) => {
    setNombre(v);
    if (nombreTimer.current) clearTimeout(nombreTimer.current);
    nombreTimer.current = setTimeout(async () => {
      setStatus("saving");
      const res = await renombrarNpcAction(npcId, v);
      setStatus(res.ok ? "saved" : "error");
    }, 500);
  };
  const onNota = (v: string) => {
    setNota(v);
    if (notaTimer.current) clearTimeout(notaTimer.current);
    notaTimer.current = setTimeout(async () => {
      setStatus("saving");
      const res = await setNotaNpcAction(npcId, v);
      setStatus(res.ok ? "saved" : "error");
    }, 500);
  };

  // Sin cola ni estado optimista (ver comentario de arriba): se espera la
  // respuesta del servidor y se pinta lo que él devuelve, ya clampado.
  const commitAtributo = async (id: AtributoId, value: number) => {
    setStatus("saving");
    const res = await setAtributoNpcAction(npcId, id, value);
    if (res.ok) setSheet(res.sheet);
    setStatus(res.ok ? "saved" : "error");
  };
  const commitHabilidad = async (id: HabilidadId, value: number) => {
    setStatus("saving");
    const res = await setHabilidadNpcAction(npcId, id, value);
    if (res.ok) setSheet(res.sheet);
    setStatus(res.ok ? "saved" : "error");
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
      {active === "tiradas" && (
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
          <TiradasTab sheet={sheet} />
        </div>
      )}
      {active === "equipo" && <EquipoTab sheet={sheet} onDesequipar={commitDesequipar} />}
      {active === "tienda" && (
        <TiendaTab sheet={sheet} topeRareza={null} libre onEquipar={commitEquipar} />
      )}
    </div>
  );
}
