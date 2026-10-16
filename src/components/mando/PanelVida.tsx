"use client";

import { useState, useTransition } from "react";
import {
  deltaDeModo,
  listaLegible,
  nombreDeObjetivo,
  previaAjusteVida,
  textoAjusteVida,
  textoUmbral,
  type ModoVida,
  type RecursoVital,
} from "@/lib/rules";
import { Boton, Fila, Opcion, Segmentado, Stepper } from "./controles";
import type { AccionesMando, AvisoMando, ObjetivoMando } from "./tipos";

const MAX_CANTIDAD = 999;
const RAPIDOS = [1, 2, 3, 5];

// Pestaña Vida del panel de mando: daño o curación de vida o fatiga a los objetivos.
// El signo lo pone el modo, nunca se teclea; las tres categorías de daño restan igual
// (docs/sistema.md §7), así que solo hay una cantidad. Antes de aplicar, la vista
// previa por objetivo con el umbral que cruza. El recurso lo lleva quien lo monta: el
// atajo de las barras de la cola lo elige desde fuera.
export function PanelVida({
  objetivos,
  acciones,
  onAviso,
  recurso,
  onRecurso,
  onAplicado,
}: {
  objetivos: ObjetivoMando[];
  acciones: AccionesMando;
  onAviso: (a: Omit<AvisoMando, "id">) => void;
  recurso: RecursoVital;
  onRecurso: (r: RecursoVital) => void;
  onAplicado?: () => void;
}) {
  const [modo, setModo] = useState<ModoVida>("danio");
  const [cantidad, setCantidad] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();

  const delta = deltaDeModo(modo, cantidad);
  const filas = objetivos.map((o) => ({
    o,
    nombre: nombreDeObjetivo({ nombre: o.nombre, npc: o.tipo === "npc" }),
    previa: previaAjusteVida(o[recurso], recurso, delta),
  }));
  const cambian = filas.filter((f) => f.previa.despues !== f.previa.antes);
  const puede = objetivos.length > 0 && cambian.length > 0 && !pendiente;

  const que = recurso === "vida" ? "vida" : "fatiga";
  const quien = objetivos.length > 3 ? `${objetivos.length} objetivos` : listaLegible(filas.map((f) => f.nombre));
  const textoBoton =
    objetivos.length === 0
      ? "Elige a quién"
      : pendiente
        ? "Aplicando…"
        : `${modo === "danio" ? "Quitar" : "Curar"} ${cantidad} de ${que} a ${quien}`;

  const aplicar = () => {
    if (!puede) return;
    setError(null);
    startTransition(async () => {
      const r = await acciones.ajustarVida(recurso, objetivos.map((o) => o.id), delta);
      if (!r.ok) return setError(r.error);
      onAplicado?.();
      onAviso({
        mensaje: textoAjusteVida(recurso, delta, cambian.map((f) => ({ nombre: f.o.nombre, npc: f.o.tipo === "npc" }))),
        registroId: r.registroId,
        tono: "ok",
      });
    });
  };

  return (
    <div className="grid content-start gap-4">
      <Segmentado
        etiqueta="Daño o curación"
        ancho
        valor={modo}
        onCambio={(m) => {
          setModo(m);
          setError(null);
        }}
        opciones={[
          { valor: "danio", label: "Daño", tonoElegido: "bg-danger text-night" },
          { valor: "curacion", label: "Curación", tonoElegido: "bg-neon-green text-night" },
        ]}
      />
      <Segmentado
        etiqueta="Vida o fatiga"
        ancho
        valor={recurso}
        onCambio={(r) => {
          onRecurso(r);
          setError(null);
        }}
        opciones={[
          { valor: "vida", label: "Vida" },
          { valor: "fatiga", label: "Fatiga", tonoElegido: "bg-info text-night" },
        ]}
      />

      <Fila etiqueta="Cantidad">
        <Stepper valor={cantidad} onCambio={setCantidad} min={1} max={MAX_CANTIDAD} etiqueta="Cantidad" grande />
        {RAPIDOS.map((n) => (
          <Opcion key={n} elegida={cantidad === n} onClick={() => setCantidad(n)} className="w-11 px-0">
            {n}
          </Opcion>
        ))}
      </Fila>

      <div className="grid gap-1.5 border border-border bg-surface p-3" aria-live="polite">
        <span className="font-mono text-xs uppercase tracking-widest text-muted">Antes de aplicar</span>
        {filas.length === 0 && <span className="text-muted">Elige al menos a uno.</span>}
        {filas.map(({ o, nombre, previa: p }) => {
          const empeora = p.despues < p.antes;
          return (
            <div key={o.id} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <span className="min-w-0 truncate font-semibold">{nombre}</span>
              <span className="font-mono tabular-nums">
                {p.antes}/{p.max} → <b className={empeora ? "text-danger" : p.despues > p.antes ? "text-neon-green" : ""}>
                  {p.despues}/{p.max}
                </b>
                {p.despues === p.antes && <span className="text-muted"> · sin cambio</span>}
                {p.cambiaUmbral && (
                  <span className={empeora ? "text-neon-orange" : "text-neon-green"}> · {textoUmbral(p.umbralDespues)}</span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="border border-danger px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      {objetivos.length > 0 && cambian.length === 0 && (
        <p className="text-sm text-muted">
          {modo === "danio" ? "Ya están a 0: no cambia nada." : "Ya están al máximo: no cambia nada."}
        </p>
      )}

      <Boton variante="primario" onClick={aplicar} disabled={!puede} className="min-h-13 w-full text-lg">
        {textoBoton}
      </Boton>
    </div>
  );
}
