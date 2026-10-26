"use client";

import {
  describirEstadosActivos,
  notasDeEstado,
  pesoEquipado,
  textoInmunidad,
  type DuracionEstado,
  type FichaResuelta,
} from "@/lib/rules";
import { HudCard } from "@/components/HudCard";
import { ChipEstado } from "@/components/ChipEstado";

// Estados y datos de la pestaña Recursos: lo que pone el máster y lo derivado que se
// consulta en mesa (alerta, carga, movimiento). Solo lectura.
function Dato({
  label,
  valor,
  unidad,
  tono = "text-foreground",
  nota,
}: {
  label: string;
  valor: number;
  unidad?: string;
  tono?: string;
  // De dónde sale que no sea el general, p.ej. "+4 exoesqueleto" o "fórmula · Arköru":
  // mismo tono que el valor.
  nota?: string;
}) {
  return (
    <div className="clip-chamfer-sm flex flex-col gap-0.5 border border-border bg-night px-3 py-2">
      <span className="font-mono text-[10px] uppercase tracking-wide text-muted">{label}</span>
      <span className={`font-mono text-lg tabular-nums leading-tight ${tono}`}>
        {valor}
        {unidad && <span className="text-xs text-muted"> {unidad}</span>}
      </span>
      {nota && <span className={`font-mono text-[10px] ${tono}`}>{nota}</span>}
    </div>
  );
}

function textoDuracion(d: DuracionEstado): string {
  switch (d.tipo) {
    case "rondas":
      return d.rondas === 1 ? "1 ronda" : `${d.rondas} rondas`;
    case "escena":
      return "hasta el fin de la escena";
    case "hastaQuitarlo":
      return "hasta que el máster lo quite";
  }
}

// Los estados que ha puesto el máster: solo lectura, el jugador no se los quita. Con las
// inmunidades de los aumentos (A7) delante: un estado al que es inmune no hace nada.
export function EstadosCard({ ficha }: { ficha: FichaResuelta }) {
  const activos = describirEstadosActivos(ficha.estados, ficha.inmunidades);
  return (
    <HudCard className="mt-2 flex flex-col gap-3 p-4">
      <p className="font-mono text-[11px] uppercase tracking-widest text-muted">{"//SYSTEM · estados"}</p>
      {ficha.inmunidades.length > 0 && (
        <p className="font-mono text-xs text-info">
          Inmune a: {ficha.inmunidades.map(textoInmunidad).join(" · ")}
        </p>
      )}
      {activos.length === 0 ? (
        <p className="font-mono text-xs text-muted">Sin estados activos.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {activos.map((a) => (
            <li key={a.estadoId} className="flex flex-col gap-1 border-l-2 border-glitch py-1 pl-3">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <ChipEstado estado={a} />
                {/* Los activables (A5a) ya llevan la duración larga en el chip. */}
                {!a.duracionActivable && (
                  <span className="font-mono text-[10px] uppercase tracking-wide text-muted">{textoDuracion(a.duracion)}</span>
                )}
              </div>
              {a.inmune ? (
                <p className="font-mono text-[11px] leading-relaxed text-info">
                  No te hace nada: eres inmune ({a.inmune}). El máster lo quitará.
                </p>
              ) : (
                a.detalle.length > 0 && (
                  <p className="font-mono text-[11px] leading-relaxed text-foreground">{a.detalle.join(" ")}</p>
                )
              )}
            </li>
          ))}
        </ul>
      )}
    </HudCard>
  );
}

// Lo derivado: nada de esto se edita, todo sale de atributos, habilidades y equipo.
export function DatosCard({ ficha }: { ficha: FichaResuelta }) {
  const sheet = ficha.ficha;
  const mov = ficha.movimiento;
  const vue = ficha.vuelo;
  const lev = ficha.levitacion;
  const notas = notasDeEstado(ficha);
  const tono = (nota: string | undefined) => (nota ? "text-info" : "text-foreground");
  const limiteCarga = ficha.cargaMaxima;
  const pesoArmas = pesoEquipado(sheet);

  return (
    <HudCard className="mt-2 flex flex-col gap-3 p-4">
      <p className="font-mono text-[11px] uppercase tracking-widest text-muted">{"//SYSTEM · datos"}</p>
      <div className="grid grid-cols-2 gap-2">
        <Dato label="Alerta" valor={ficha.alerta} tono="text-accent" nota={notas.alerta} />
        {/* Carga transportable (sistema.md §5.5): solo el dato, sin penalizadores todavía. */}
        <Dato
          label="Carga (armas)"
          valor={pesoArmas}
          unidad={`/ ${limiteCarga} kg`}
          tono={pesoArmas > limiteCarga ? "text-danger" : tono(notas.carga)}
          nota={notas.carga}
        />
        <Dato label="Carrera" valor={mov.carrera} unidad="m" tono={tono(notas.carrera)} nota={notas.carrera} />
        <Dato label="Salto vertical" valor={mov.saltoVertical} unidad="cm" tono={tono(notas.saltoVertical)} nota={notas.saltoVertical} />
        <Dato label="Salto horizontal" valor={mov.saltoHorizontal} unidad="cm" tono={tono(notas.saltoHorizontal)} nota={notas.saltoHorizontal} />
        <Dato label="Escalada" valor={mov.escalada} unidad="m" tono={tono(notas.escalada)} nota={notas.escalada} />
        <Dato label="Nado" valor={mov.nado} unidad="m" tono={tono(notas.nado)} nota={notas.nado} />
        {vue && <Dato label={`Vuelo (mov. aérea ${vue.nivel})`} valor={vue.velocidadM} unidad="m" tono="text-info" nota={notas.vuelo} />}
        {lev && <Dato label={`Levitar (Traslación ${lev.nivel})`} valor={lev.velocidadM} unidad="m" tono="text-info" nota={notas.levitacion} />}
      </div>
      <p className="font-mono text-[10px] leading-relaxed text-muted">
        Carga: peso equipado frente al límite sin penalizador. Armaduras y módulos no traen peso en el
        documento — este número cuenta solo las armas equipadas.
      </p>
    </HudCard>
  );
}
