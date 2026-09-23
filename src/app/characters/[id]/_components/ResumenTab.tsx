import {
  salud,
  alerta,
  movimiento,
  vuelo,
  cargaMaxima,
  pesoEquipado,
  modificadoresActivos,
  especiePorId,
  ESPECIES,
  ATRIBUTOS,
  HABILIDADES,
  ACCIONES,
} from "@/lib/rules";
import type { Sheet, CategoriaPrioridad, LetraPrioridad } from "@/lib/rules";
import { HudCard } from "@/components/HudCard";
import { PrioridadCard } from "./PrioridadCard";

const fieldLabel = "font-mono text-[10px] uppercase tracking-widest text-muted";
const fieldInput =
  "clip-chamfer-sm border border-border bg-night px-3 py-2 font-mono outline-none focus:border-accent";

function Dato({
  label,
  value,
  unidad,
  tono = "text-foreground",
  nota,
}: {
  label: string;
  value: number;
  unidad?: string;
  tono?: string;
  // Paréntesis que explica de dónde sale un extra, p.ej. "+4 exoesqueleto".
  // Se pinta en el mismo tono que el valor: los dos van azules a la vez.
  nota?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-border py-1.5 last:border-0">
      <span className="font-mono text-[11px] uppercase text-muted">{label}</span>
      <span className={`font-mono text-sm tabular-nums ${tono}`}>
        {value}
        {unidad && <span className="text-muted"> {unidad}</span>}
        {nota && ` (${nota})`}
      </span>
    </div>
  );
}

export function ResumenTab({
  name,
  sheet,
  aprobada,
  onName,
  onEdad,
  onAltura,
  onPeso,
  onEspecie,
  onTrasfondo,
  onMotivacion,
  onPrioridad,
}: {
  name: string;
  sheet: Sheet;
  aprobada: boolean;
  onName: (v: string) => void;
  onEdad: (v: number | null) => void;
  onAltura: (v: number | null) => void;
  onPeso: (v: number | null) => void;
  onEspecie: (v: string | null) => void;
  onTrasfondo: (v: string) => void;
  onMotivacion: (v: string) => void;
  onPrioridad: (categoria: CategoriaPrioridad, letra: LetraPrioridad | null) => void;
}) {
  const { vida, fatiga } = salud(sheet);
  const alertaPasiva = alerta(sheet);
  const mov = movimiento(sheet);
  const vue = vuelo(sheet);
  const conExo = mov.bonoExoesqueleto > 0;
  const notaExo = conExo ? `+${mov.bonoExoesqueleto} exoesqueleto` : undefined;
  const limiteCarga = cargaMaxima(sheet);
  const pesoArmas = pesoEquipado(sheet);

  return (
    <div className="flex flex-col gap-4">
      {/* Solo tiene sentido mientras se construye la ficha. Una vez aprobada
          las letras quedan fijadas en los pools ya gastados — enseñar el
          selector solo invitaría a tocar algo que ya no se puede cambiar. */}
      {!aprobada && <PrioridadCard prioridades={sheet.prioridades} onSet={onPrioridad} />}

      {/* Identidad */}
      <HudCard className="p-4">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-muted">
          {"//SYSTEM · identidad"}
        </p>
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className={fieldLabel}>{"// Nombre"}</span>
            <input
              type="text"
              value={name}
              maxLength={80}
              onChange={(e) => onName(e.target.value)}
              className={`${fieldInput} text-lg text-foreground`}
            />
          </label>
          <div className="flex gap-3">
            <label className="flex w-16 flex-col gap-1">
              <span className={fieldLabel}>{"// Edad"}</span>
              <input
                type="number"
                inputMode="numeric"
                value={sheet.edad ?? ""}
                onChange={(e) =>
                  onEdad(e.target.value === "" ? null : Number(e.target.value))
                }
                className={`${fieldInput} text-lg tabular-nums text-foreground`}
              />
            </label>
            <label className="flex w-20 flex-col gap-1">
              <span className={fieldLabel}>{"// Altura (cm)"}</span>
              <input
                type="number"
                inputMode="numeric"
                value={sheet.altura ?? ""}
                onChange={(e) =>
                  onAltura(e.target.value === "" ? null : Number(e.target.value))
                }
                className={`${fieldInput} text-lg tabular-nums text-foreground`}
              />
            </label>
            <label className="flex w-20 flex-col gap-1">
              <span className={fieldLabel}>{"// Peso (kg)"}</span>
              <input
                type="number"
                inputMode="numeric"
                value={sheet.peso ?? ""}
                onChange={(e) =>
                  onPeso(e.target.value === "" ? null : Number(e.target.value))
                }
                className={`${fieldInput} text-lg tabular-nums text-foreground`}
              />
            </label>
            <div className="flex flex-1 flex-col gap-1">
              <span className={fieldLabel}>{"// Especie"}</span>
              <div className="flex flex-wrap gap-1">
                {ESPECIES.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => onEspecie(sheet.especieId === e.id ? null : e.id)}
                    className={`clip-chamfer-sm border px-2 py-2 font-display text-xs font-semibold uppercase tracking-wide active:scale-95 ${
                      sheet.especieId === e.id
                        ? "border-info text-info"
                        : "border-border text-muted"
                    }`}
                  >
                    {e.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <label className="flex flex-col gap-1">
            <span className={fieldLabel}>{"// Motivación"}</span>
            <input
              type="text"
              value={sheet.motivacion}
              maxLength={500}
              placeholder="Qué te mueve"
              onChange={(e) => onMotivacion(e.target.value)}
              className={`${fieldInput} text-sm text-foreground placeholder:text-muted`}
            />
          </label>
        </div>
      </HudCard>

      {/* Qué aporta la especie, con su procedencia a la vista */}
      {(() => {
        const especie = especiePorId(sheet.especieId);
        if (!especie) return null;
        const mods = modificadoresActivos(sheet);
        const etiqueta = (m: (typeof mods)[number]) => {
          if (m.tipo === "atributo")
            return ATRIBUTOS.find((a) => a.id === m.id)!.label;
          if (m.tipo === "habilidad")
            return HABILIDADES.find((h) => h.id === m.id)!.label;
          if (m.tipo === "derivado") return m.id;
          const a = m.alcance;
          if (a.tipo === "tiradaId") return ACCIONES.find((t) => t.id === a.id)?.label ?? a.id;
          if (a.tipo === "grupo") return a.grupo;
          if (a.tipo === "habilidad") return HABILIDADES.find((h) => h.id === a.habilidad)!.label;
          if (a.tipo === "todas") return "Todas las tiradas";
          return `Modo ${a.contieneEtiqueta}`;
        };
        return (
          <HudCard className="p-4">
            <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-muted">
              {"//SYSTEM · "}
              {especie.label}
            </p>
            <p className="font-sans text-sm leading-relaxed text-muted">
              {especie.descripcion}
            </p>
            {mods.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {mods.map((m, i) => (
                  <span
                    key={i}
                    className={`clip-chamfer-sm border px-2 py-1 font-mono text-[10px] uppercase ${
                      m.valor >= 0 ? "border-info text-info" : "border-danger text-danger"
                    }`}
                  >
                    {m.valor >= 0 ? `+${m.valor}` : m.valor} {etiqueta(m)}
                  </span>
                ))}
              </div>
            )}
            {especie.provisional && (
              <p className="mt-3 border-t border-border pt-2 font-mono text-[10px] leading-relaxed text-danger">
                Especie provisional: el diseñador aún no ha enviado el documento,
                así que estos modificadores son de andamio y cambiarán.
              </p>
            )}
          </HudCard>
        );
      })()}

      {/* Derivados: nada de esto se edita, todo sale de atributos y habilidades */}
      <HudCard className="p-4">
        <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-muted">
          {"//SYSTEM · estado"}
        </p>
        <Dato label="Puntos de vida" value={vida} tono="text-danger" />
        <Dato label="Puntos de fatiga" value={fatiga} tono="text-info" />
        <Dato label="Alerta" value={alertaPasiva} tono="text-accent" />
      </HudCard>

      <HudCard className="p-4">
        <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-muted">
          {"//SYSTEM · movimiento"}
        </p>
        <Dato
          label="Carrera"
          value={mov.carrera}
          unidad="m"
          tono={conExo ? "text-info" : "text-foreground"}
          nota={notaExo}
        />
        <Dato
          label="Salto vertical"
          value={mov.saltoVertical}
          unidad="cm"
          tono={conExo ? "text-info" : "text-foreground"}
          nota={notaExo}
        />
        <Dato
          label="Salto horizontal"
          value={mov.saltoHorizontal}
          unidad="cm"
          tono={conExo ? "text-info" : "text-foreground"}
          nota={notaExo}
        />
        <Dato
          label="Escalada"
          value={mov.escalada}
          unidad="m"
          tono={conExo ? "text-info" : "text-foreground"}
          nota={notaExo}
        />
        <Dato
          label="Nado"
          value={mov.nado}
          unidad="m"
          tono={conExo ? "text-info" : "text-foreground"}
          nota={notaExo}
        />
        {vue && (
          <Dato
            label={`Vuelo (movilidad aérea ${vue.nivel})`}
            value={vue.velocidadM}
            unidad="m"
            tono="text-info"
          />
        )}
      </HudCard>

      {/* Carga transportable (docs/sistema.md §5.5): solo el dato, sin
          penalizadores todavía — eso es fase aparte. */}
      <HudCard className="p-4">
        <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-muted">
          {"//SYSTEM · carga"}
        </p>
        <Dato
          label="Peso equipado (armas)"
          value={pesoArmas}
          unidad="kg"
          tono={pesoArmas > limiteCarga ? "text-danger" : "text-foreground"}
        />
        <Dato label="Límite sin penalizador" value={limiteCarga} unidad="kg" />
        <p className="mt-2 font-mono text-[10px] leading-relaxed text-muted">
          Armaduras y módulos no traen peso en el documento — este número cuenta solo las
          armas equipadas.
        </p>
      </HudCard>

      {/* Trasfondo */}
      <HudCard className="p-4">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-muted">
          {"//SYSTEM · trasfondo"}
        </p>
        <textarea
          value={sheet.trasfondo}
          maxLength={2000}
          rows={5}
          placeholder="Historia, ganchos de rol…"
          onChange={(e) => onTrasfondo(e.target.value)}
          className="clip-chamfer-sm w-full resize-none border border-border bg-night px-3 py-2 font-sans text-sm text-foreground outline-none placeholder:text-muted focus:border-accent"
        />
      </HudCard>
    </div>
  );
}
