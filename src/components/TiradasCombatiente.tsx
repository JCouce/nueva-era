"use client";

// Las tiradas de cada combatiente en la cola (rules/tiradasCombate.ts), igual en la consola del
// máster y en la ficha del jugador (CombateTab): en la fila, las de
// la ronda actual en dos bloques (Tiradas y Esquivas); «Ver más» abre el historial de este
// combate por ronda (R3, R2, R1…), pedido al servidor al abrirlo.
import { useEffect, useState } from "react";
import {
  agruparTiradasPorRonda,
  textoContra,
  textoVeredicto,
  type RondaDeTiradas,
  type TiradaCombate,
  type VeredictoTirada,
} from "@/lib/rules";
import { Modal } from "@/components/Modal";
import { FOCO } from "@/components/mando/controles";
import { historialTiradasAction } from "@/app/master/combate/actions";

// Mismo idioma que el historial de la ficha (tonoResultado, AccionesTab): acento = crítico,
// cian = éxito, peligro = fracaso crítico, apagado = fracaso.
const TONO: Record<VeredictoTirada, string> = {
  critico: "text-accent",
  exito: "text-info",
  fracasoCritico: "text-danger",
  fracaso: "text-muted",
  sinDificultad: "text-foreground",
};

function LineaTirada({ t }: { t: TiradaCombate }) {
  const contra = textoContra(t);
  return (
    <li className="flex items-baseline gap-2 py-1 font-mono text-[11px] leading-tight">
      <span className="min-w-0 flex-1 truncate text-soft" title={t.etiqueta}>
        {t.etiqueta}
      </span>
      <span className="shrink-0 tabular-nums">
        <b className="text-foreground">{t.total}</b>
        {contra && <span className="text-muted"> {contra}</span>}
        <span className={TONO[t.veredicto]}> · {textoVeredicto(t.veredicto)}</span>
        {t.danio && (
          <span className="text-danger">
            {" "}
            · {t.danio.total} {t.danio.categoria.toLowerCase()}
          </span>
        )}
      </span>
    </li>
  );
}

function Bloque({ titulo, tiradas }: { titulo: string; tiradas: TiradaCombate[] }) {
  if (tiradas.length === 0) return null;
  return (
    <div className="min-w-0">
      <p className="font-mono text-[0.62rem] uppercase tracking-widest text-muted">{titulo}</p>
      <ul className="divide-y divide-border">
        {tiradas.map((t) => (
          <LineaTirada key={t.id} t={t} />
        ))}
      </ul>
    </div>
  );
}

function DosBloques({ ronda }: { ronda: RondaDeTiradas }) {
  return (
    <div className="grid gap-1.5">
      <Bloque titulo="Tiradas" tiradas={ronda.acciones} />
      <Bloque titulo="Esquivas" tiradas={ronda.esquivas} />
    </div>
  );
}

const vacia = (r: RondaDeTiradas) => r.acciones.length + r.esquivas.length === 0;

// En la fila de la cola. Sin nada que enseñar (ni de esta ronda ni de antes), no ocupa sitio.
export function BloquesTiradas({
  ronda,
  hayAnteriores,
  onVerMas,
}: {
  ronda: RondaDeTiradas;
  hayAnteriores: boolean;
  onVerMas: () => void;
}) {
  if (vacia(ronda) && !hayAnteriores) return null;
  return (
    <div className="grid gap-1 border-t border-border px-2.5 py-2">
      {vacia(ronda) ? (
        <p className="font-mono text-[11px] text-muted">Sin tiradas en la ronda {ronda.ronda}.</p>
      ) : (
        <DosBloques ronda={ronda} />
      )}
      <button
        type="button"
        onClick={onVerMas}
        className={`min-h-9 self-start font-mono text-xs uppercase tracking-wide text-info hover:underline ${FOCO}`}
      >
        Ver más
      </button>
    </div>
  );
}

// El historial entero de esta fila en el combate. La ronda actual sale de la fila (viva con el
// polling); las anteriores, del servidor, que se vuelven a pedir al cambiar de ronda.
export function HistorialTiradasModal({
  combatienteId,
  nombre,
  rondaActual,
  actual,
  onCerrar,
}: {
  combatienteId: string;
  nombre: string;
  rondaActual: number;
  actual: RondaDeTiradas;
  onCerrar: () => void;
}) {
  const [guardadas, setGuardadas] = useState<TiradaCombate[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    historialTiradasAction(combatienteId)
      .then((r) => {
        if (!vivo) return;
        if (r.ok) {
          setGuardadas(r.tiradas);
          setError(null);
        } else setError(r.error);
      })
      .catch(() => {
        if (vivo) setError("Sin conexión.");
      });
    return () => {
      vivo = false;
    };
  }, [combatienteId, rondaActual]);

  const anteriores = agruparTiradasPorRonda((guardadas ?? []).filter((t) => t.ronda !== rondaActual));
  const rondas = vacia(actual) ? anteriores : [actual, ...anteriores];

  return (
    <Modal titulo={`Tiradas de ${nombre}`} onCerrar={onCerrar}>
      {error && <p className="mb-2 font-mono text-xs text-danger">{error}</p>}
      {rondas.length === 0 ? (
        <p className="py-4 text-center font-mono text-sm text-muted">
          {guardadas === null && !error ? "Cargando…" : "Todavía no ha tirado nada en este combate."}
        </p>
      ) : (
        <div className="grid gap-3">
          {rondas.map((r) => (
            <section key={r.ronda} aria-label={`Ronda ${r.ronda}`} className="border border-border bg-night px-3 py-2">
              <h3 className="mb-1 font-display text-sm font-bold uppercase tracking-widest">
                R{r.ronda}
                {r.ronda === rondaActual && <span className="font-mono text-[0.62rem] font-normal text-accent"> · actual</span>}
              </h3>
              <DosBloques ronda={r} />
            </section>
          ))}
          {guardadas === null && !error && <p className="font-mono text-xs text-muted">Cargando rondas anteriores…</p>}
        </div>
      )}
    </Modal>
  );
}
