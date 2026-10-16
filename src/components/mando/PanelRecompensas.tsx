"use client";

import { useState, useTransition } from "react";
import { conSigno, formatoNumero, nombreCorto, planAjusteRecurso, type RecursoMaster } from "@/lib/rules";
import { Boton, FOCO, Opcion, Segmentado, Stepper } from "./controles";
import type { AccionesMando, AvisoMando, ObjetivoMando } from "./tipos";

const MAX_CANTIDAD = 100_000;

type Config = {
  titulo: string;
  sub: string;
  unidad: string;
  rapidos: number[];
  paso: number;
  inicial: number;
  placeholder: string;
  tono: string;
};

const CONFIG: Record<RecursoMaster, Config> = {
  xp: {
    titulo: "Experiencia",
    sub: "se suma a la ficha",
    unidad: "XP",
    rapidos: [10, 25, 50, 100],
    paso: 5,
    inicial: 50,
    placeholder: "Motivo (opcional): «Cerrasteis el trato con los manduk»",
    tono: "text-info",
  },
  creditos: {
    titulo: "Créditos",
    sub: "dar o cobrar",
    unidad: "créditos",
    rapidos: [100, 500, 1000, 5000],
    paso: 100,
    inicial: 500,
    placeholder: "Motivo (opcional): «Recompensa del contrato»",
    tono: "text-accent",
  },
};

// Pestaña Recompensas: Experiencia y Créditos, dar o quitar a todos los objetivos.
// Los NPC no tienen ni lo uno ni lo otro (combate, E1d).
export function PanelRecompensas({
  objetivos,
  acciones,
  onAviso,
}: {
  objetivos: ObjetivoMando[];
  acciones: AccionesMando;
  onAviso: (a: Omit<AvisoMando, "id">) => void;
}) {
  if (objetivos.some((o) => o.tipo === "npc")) {
    return (
      <p className="border border-dashed border-border px-3 py-3 text-muted">
        Los NPC no reciben experiencia ni créditos. Quita a los NPC del objetivo o pásate a Estados.
      </p>
    );
  }
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <TarjetaRecurso recurso="xp" objetivos={objetivos} acciones={acciones} onAviso={onAviso} />
      <TarjetaRecurso recurso="creditos" objetivos={objetivos} acciones={acciones} onAviso={onAviso} />
    </div>
  );
}

function TarjetaRecurso({
  recurso,
  objetivos,
  acciones,
  onAviso,
}: {
  recurso: RecursoMaster;
  objetivos: ObjetivoMando[];
  acciones: AccionesMando;
  onAviso: (a: Omit<AvisoMando, "id">) => void;
}) {
  const c = CONFIG[recurso];
  const [modo, setModo] = useState<"dar" | "quitar">("dar");
  const [cantidad, setCantidad] = useState(c.inicial);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();

  const delta = modo === "dar" ? cantidad : -cantidad;
  const filas = objetivos.map((o) => ({ id: o.id, nombre: nombreCorto(o.nombre), valor: o[recurso] ?? 0 }));
  // La misma comprobación que hará el servidor: si no llega a alguien, el botón no deja.
  const plan = planAjusteRecurso(recurso, delta, filas);
  const puede = objetivos.length > 0 && cantidad > 0 && plan.ok && !pendiente;
  const idMotivo = `motivo-${recurso}`;

  const enviar = () => {
    if (!puede) return;
    setError(null);
    startTransition(async () => {
      const r = await acciones.darRecurso(recurso, objetivos.map((o) => o.id), delta, motivo);
      if (!r.ok) return setError(r.error);
      setMotivo("");
      const quien = objetivos.length === 1 ? nombreCorto(objetivos[0].nombre) : `${objetivos.length} jugadores`;
      onAviso({ mensaje: `${conSigno(delta)} ${c.unidad} a ${quien}`, registroId: r.registroId, tono: "ok" });
    });
  };

  return (
    <section aria-labelledby={`titulo-${recurso}`} className="grid content-start gap-3 border border-border bg-surface p-4">
      <h3 id={`titulo-${recurso}`} className="flex items-baseline justify-between gap-2 font-display text-base font-bold">
        {c.titulo} <small className="font-mono text-xs font-normal text-muted">{c.sub}</small>
      </h3>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmentado
          etiqueta={`Dar o quitar ${c.unidad}`}
          valor={modo}
          onCambio={(m) => {
            setModo(m);
            setError(null);
          }}
          opciones={[
            { valor: "dar", label: "Dar" },
            { valor: "quitar", label: "Quitar" },
          ]}
        />
        <span
          aria-live="polite"
          className={`font-display text-4xl font-bold leading-none tabular-nums ${modo === "quitar" ? "text-danger" : c.tono}`}
        >
          {conSigno(delta)}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {c.rapidos.map((n) => (
          <Opcion key={n} elegida={cantidad === n} onClick={() => setCantidad(n)}>
            {formatoNumero(n)}
          </Opcion>
        ))}
      </div>
      <Stepper valor={cantidad} onCambio={setCantidad} min={0} max={MAX_CANTIDAD} paso={c.paso} etiqueta={c.titulo} />

      <label htmlFor={idMotivo} className="sr-only">
        Motivo
      </label>
      <input
        id={idMotivo}
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        maxLength={200}
        placeholder={c.placeholder}
        className={`min-h-11 w-full border border-border bg-night px-3 placeholder:text-muted ${FOCO}`}
      />

      <div className="grid gap-1 text-[0.95rem]">
        {filas.length === 0 && <span className="text-muted">Elige al menos un jugador.</span>}
        {filas.map((f) => {
          const despues = f.valor + delta;
          const noLlega = despues < 0;
          return (
            <div key={f.id} className="flex justify-between gap-2">
              <span>{f.nombre}</span>
              <span className={`font-mono tabular-nums ${noLlega ? "text-danger" : ""}`}>
                {formatoNumero(f.valor)} → <b>{formatoNumero(despues)}</b>
                {noLlega && " · no llega"}
              </span>
            </div>
          );
        })}
      </div>

      {!plan.ok && (
        <p role="alert" className="border border-danger px-3 py-2 text-sm text-danger">
          {plan.error} Baja la cantidad o quita a quien no llega.
        </p>
      )}
      {error && (
        <p role="alert" className="border border-danger px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <Boton variante="primario" onClick={enviar} disabled={!puede}>
        {pendiente
          ? "Guardando…"
          : `${modo === "dar" ? "Dar" : "Quitar"} ${formatoNumero(cantidad)} ${c.unidad}${objetivos.length > 1 ? ` a ${objetivos.length}` : ""}`}
      </Boton>
    </section>
  );
}
