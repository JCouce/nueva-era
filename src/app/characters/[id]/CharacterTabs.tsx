"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { saveStats, type SaveStatsState } from "./actions";
import type { Stats } from "@/lib/validation";

const TABS = [{ id: "stats", label: "Estadísticas" }] as const;

type Row = { key: string; value: string };

function statsToRows(stats: Stats): Row[] {
  const rows = Object.entries(stats).map(([key, value]) => ({
    key,
    value: String(value),
  }));
  return rows.length ? rows : [{ key: "", value: "" }];
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-accent px-4 py-3 font-semibold text-black active:scale-[0.99] disabled:opacity-60"
    >
      {pending ? "Guardando…" : "Guardar"}
    </button>
  );
}

export function CharacterTabs({
  characterId,
  initialStats,
}: {
  characterId: string;
  initialStats: Stats;
}) {
  const [active, setActive] = useState<(typeof TABS)[number]["id"]>("stats");
  const [rows, setRows] = useState<Row[]>(() => statsToRows(initialStats));

  const [state, formAction] = useActionState<SaveStatsState, FormData>(
    saveStats.bind(null, characterId),
    undefined,
  );

  const setRow = (i: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () => setRows((rs) => [...rs, { key: "", value: "" }]);
  const removeRow = (i: number) =>
    setRows((rs) => rs.filter((_, idx) => idx !== i));

  return (
    <div>
      <nav className="mb-4 flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
              active === t.id
                ? "border-accent text-foreground"
                : "border-transparent text-zinc-500"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {active === "stats" && (
        <form action={formAction} className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            {rows.map((row, i) => (
              <div key={i} className="flex gap-2">
                <input
                  name="key"
                  value={row.key}
                  onChange={(e) => setRow(i, { key: e.target.value })}
                  placeholder="Estadística"
                  className="flex-1 rounded-lg border border-border bg-card px-3 py-2.5 text-base outline-none focus:border-accent"
                />
                <input
                  name="value"
                  value={row.value}
                  onChange={(e) => setRow(i, { value: e.target.value })}
                  placeholder="Valor"
                  inputMode="text"
                  className="w-24 rounded-lg border border-border bg-card px-3 py-2.5 text-base outline-none focus:border-accent"
                />
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  className="px-2 text-zinc-500 hover:text-red-400"
                  aria-label="Quitar fila"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addRow}
            className="self-start text-sm text-accent underline-offset-4 hover:underline"
          >
            + Añadir estadística
          </button>

          {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
          {state?.ok && <p className="text-sm text-green-400">Guardado ✓</p>}

          <SaveButton />
        </form>
      )}
    </div>
  );
}
