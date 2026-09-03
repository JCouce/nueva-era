"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  setAtributoAction,
  setHabilidadAction,
  addEspecialidadAction,
  removeEspecialidadAction,
  saveIdentityAction,
  resetBuildAction,
  type SaveResult,
} from "./actions";
import {
  setAtributoValue,
  setHabilidadValue,
  addEspecialidad,
  removeEspecialidad,
  puntosAtributosDisponibles,
  puntosHabilidadesDisponibles,
  salud,
  type AtributoId,
  type HabilidadId,
} from "@/lib/rules";
import type { Sheet } from "@/lib/rules";
import { ResumenTab } from "./_components/ResumenTab";
import { AtributosTab } from "./_components/AtributosTab";
import { HabilidadesTab } from "./_components/HabilidadesTab";
import { PendienteTab } from "./_components/PendienteTab";

const TABS = [
  { id: "resumen", label: "Resumen" },
  { id: "attrs", label: "Atributos" },
  { id: "skills", label: "Habilidades" },
  { id: "dotes", label: "Dotes" },
  { id: "poderes", label: "Poderes" },
  { id: "aumentos", label: "Aumentos" },
  { id: "equipo", label: "Equipo" },
] as const;
type TabId = (typeof TABS)[number]["id"];
type SaveStatus = "idle" | "saving" | "saved" | "error";

const STATUS_LABEL: Record<SaveStatus, string> = {
  idle: "",
  saving: "guardando…",
  saved: "guardado ✓",
  error: "error al guardar",
};

function clampInt(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function CharacterSheet({
  characterId,
  initialName,
  initialSheet,
}: {
  characterId: string;
  initialName: string;
  initialSheet: Sheet;
}) {
  const [active, setActive] = useState<TabId>("resumen");
  const [sheet, setSheet] = useState<Sheet>(initialSheet);
  const [name, setName] = useState(initialName);
  const [status, setStatus] = useState<SaveStatus>("idle");

  // Refs con el último valor, para leerlos dentro de los saves con debounce.
  // Se sincronizan en efecto, no en render: escribirlas durante el render
  // rompe la garantía de React y lo avisa el linter.
  const sheetRef = useRef(sheet);
  const nameRef = useRef(name);
  useEffect(() => {
    sheetRef.current = sheet;
    nameRef.current = name;
  }, [sheet, name]);

  // Cola secuencial: los autosaves no se pisan (evita carreras load-modify-write).
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const idTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSave = useCallback(
    (fn: () => Promise<SaveResult>, onOk?: (s: Sheet) => void) => {
      setStatus("saving");
      queue.current = queue.current
        .then(() => fn())
        .then(
          (res) => {
            if (res.ok) {
              onOk?.(res.sheet);
              setStatus("saved");
            } else setStatus("error");
          },
          () => setStatus("error"),
        );
    },
    [],
  );

  // ── Build (inmediato). El estado optimista usa las mismas funciones puras
  // que el servidor, así que no hace falta reconciliar en éxito. ──
  const commitAtributo = (id: AtributoId, value: number) => {
    setSheet((s) => setAtributoValue(s, id, value));
    runSave(() => setAtributoAction(characterId, id, value));
  };
  const commitHabilidad = (id: HabilidadId, value: number) => {
    setSheet((s) => setHabilidadValue(s, id, value));
    runSave(() => setHabilidadAction(characterId, id, value));
  };
  const commitAddEspecialidad = (id: HabilidadId, nombre: string) => {
    setSheet((s) => addEspecialidad(s, id, nombre));
    runSave(() => addEspecialidadAction(characterId, id, nombre));
  };
  const commitRemoveEspecialidad = (id: HabilidadId, nombre: string) => {
    setSheet((s) => removeEspecialidad(s, id, nombre));
    runSave(() => removeEspecialidadAction(characterId, id, nombre));
  };
  const reset = () => {
    runSave(() => resetBuildAction(characterId), setSheet);
  };

  // ── Identidad (debounced, fire-and-forget). ──
  const scheduleIdentity = () => {
    if (idTimer.current) clearTimeout(idTimer.current);
    idTimer.current = setTimeout(() => {
      runSave(() =>
        saveIdentityAction(characterId, {
          name: nameRef.current,
          edad: sheetRef.current.edad,
          especie: sheetRef.current.especie,
          trasfondo: sheetRef.current.trasfondo,
          motivacion: sheetRef.current.motivacion,
        }),
      );
    }, 500);
  };

  const onName = (v: string) => {
    setName(v);
    scheduleIdentity();
  };
  const onEdad = (v: number | null) => {
    setSheet((s) => ({ ...s, edad: v === null ? null : clampInt(v, 0, 999) }));
    scheduleIdentity();
  };
  const onEspecie = (v: string) => {
    setSheet((s) => ({ ...s, especie: v }));
    scheduleIdentity();
  };
  const onTrasfondo = (v: string) => {
    setSheet((s) => ({ ...s, trasfondo: v }));
    scheduleIdentity();
  };
  const onMotivacion = (v: string) => {
    setSheet((s) => ({ ...s, motivacion: v }));
    scheduleIdentity();
  };

  const puntosAttr = puntosAtributosDisponibles(sheet);
  const puntosSkill = puntosHabilidadesDisponibles(sheet);
  const { vida, fatiga } = salud(sheet);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-3xl font-bold uppercase tracking-wide">
        {name || "Sin nombre"}
      </h1>

      {/* HUD fino: estado de solo lectura (la edición está en cada tab) */}
      <div className="flex items-center gap-3 border-y border-border py-2 font-mono text-sm">
        <span className="uppercase tracking-wide text-muted">
          {sheet.especie || "sin especie"}
        </span>
        <span className="ml-auto tabular-nums text-danger">
          {vida}
          <span className="text-muted"> pv</span>
        </span>
        <span className="tabular-nums text-info">
          {fatiga}
          <span className="text-muted"> fat</span>
        </span>
      </div>

      <div className="flex items-end justify-between border-b border-border">
        <nav className="flex flex-wrap gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActive(t.id)}
              className={`-mb-px border-b-2 px-3 py-2 font-display text-sm font-semibold uppercase tracking-wide ${
                active === t.id
                  ? "border-accent text-foreground"
                  : "border-transparent text-muted"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <span
          className={`pr-1 font-mono text-[11px] uppercase tracking-wide ${
            status === "error" ? "text-danger" : "text-muted"
          }`}
        >
          {STATUS_LABEL[status]}
        </span>
      </div>

      {active === "resumen" && (
        <ResumenTab
          name={name}
          sheet={sheet}
          onName={onName}
          onEdad={onEdad}
          onEspecie={onEspecie}
          onTrasfondo={onTrasfondo}
          onMotivacion={onMotivacion}
        />
      )}
      {active === "attrs" && (
        <AtributosTab
          sheet={sheet}
          puntosDisponibles={puntosAttr}
          onSet={commitAtributo}
        />
      )}
      {active === "skills" && (
        <HabilidadesTab
          sheet={sheet}
          puntosDisponibles={puntosSkill}
          onSet={commitHabilidad}
          onAddEspecialidad={commitAddEspecialidad}
          onRemoveEspecialidad={commitRemoveEspecialidad}
        />
      )}
      {active === "dotes" && (
        <PendienteTab
          titulo="dotes"
          falta="El diseñador aún no ha definido qué son las dotes, cuántas se eligen ni qué cuestan."
        />
      )}
      {active === "poderes" && (
        <PendienteTab
          titulo="poderes"
          falta="Los poderes psiónicos están a medio escribir. Se sabe que consumen fatiga y que operan sobre materia, energía e información."
        />
      )}
      {active === "aumentos" && (
        <PendienteTab
          titulo="aumentos"
          falta="Los aumentos son biónicos y genéticos. Falta el catálogo y saber si hay un tope de lo que un cuerpo aguanta."
        />
      )}
      {active === "equipo" && (
        <PendienteTab
          titulo="equipo"
          falta="El catálogo está transcrito en docs/equipamiento.md, pero falta decidir cómo se compra: con qué dinero empieza un personaje y cómo se llevan las ranuras de mejoras."
        />
      )}

      {(active === "attrs" || active === "skills") && (
        <button
          type="button"
          onClick={reset}
          className="clip-chamfer-sm mt-2 self-start border border-danger px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide text-danger active:scale-95"
        >
          ⟲ Reset build
        </button>
      )}
    </div>
  );
}
