"use client";

import { useCallback, useRef, useState } from "react";
import {
  setAttributeAction,
  setSkillAction,
  setDisciplineAction,
  setEspecialidadAction,
  grantResourcesAction,
  saveIdentityAction,
  buyWeaponAction,
  sellWeaponAction,
  resetBuildAction,
  type SaveResult,
} from "./actions";
import {
  ESPECIALIDADES,
  xpDisponible,
  dineroDisponible,
  setAttributeValue,
  setSkillValue,
  setDisciplineValue,
  type AttributeId,
  type SkillId,
  type EspecialidadId,
} from "@/lib/rules";
import { weaponById } from "@/lib/weapons";
import { treeFor } from "@/lib/disciplines";
import type { BuildSheet } from "@/lib/validation";
import { ResumenTab } from "./_components/ResumenTab";
import { AtributosTab } from "./_components/AtributosTab";
import { HabilidadesTab } from "./_components/HabilidadesTab";
import { BuildTab } from "./_components/BuildTab";
import { ArmasTab } from "./_components/ArmasTab";
import { RepertorioTab } from "./_components/RepertorioTab";
import { DisciplineModal } from "./_components/DisciplineModal";
import { accentFor } from "./_components/accents";

const TABS = [
  { id: "resumen", label: "Resumen" },
  { id: "attrs", label: "Atributos" },
  { id: "skills", label: "Habilidades" },
  { id: "build", label: "Build" },
  { id: "armas", label: "Armas" },
  { id: "repertorio", label: "Repertorio" },
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
  initialSheet: BuildSheet;
}) {
  const [active, setActive] = useState<TabId>("resumen");
  const [sheet, setSheet] = useState<BuildSheet>(initialSheet);
  const [name, setName] = useState(initialName);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [openDisc, setOpenDisc] = useState<string | null>(null);

  // Refs con el último valor, para leerlos dentro de los saves con debounce.
  const sheetRef = useRef(sheet);
  sheetRef.current = sheet;
  const nameRef = useRef(name);
  nameRef.current = name;

  // Cola secuencial: los autosaves no se pisan (evita carreras load-modify-write).
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const idTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSave = useCallback(
    (fn: () => Promise<SaveResult>, onOk?: (s: BuildSheet) => void) => {
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

  // ── Economía (inmediato). El estado optimista usa las mismas funciones puras
  // que el servidor, así que no hace falta reconciliar en éxito. ──
  const commitAttribute = (id: AttributeId, value: number) => {
    setSheet((s) => setAttributeValue(s, id, value));
    runSave(() => setAttributeAction(characterId, id, value));
  };
  const commitSkill = (id: SkillId, value: number) => {
    setSheet((s) => setSkillValue(s, id, value));
    runSave(() => setSkillAction(characterId, id, value));
  };
  const commitDiscipline = (id: string, value: number) => {
    setSheet((s) => setDisciplineValue(s, id, value));
    runSave(() => setDisciplineAction(characterId, id, value));
  };
  const onEspecialidad = (value: EspecialidadId | null) => {
    setSheet((s) => ({ ...s, especialidad: value }));
    runSave(() => setEspecialidadAction(characterId, value));
  };

  // ── Armas y reset (discretos: reconcilian desde el servidor). ──
  const buyWeapon = (id: string) => {
    const w = weaponById(id);
    if (w && !sheet.weapons.some((x) => x.id === id)) {
      setSheet((s) => ({ ...s, weapons: [...s.weapons, { id, costePagado: w.precio }] }));
    }
    runSave(() => buyWeaponAction(characterId, id), setSheet);
  };
  const sellWeapon = (id: string) => {
    setSheet((s) => ({ ...s, weapons: s.weapons.filter((x) => x.id !== id) }));
    runSave(() => sellWeaponAction(characterId, id), setSheet);
  };
  const resetBuild = () => {
    runSave(() => resetBuildAction(characterId), setSheet);
  };

  // ── Identidad y recursos (debounced, fire-and-forget). ──
  const scheduleIdentity = () => {
    if (idTimer.current) clearTimeout(idTimer.current);
    idTimer.current = setTimeout(() => {
      runSave(() =>
        saveIdentityAction(characterId, {
          name: nameRef.current,
          edad: sheetRef.current.edad,
          trasfondo: sheetRef.current.trasfondo,
        }),
      );
    }, 500);
  };
  const scheduleResources = () => {
    if (resTimer.current) clearTimeout(resTimer.current);
    resTimer.current = setTimeout(() => {
      runSave(() =>
        grantResourcesAction(characterId, {
          xpGanado: sheetRef.current.xpGanado,
          dineroGanado: sheetRef.current.dineroGanado,
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
  const onTrasfondo = (v: string) => {
    setSheet((s) => ({ ...s, trasfondo: v }));
    scheduleIdentity();
  };
  const onGanadoXp = (v: number) => {
    setSheet((s) => ({ ...s, xpGanado: clampInt(v, 0, 1_000_000) }));
    scheduleResources();
  };
  const onGanadoDinero = (v: number) => {
    setSheet((s) => ({ ...s, dineroGanado: clampInt(v, 0, 1_000_000_000) }));
    scheduleResources();
  };

  const esp = ESPECIALIDADES.find((e) => e.id === sheet.especialidad);
  const accent = accentFor(sheet.especialidad);
  const xpDisp = xpDisponible(sheet);
  const dineroDisp = dineroDisponible(sheet);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-3xl font-bold uppercase tracking-wide">
        {name || "Sin nombre"}
      </h1>

      {/* HUD fino: estado de solo lectura (la edición está en Resumen) */}
      <div className="flex items-center gap-3 border-y border-border py-2 font-mono text-sm">
        <span
          className={`uppercase tracking-wide ${accent?.text ?? "text-muted"}`}
        >
          {esp ? esp.label : "sin arquetipo"}
        </span>
        <span className="ml-auto tabular-nums text-info">
          {xpDisp}
          <span className="text-muted"> xp</span>
        </span>
        <span className="tabular-nums text-accent">
          {dineroDisp.toLocaleString("es-ES")}
          <span className="text-muted"> €$</span>
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
          xpDisponible={xpDisp}
          dineroDisponible={dineroDisp}
          onName={onName}
          onEdad={onEdad}
          onTrasfondo={onTrasfondo}
          onEspecialidad={onEspecialidad}
          onGanadoXp={onGanadoXp}
          onGanadoDinero={onGanadoDinero}
        />
      )}
      {active === "attrs" && (
        <AtributosTab
          attributes={sheet.attributes}
          xpDisponible={xpDisp}
          onSet={commitAttribute}
        />
      )}
      {active === "skills" && (
        <HabilidadesTab
          attributes={sheet.attributes}
          skills={sheet.skills}
          xpDisponible={xpDisp}
          accentText={accent?.text ?? "text-info"}
          onSet={commitSkill}
        />
      )}
      {active === "build" && (
        <BuildTab
          sheet={sheet}
          xpDisponible={xpDisp}
          onSet={commitDiscipline}
          onOpen={setOpenDisc}
        />
      )}
      {active === "armas" && (
        <ArmasTab
          sheet={sheet}
          dineroDisponible={dineroDisp}
          onBuy={buyWeapon}
          onSell={sellWeapon}
        />
      )}
      {active === "repertorio" && (
        <RepertorioTab sheet={sheet} onOpen={setOpenDisc} />
      )}

      {(active === "build" || active === "armas") && (
        <button
          type="button"
          onClick={resetBuild}
          className="clip-chamfer-sm mt-2 self-start border border-danger px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide text-danger active:scale-95"
        >
          ⟲ Reset build
        </button>
      )}

      <DisciplineModal
        node={
          openDisc
            ? (treeFor(sheet.especialidad).find((n) => n.id === openDisc) ?? null)
            : null
        }
        especialidad={sheet.especialidad}
        onClose={() => setOpenDisc(null)}
      />
    </div>
  );
}
