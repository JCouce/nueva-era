"use client";

import { useEffect, useRef, useState } from "react";
import {
  ESPECIES,
  especiePorId,
  bloqueoDeEspecie,
  hayQueAvisar,
  eleccionDeFicha,
  type EleccionEspecie,
  type FichaResuelta,
} from "@/lib/rules";
import { HudCard } from "@/components/HudCard";
import { useEleccionEspecie } from "../useEleccionEspecie";
import { TarjetaEspecie } from "./TarjetaEspecie";
import { OpcionesEspecie } from "./OpcionesEspecie";

// Ficha aprobada y jugador: solo su especie (y casta/casa), sin botón, con el motivo.
function OrigenFijado({ guardada, bloqueo }: { guardada: EleccionEspecie; bloqueo: string }) {
  const especie = especiePorId(guardada.especieId);
  if (!especie) {
    return (
      <HudCard className="p-4">
        <p className="font-mono text-[11px] leading-relaxed text-muted">Sin especie. {bloqueo}.</p>
      </HudCard>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <TarjetaEspecie especie={especie} esTuya seleccionada aviso={false} pie={`${bloqueo}.`} />
      <OpcionesEspecie
        especie={especie}
        casta={guardada.casta ?? null}
        linaje={guardada.linaje ?? null}
        aviso={false}
        falta={null}
      />
    </div>
  );
}

function Carrusel({
  guardada,
  avisar,
  onElegir,
}: {
  guardada: EleccionEspecie;
  avisar: boolean;
  onElegir: (eleccion: EleccionEspecie) => void;
}) {
  const { borrador, falta, onEspecie, onCasta, onLinaje, modal } = useEleccionEspecie({ guardada, avisar, onElegir });
  const pista = useRef<HTMLDivElement>(null);
  const [inicial] = useState(() => Math.max(0, ESPECIES.findIndex((e) => e.id === guardada.especieId)));
  const [activo, setActivo] = useState(inicial);

  const tarjetas = () => Array.from(pista.current?.children ?? []) as HTMLElement[];
  const irA = (i: number) => {
    const t = tarjetas();
    if (!pista.current || !t[i]) return;
    pista.current.scrollTo({ left: t[i].offsetLeft - t[0].offsetLeft, behavior: "smooth" });
  };

  // Al montar, a la tarjeta elegida, sin animación (se remonta con cada elección
  // guardada nueva).
  useEffect(() => {
    const el = pista.current;
    const t = el?.children[inicial] as HTMLElement | undefined;
    if (el && t) el.scrollLeft = t.offsetLeft - (el.children[0] as HTMLElement).offsetLeft;
  }, [inicial]);

  const onScroll = () => {
    const t = tarjetas();
    if (!pista.current || t.length < 2) return;
    const paso = t[1].offsetLeft - t[0].offsetLeft;
    setActivo(Math.min(t.length - 1, Math.max(0, Math.round(pista.current.scrollLeft / paso))));
  };

  const especieBorrador = especiePorId(borrador.especieId);

  return (
    <div className="flex flex-col gap-3">
      <p className="font-mono text-[11px] uppercase tracking-widest text-muted">Elige tu especie · desliza →</p>
      <div
        ref={pista}
        onScroll={onScroll}
        className="-mx-4 grid snap-x snap-mandatory auto-cols-[86%] grid-flow-col gap-3 overflow-x-auto scroll-px-4 px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {ESPECIES.map((e) => (
          <div key={e.id} className="snap-start">
            <TarjetaEspecie
              especie={e}
              esTuya={guardada.especieId === e.id}
              seleccionada={borrador.especieId === e.id}
              onElegir={() => onEspecie(e.id)}
              aviso={avisar}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-1">
        {ESPECIES.map((e, i) => (
          <button key={e.id} type="button" aria-label={e.label} onClick={() => irA(i)} className="p-1.5">
            <span
              className={`block h-1.5 transition-all ${i === activo ? "w-5 bg-accent" : "w-1.5 bg-border"}`}
            />
          </button>
        ))}
      </div>

      {especieBorrador?.castas && (
        <OpcionesEspecie
          especie={especieBorrador}
          casta={borrador.casta ?? null}
          linaje={borrador.linaje ?? null}
          onCasta={onCasta}
          onLinaje={onLinaje}
          aviso={avisar}
          falta={falta}
        />
      )}
      {modal}
    </div>
  );
}

// Origen (sistema.md §14.1-14.3): carrusel de especies y, para Manduk, casta y casa.
// En borrador, elegir aplica el reset en el servidor (onEspecie → setEspecieAction).
export function OrigenPanel({
  ficha,
  aprobada,
  esMaster,
  creditos,
  soloLectura,
  onEspecie,
}: {
  ficha: FichaResuelta;
  aprobada: boolean;
  esMaster: boolean;
  creditos: number;
  // Ficha en revisión (fichaSoloLectura): el fieldset no desactiva el click de las
  // tarjetas, así que el carrusel ni se monta.
  soloLectura: boolean;
  onEspecie: (eleccion: EleccionEspecie) => void;
}) {
  const sheet = ficha.ficha;
  const ctx = { aprobada, esMaster, libre: false };
  const guardada = eleccionDeFicha(sheet);
  const bloqueo = soloLectura ? "La ficha está en revisión" : bloqueoDeEspecie(ctx);
  if (bloqueo) return <OrigenFijado guardada={guardada} bloqueo={bloqueo} />;
  return (
    <Carrusel
      key={`${guardada.especieId}|${guardada.casta}|${guardada.linaje}`}
      guardada={guardada}
      avisar={hayQueAvisar(sheet, creditos, ctx)}
      onElegir={onEspecie}
    />
  );
}
