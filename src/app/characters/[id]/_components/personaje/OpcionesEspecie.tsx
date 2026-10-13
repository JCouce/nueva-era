"use client";

import { resumenRasgos, type Especie, type OpcionEspecie } from "@/lib/rules";
import { HudCard } from "@/components/HudCard";
import { colorDeOpcion } from "./arteEspecies";
import { ListaRasgos } from "./TarjetaEspecie";

function MiniOpcion({
  opcion,
  activa,
  onClick,
}: {
  opcion: OpcionEspecie;
  activa: boolean;
  onClick?: () => void;
}) {
  const { atributos, rasgos } = resumenRasgos(opcion.rasgos);
  return (
    <button
      type="button"
      disabled={!onClick}
      onClick={onClick}
      className={`clip-chamfer-sm flex min-h-[84px] items-stretch gap-2 border bg-night p-2 text-left active:scale-[0.98] disabled:active:scale-100 ${
        activa ? "!border-accent shadow-glow-yellow" : "border-border"
      }`}
    >
      <span className="w-1 shrink-0" style={{ background: colorDeOpcion(opcion.id) }} />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="font-display text-sm font-semibold uppercase tracking-wide text-foreground">{opcion.label}</span>
        <span className="font-mono text-[10px] uppercase leading-tight">
          {atributos.length
            ? atributos.map((a, i) => (
                <span key={a.id} className={a.valor >= 0 ? "text-neon-green" : "text-danger"}>
                  {i > 0 && <span className="text-muted"> · </span>}
                  {a.abbr} {a.valor > 0 ? `+${a.valor}` : a.valor}
                </span>
              ))
            : <span className="text-muted">sin modificadores</span>}
        </span>
        {rasgos.length > 0 && (
          <span className="font-sans text-[11px] leading-tight text-muted">{rasgos.map((r) => r.label).join(" · ")}</span>
        )}
      </span>
    </button>
  );
}

function Caja({
  titulo,
  opciones,
  elegida,
  onElegir,
}: {
  titulo: string;
  opciones: OpcionEspecie[];
  elegida: string | null;
  onElegir?: (id: string) => void;
}) {
  const detalle = opciones.find((o) => o.id === elegida);
  return (
    <HudCard className="flex flex-col gap-3 p-4">
      <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
        {"//SYSTEM · "}
        {titulo}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {opciones.map((o) => (
          <MiniOpcion
            key={o.id}
            opcion={o}
            activa={o.id === elegida}
            onClick={onElegir ? () => onElegir(o.id) : undefined}
          />
        ))}
      </div>
      {detalle && (
        <div className="border-t border-border pt-3">
          <ListaRasgos rasgos={resumenRasgos(detalle.rasgos).rasgos} />
        </div>
      )}
    </HudCard>
  );
}

// Casta y, si es Noble, Casa (linaje) de una especie con castas (Manduk). Sin
// `onCasta`/`onLinaje` es solo lectura y enseña únicamente lo elegido.
export function OpcionesEspecie({
  especie,
  casta,
  linaje,
  onCasta,
  onLinaje,
  aviso,
  falta,
}: {
  especie: Especie;
  casta: string | null;
  linaje: string | null;
  onCasta?: (id: string) => void;
  onLinaje?: (id: string) => void;
  aviso: boolean;
  falta: string | null;
}) {
  if (!especie.castas) return null;
  const soloLectura = !onCasta;
  const filtrar = (opciones: OpcionEspecie[], id: string | null) =>
    soloLectura ? opciones.filter((o) => o.id === id) : opciones;
  const linajes = especie.linajes && especie.linajes.casta === casta ? especie.linajes.opciones : null;

  return (
    <div className="flex flex-col gap-3">
      <Caja titulo="Casta" opciones={filtrar(especie.castas, casta)} elegida={casta} onElegir={onCasta} />
      {linajes && <Caja titulo="Casa" opciones={filtrar(linajes, linaje)} elegida={linaje} onElegir={onLinaje} />}
      {!soloLectura && falta && <p className="font-mono text-[11px] leading-relaxed text-accent">{falta}</p>}
      {!soloLectura && aviso && (
        <p className="font-mono text-[10px] leading-relaxed text-neon-orange">
          ⚠ Cambiar de casta o casa resetea la ficha (todo salvo Personaje).
        </p>
      )}
    </div>
  );
}
