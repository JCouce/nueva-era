"use client";

import { useState } from "react";
import { resumenRasgos, type ChipAtributo, type Especie, type EtiquetaRasgo, type RasgoEtiquetado } from "@/lib/rules";
import { BotonManual } from "@/components/manual/BotonManual";
import { ArteEspecie } from "./arteEspecies";

const ETIQUETA: Record<EtiquetaRasgo, { texto: string; clase: string }> = {
  creacion: { texto: "Creación", clase: "border-accent text-accent" },
  siempre: { texto: "Siempre", clase: "border-info text-info" },
  tirada: { texto: "Tirada", clase: "border-neon-magenta text-neon-magenta" },
  texto: { texto: "Texto", clase: "border-border text-muted" },
};

export function ChipsAtributos({ chips, vacio }: { chips: ChipAtributo[]; vacio: string }) {
  if (!chips.length) return <p className="font-mono text-[11px] uppercase tracking-wide text-muted">{vacio}</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((c) => (
        <span
          key={c.id}
          className={`clip-chamfer-sm border px-2 py-1 font-mono text-[11px] uppercase ${
            c.valor >= 0 ? "border-neon-green text-neon-green" : "border-danger text-danger"
          }`}
        >
          {c.label} {c.valor > 0 ? `+${c.valor}` : c.valor}
        </span>
      ))}
    </div>
  );
}

export function ListaRasgos({ rasgos }: { rasgos: RasgoEtiquetado[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {rasgos.map((r) => (
        <li key={r.id} className="font-sans text-prosa text-soft">
          <span
            className={`mr-1.5 inline-block border px-1 align-[1px] font-mono text-[10px] uppercase tracking-wider ${ETIQUETA[r.etiqueta].clase}`}
          >
            {ETIQUETA[r.etiqueta].texto}
          </span>
          <span className="font-semibold text-foreground">{r.label}.</span> {r.texto}
        </li>
      ))}
    </ul>
  );
}

// Los 3 primeros rasgos (sin contar los atributos) en orden del catálogo; el resto,
// desplegable.
const VISIBLES = 3;

export function TarjetaEspecie({
  especie,
  esTuya,
  seleccionada,
  onElegir,
  aviso,
  pie,
}: {
  especie: Especie;
  // La guardada en la ficha: sello "Tu especie".
  esTuya: boolean;
  // La del borrador (puede no estar guardada aún: Manduk sin casta).
  seleccionada: boolean;
  // Ausente: sin botón (ficha aprobada, solo lectura).
  onElegir?: () => void;
  aviso: boolean;
  pie?: string;
}) {
  const [abierta, setAbierta] = useState(false);
  const { atributos, rasgos } = resumenRasgos(especie.rasgos);
  const ocultos = rasgos.length - VISIBLES;
  // Toda la tarjeta elige: en móvil es más alta que la pantalla y la barra de envío
  // fija tapaba el botón de abajo.
  const elegir = onElegir && !seleccionada ? onElegir : undefined;

  return (
    <article
      role={elegir ? "button" : undefined}
      tabIndex={elegir ? 0 : undefined}
      aria-label={elegir ? `Elegir ${especie.label}` : undefined}
      onClick={elegir}
      onKeyDown={
        elegir &&
        ((e) => {
          if (e.target !== e.currentTarget || (e.key !== "Enter" && e.key !== " ")) return;
          e.preventDefault();
          elegir();
        })
      }
      className={`clip-chamfer flex h-full flex-col border bg-surface ${
        seleccionada ? "!border-accent shadow-glow-yellow" : "border-border"
      } ${elegir ? "cursor-pointer active:scale-[0.99]" : ""}`}
    >
      <div className="relative">
        <ArteEspecie especieId={especie.id} className="aspect-[4/3] w-full" />
        {esTuya && (
          <span className="clip-chamfer-sm absolute right-2 top-2 bg-accent px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-black">
            Tu especie
          </span>
        )}
        <div className="absolute bottom-2 left-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-foreground/70">
            {"// especie"}
            {especie.castas ? " · castas" : ""}
          </p>
          <h3 className="font-display text-3xl font-bold uppercase leading-none tracking-wide text-foreground drop-shadow">
            {especie.label}
          </h3>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <p className="font-sans text-prosa text-soft">{especie.descripcion}</p>
        <BotonManual tipo="especie" id={especie.id} className="self-start" />
        <ChipsAtributos chips={atributos} vacio={especie.castas ? "según casta y casa" : especie.atributoLibre ? `+${especie.atributoLibre} a un atributo a elegir` : "sin modificadores"} />
        {rasgos.length > 0 && (
          <div className="flex flex-col gap-2">
            <ListaRasgos rasgos={abierta ? rasgos : rasgos.slice(0, VISIBLES)} />
            {ocultos > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setAbierta((v) => !v);
                }}
                className="self-start py-1 font-mono text-[11px] uppercase tracking-wide text-info"
              >
                {abierta ? "− ver menos" : `+ ver ${ocultos} rasgo${ocultos === 1 ? "" : "s"} más`}
              </button>
            )}
          </div>
        )}

        <div className="mt-auto flex flex-col gap-2 pt-1">
          {onElegir &&
            (seleccionada ? (
              <button
                type="button"
                disabled
                className="clip-chamfer-sm w-full border border-border py-3 font-display text-sm font-semibold uppercase tracking-wide text-muted"
              >
                ✓ Elegida
              </button>
            ) : (
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.stopPropagation();
                  onElegir();
                }}
                className="clip-chamfer-sm w-full border border-accent bg-accent py-3 font-display text-sm font-semibold uppercase tracking-wide text-black active:scale-[0.98]"
              >
                Elegir {especie.label}
              </button>
            ))}
          {onElegir && aviso && !seleccionada && (
            <p className="font-mono text-[10px] leading-relaxed text-neon-orange">
              ⚠ Elegir otra especie resetea la ficha (todo salvo Personaje).
            </p>
          )}
          {pie && <p className="font-mono text-[10px] leading-relaxed text-muted">{pie}</p>}
        </div>
      </div>
    </article>
  );
}
