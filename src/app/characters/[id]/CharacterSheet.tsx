"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  setAtributoAction,
  setHabilidadAction,
  addEspecialidadAction,
  removeEspecialidadAction,
  saveIdentityAction,
  resetBuildAction,
  equiparAction,
  desequiparAction,
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
  especiePorId,
  equipar,
  desequipar,
  type AtributoId,
  type HabilidadId,
  type PiezaEquipada,
} from "@/lib/rules";
import type { Sheet } from "@/lib/rules";
import { ResumenTab } from "./_components/ResumenTab";
import { AtributosTab } from "./_components/AtributosTab";
import { HabilidadesTab } from "./_components/HabilidadesTab";
import { TiradasTab } from "./_components/TiradasTab";
import { TiendaTab } from "./_components/TiendaTab";
import { EquipoTab } from "./_components/EquipoTab";

// Tres grupos, no una lista plana: la ficha en sí (fila 1), lo que el
// personaje hace o lleva (fila 2, izquierda) y el catálogo — que no es del
// personaje, es la dirección del juego consultando o repartiendo equipo —
// separado a la derecha en esa misma fila.
const TABS_FICHA = [
  { id: "resumen", label: "Resumen" },
  { id: "attrs", label: "Atributos" },
  { id: "skills", label: "Habilidades" },
] as const;
const TABS_PERSONAJE = [
  { id: "tiradas", label: "Tiradas" },
  { id: "equipo", label: "Equipo" },
] as const;
const TABS_CATALOGO = [{ id: "tienda", label: "Tienda" }] as const;
type TabId =
  | (typeof TABS_FICHA)[number]["id"]
  | (typeof TABS_PERSONAJE)[number]["id"]
  | (typeof TABS_CATALOGO)[number]["id"];
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
  // que el servidor, así que normalmente no hace falta reconciliar en éxito
  // — salvo atributos/habilidades: si la ficha está aprobada, el servidor
  // aplica además el guardarraíl de solo-comprar (aprobacion.ts), que el
  // cliente no conoce. Por eso aquí sí se reconcilia con lo que devuelve. ──
  const commitAtributo = (id: AtributoId, value: number) => {
    setSheet((s) => setAtributoValue(s, id, value));
    runSave(() => setAtributoAction(characterId, id, value), setSheet);
  };
  const commitHabilidad = (id: HabilidadId, value: number) => {
    setSheet((s) => setHabilidadValue(s, id, value));
    runSave(() => setHabilidadAction(characterId, id, value), setSheet);
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
  const commitEquipar = (pieza: PiezaEquipada) => {
    setSheet((s) => equipar(s, pieza));
    runSave(() => equiparAction(characterId, pieza));
  };
  const commitDesequipar = (instanciaId: string) => {
    setSheet((s) => desequipar(s, instanciaId));
    runSave(() => desequiparAction(characterId, instanciaId));
  };

  // ── Identidad (debounced, fire-and-forget). ──
  const scheduleIdentity = () => {
    if (idTimer.current) clearTimeout(idTimer.current);
    idTimer.current = setTimeout(() => {
      runSave(() =>
        saveIdentityAction(characterId, {
          name: nameRef.current,
          edad: sheetRef.current.edad,
          especieId: sheetRef.current.especieId,
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
  const onEspecie = (v: string | null) => {
    setSheet((s) => ({ ...s, especieId: v }));
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
          {especiePorId(sheet.especieId)?.label ?? "sin especie"}
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

      {/* El guardado es automático y casi siempre invisible a propósito —
          "guardando…"/"guardado ✓" permanente en la fila de tabs sobraba
          más de lo que ayudaba. Solo se avisa cuando de verdad hace falta
          hacer algo: el guardado ha fallado. */}
      {status === "error" && (
        <p className="font-mono text-[11px] uppercase tracking-wide text-danger">
          Error al guardar — vuelve a intentarlo
        </p>
      )}

      <div className="flex flex-col gap-1 border-b border-border">
        <nav className="flex flex-wrap gap-1">
          {TABS_FICHA.map((t) => (
            <TabButton key={t.id} tab={t} active={active === t.id} onClick={setActive} />
          ))}
        </nav>

        <div className="flex items-end justify-between gap-2">
          <nav className="flex flex-wrap gap-1">
            {TABS_PERSONAJE.map((t) => (
              <TabButton key={t.id} tab={t} active={active === t.id} onClick={setActive} />
            ))}
          </nav>
          {/* Separada del resto: la Tienda es catálogo, no algo que "es" del
              personaje — el borde y el hueco a la izquierda lo marcan. */}
          <nav className="flex flex-wrap gap-1 border-l border-border pl-2">
            {TABS_CATALOGO.map((t) => (
              <TabButton key={t.id} tab={t} active={active === t.id} onClick={setActive} />
            ))}
          </nav>
        </div>
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
      {active === "tiradas" && <TiradasTab sheet={sheet} />}
      {active === "tienda" && <TiendaTab sheet={sheet} onEquipar={commitEquipar} />}
      {active === "equipo" && <EquipoTab sheet={sheet} onDesequipar={commitDesequipar} />}

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
