"use client";

import { useState, useTransition } from "react";
import {
  ESTADOS,
  MAX_RONDAS_ESTADO,
  estadoPorId,
  etiquetaDuracion,
  listaLegible,
  nombreCorto,
  type DuracionEstado,
  type Estado,
} from "@/lib/rules";
import { Boton, FOCO, Fila, Opcion, Stepper } from "./controles";
import { HojaInferior } from "./HojaInferior";
import { BarraObjetivo } from "./BarraObjetivo";
import type { AccionesMando, AvisoMando, ObjetivoMando } from "./tipos";

type TipoDuracion = DuracionEstado["tipo"];

// Sin tildes ni mayúsculas: "paralisis" encuentra Parálisis.
const normalizar = (t: string) => t.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

// El grado que se propone al elegir un estado: Fracaso si lo tiene (el resultado más
// habitual de una salvación fallida), si no el primero.
const gradoInicial = (e: Estado) => (e.grados.some((g) => g.id === "fracaso") ? "fracaso" : e.grados[0].id);

// Pestaña Estados del panel de mando: buscador, rejilla del catálogo y la configuración
// del elegido (grado, duración, efecto). En escritorio la configuración va debajo de la
// rejilla; en móvil, tocar un estado abre la hoja inferior (CSS: los dos montados,
// cada uno escondido en su breakpoint). `enLinea`: la configuración siempre debajo y
// nunca la hoja propia, para cuando el panel ya va dentro de una (combate en móvil, E1d).
export function PanelEstados({
  objetivos,
  acciones,
  onAviso,
  onQuitarObjetivo,
  enLinea = false,
  onAplicado,
}: {
  objetivos: ObjetivoMando[];
  acciones: AccionesMando;
  onAviso: (a: Omit<AvisoMando, "id">) => void;
  onQuitarObjetivo: (id: string) => void;
  enLinea?: boolean;
  onAplicado?: () => void;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [estadoId, setEstadoId] = useState<string | null>(null);
  const [gradoId, setGradoId] = useState<string | null>(null);
  const [tipoDuracion, setTipoDuracion] = useState<TipoDuracion>("rondas");
  const [rondas, setRondas] = useState(1);
  const [hoja, setHoja] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();

  const q = normalizar(busqueda.trim());
  const lista = ESTADOS.filter((e) => !q || normalizar(e.label).includes(q));
  const estado = estadoId ? estadoPorId(estadoId) : null;
  const grado = estado?.grados.find((g) => g.id === gradoId) ?? estado?.grados[0] ?? null;

  const elegirEstado = (e: Estado) => {
    setEstadoId(e.id);
    const g = gradoInicial(e);
    setGradoId(g);
    proponerDuracion(e, g);
    setError(null);
    if (!enLinea) setHoja(true);
  };
  // Si el documento da una duración por defecto para el grado, se propone en rondas.
  const proponerDuracion = (e: Estado, g: string) => {
    const turnos = e.grados.find((x) => x.id === g)?.duracionTurnos ?? null;
    if (turnos !== null) {
      setTipoDuracion("rondas");
      setRondas(Math.max(1, turnos));
    }
  };

  const duracion: DuracionEstado =
    tipoDuracion === "rondas" ? { tipo: "rondas", rondas } : tipoDuracion === "escena" ? { tipo: "escena" } : { tipo: "hastaQuitarlo" };
  const nombres = listaLegible(objetivos.map((o) => nombreCorto(o.nombre)));
  // TODO(revisar): "Quitar" no sale en la maqueta de la Mesa; sin él, un estado "hasta
  // quitarlo" solo se podría quitar desde la consola de combate.
  const conEste = estado ? objetivos.filter((o) => o.estados.some((e) => e.estadoId === estado.id)) : [];

  const aplicar = () => {
    if (!estado || !grado || objetivos.length === 0) return;
    setError(null);
    startTransition(async () => {
      const r = await acciones.aplicarEstado(
        objetivos.map((o) => o.id),
        { estadoId: estado.id, gradoId: grado.id, duracion },
      );
      if (!r.ok) return setError(r.error);
      setHoja(false);
      onAplicado?.();
      onAviso({ mensaje: `${estado.label} a ${nombres}`, registroId: r.registroId, tono: "ok" });
    });
  };
  const quitar = () => {
    if (!estado || conEste.length === 0) return;
    setError(null);
    startTransition(async () => {
      const r = await acciones.quitarEstado(conEste.map((o) => o.id), estado.id);
      if (!r.ok) return setError(r.error);
      setHoja(false);
      onAplicado?.();
      const quien = listaLegible(conEste.map((o) => nombreCorto(o.nombre)));
      onAviso({ mensaje: `Quitado ${estado.label} a ${quien}`, registroId: r.registroId, tono: "ok" });
    });
  };

  const textoAplicar = estado
    ? `Aplicar ${estado.label}${objetivos.length > 1 ? ` a ${objetivos.length}` : ""}`
    : "Aplicar";

  const configuracion = estado && grado && (
    <>
      {estado.grados.length > 1 && (
        <Fila etiqueta="Grado">
          {estado.grados.map((g) => (
            <Opcion
              key={g.id}
              elegida={g.id === grado.id}
              alerta={g.id === "fracaso_critico"}
              onClick={() => {
                setGradoId(g.id);
                proponerDuracion(estado, g.id);
              }}
            >
              {g.label}
            </Opcion>
          ))}
        </Fila>
      )}
      <Fila etiqueta="Duración">
        <Opcion elegida={tipoDuracion === "rondas"} onClick={() => setTipoDuracion("rondas")}>
          Rondas
        </Opcion>
        <Opcion elegida={tipoDuracion === "escena"} onClick={() => setTipoDuracion("escena")}>
          Fin de escena
        </Opcion>
        <Opcion elegida={tipoDuracion === "hastaQuitarlo"} onClick={() => setTipoDuracion("hastaQuitarlo")}>
          Hasta quitarlo
        </Opcion>
        {tipoDuracion === "rondas" && (
          <Stepper valor={rondas} onCambio={setRondas} min={1} max={MAX_RONDAS_ESTADO} etiqueta="Rondas" />
        )}
      </Fila>
      <div className="grid gap-1 border-l-2 border-accent py-1 pl-3">
        <span className="font-mono text-xs uppercase tracking-widest text-muted">
          {estado.grados.length > 1 ? grado.label : "Efecto"} · {etiquetaDuracion(duracion)}
        </span>
        {(grado.detalle.length > 0 ? grado.detalle : [estado.resumen]).map((d) => (
          <p key={d} className="text-[0.95rem] leading-snug">
            {d}
          </p>
        ))}
      </div>
      {error && (
        <p role="alert" className="border border-danger px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
    </>
  );

  return (
    <div className="grid gap-4">
      <label className="flex items-center gap-2 border border-border bg-surface px-3 focus-within:border-info">
        <span aria-hidden="true" className="text-muted">
          ⌕
        </span>
        <span className="sr-only">Buscar estado</span>
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar estado"
          autoComplete="off"
          className="min-h-11 w-full bg-transparent outline-none placeholder:text-muted"
        />
      </label>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[repeat(auto-fill,minmax(150px,1fr))]">
        {lista.map((e) => (
          <button
            key={e.id}
            type="button"
            aria-pressed={e.id === estadoId}
            onClick={() => elegirEstado(e)}
            className={`grid min-h-20 content-start gap-1 border p-2.5 text-left transition ${
              e.id === estadoId ? "border-accent bg-accent/5" : "border-border bg-surface hover:border-muted"
            } ${FOCO}`}
          >
            <b className="font-display text-[0.98rem] leading-tight">{e.label}</b>
            <span className="line-clamp-2 text-sm leading-snug text-muted">{e.resumen}</span>
          </button>
        ))}
        {lista.length === 0 && <p className="col-span-full text-muted">Ningún estado se llama así.</p>}
      </div>

      {/* Escritorio (o `enLinea`): configuración debajo de la rejilla. */}
      <div className={enLinea ? "" : "hidden lg:block"}>
        {configuracion ? (
          <div className="grid gap-4 border border-border bg-surface p-4">
            {configuracion}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm text-muted">
                {objetivos.length > 0 ? (
                  <>
                    A <b className="text-foreground">{nombres}</b>
                  </>
                ) : (
                  `Sin objetivo: elige a quién en la ${enLinea ? "cola" : "lista"}.`
                )}
              </span>
              <div className="flex flex-wrap gap-2">
                {conEste.length > 0 && (
                  <Boton variante="aviso" onClick={quitar} disabled={pendiente}>
                    Quitar a {listaLegible(conEste.map((o) => nombreCorto(o.nombre)))}
                  </Boton>
                )}
                <Boton variante="primario" onClick={aplicar} disabled={objetivos.length === 0 || pendiente}>
                  {pendiente ? "Aplicando…" : textoAplicar}
                </Boton>
              </div>
            </div>
          </div>
        ) : (
          <p className="border border-dashed border-border px-3 py-4 text-muted">Elige un estado de la lista.</p>
        )}
      </div>

      {/* Móvil: hoja inferior. */}
      {hoja && estado && (
        <HojaInferior
          titulo={estado.label}
          onCerrar={() => setHoja(false)}
          className="lg:hidden"
          pie={
            <div className="grid gap-2">
              {conEste.length > 0 && (
                <Boton variante="aviso" onClick={quitar} disabled={pendiente} className="w-full">
                  Quitar {estado.label} a {listaLegible(conEste.map((o) => nombreCorto(o.nombre)))}
                </Boton>
              )}
              <Boton
                variante="primario"
                onClick={aplicar}
                disabled={objetivos.length === 0 || pendiente}
                className="min-h-13 w-full text-lg"
              >
                {objetivos.length === 0 ? "Elige a quién arriba" : pendiente ? "Aplicando…" : textoAplicar}
              </Boton>
            </div>
          }
        >
          <BarraObjetivo objetivos={objetivos} onQuitar={onQuitarObjetivo} vacio="Elige a quién en la tira de arriba." />
          {configuracion}
        </HojaInferior>
      )}
    </div>
  );
}
