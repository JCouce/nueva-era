import {
  vuelo,
  levitacion,
  pesoEquipado,
  bloqueoDeEspecie,
  hayQueAvisar,
  eleccionDeFicha,
  rangoReferencia,
  ATRIBUTOS,
  HABILIDADES,
  ACCIONES,
} from "@/lib/rules";
import type {
  FichaResuelta,
  CategoriaPrioridad,
  LetraPrioridad,
  EleccionEspecie,
  Modificador,
} from "@/lib/rules";
import { HudCard } from "@/components/HudCard";
import { PrioridadCard } from "./PrioridadCard";
import { EspecieSelector } from "./EspecieSelector";

const fieldLabel = "font-mono text-[10px] uppercase tracking-widest text-muted";
const fieldInput =
  "clip-chamfer-sm border border-border bg-night px-3 py-2 font-mono outline-none focus:border-accent";

function Dato({
  label,
  value,
  max,
  unidad,
  tono = "text-foreground",
  nota,
}: {
  label: string;
  value: number;
  // Presente para vida/fatiga: pinta "actual/max" en vez de un número suelto
  // — el ajuste en sí vive en Recursos (docs/tareas.md, 2026-09-27), esto es
  // solo el vistazo rápido.
  max?: number;
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
        {max !== undefined && <span className="text-muted">/{max}</span>}
        {unidad && <span className="text-muted"> {unidad}</span>}
        {nota && ` (${nota})`}
      </span>
    </div>
  );
}

function etiquetaModificador(m: Modificador): string {
  if (m.tipo === "atributo") return ATRIBUTOS.find((a) => a.id === m.id)!.label;
  if (m.tipo === "habilidad") return HABILIDADES.find((h) => h.id === m.id)!.label;
  if (m.tipo === "derivado") return m.id;
  const a = m.alcance;
  if (a.tipo === "tiradaId") return ACCIONES.find((t) => t.id === a.id)?.label ?? a.id;
  if (a.tipo === "grupo") return a.grupo;
  if (a.tipo === "habilidad") return HABILIDADES.find((h) => h.id === a.habilidad)!.label;
  if (a.tipo === "todas") return "Todas las tiradas";
  return `Modo ${a.contieneEtiqueta}`;
}

export function ResumenTab({
  name,
  ficha,
  aprobada,
  esMaster,
  creditos,
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
  ficha: FichaResuelta;
  aprobada: boolean;
  esMaster: boolean;
  creditos: number;
  onName: (v: string) => void;
  onEdad: (v: number | null) => void;
  onAltura: (v: number | null) => void;
  onPeso: (v: number | null) => void;
  onEspecie: (eleccion: EleccionEspecie) => void;
  onTrasfondo: (v: string) => void;
  onMotivacion: (v: string) => void;
  onPrioridad: (categoria: CategoriaPrioridad, letra: LetraPrioridad | null) => void;
}) {
  const sheet = ficha.ficha;
  const { vida, fatiga } = ficha.salud;
  const alertaPasiva = ficha.alerta;
  const mov = ficha.movimiento;
  const vue = vuelo(sheet);
  const lev = levitacion(sheet);
  const conExo = mov.bonoExoesqueleto > 0;
  const notaExo = conExo ? `+${mov.bonoExoesqueleto} exoesqueleto` : undefined;
  const limiteCarga = ficha.cargaMaxima;
  const pesoArmas = pesoEquipado(sheet);
  const ctxEspecie = { aprobada, esMaster, libre: false };
  const eleccion = eleccionDeFicha(sheet);
  const rango = rangoReferencia(ficha.especie, sheet.atributos.fuerza);

  return (
    <div className="flex flex-col gap-4">
      {/* Lo primero que se decide (propuesta-especies §2.2): en borrador, cambiarla
          resetea todo lo demás. */}
      <HudCard className="p-4">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-muted">
          {"//SYSTEM · especie"}
        </p>
        <EspecieSelector
          key={`${eleccion.especieId}|${eleccion.casta}|${eleccion.linaje}`}
          guardada={eleccion}
          bloqueo={bloqueoDeEspecie(ctxEspecie)}
          avisar={hayQueAvisar(sheet, creditos, ctxEspecie)}
          onElegir={onEspecie}
        />
      </HudCard>

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
          </div>
          {/* Solo referencia (§14.5): los campos siguen libres. */}
          {rango && (
            <p className="font-mono text-[10px] leading-relaxed text-muted">
              Referencia {rango.fuente}: {rango.alturaCm.min}-{rango.alturaCm.max} cm ·{" "}
              {rango.pesoKg.min}-{rango.pesoKg.max} kg
            </p>
          )}
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

      {/* Qué aporta la especie, capa a capa (especie, casta, linaje): solo lo suyo,
          sin equipo ni estados. Los rasgos con modificadores van como chips; el
          resto, con su texto. */}
      {ficha.especie && (
        <HudCard className="p-4">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-muted">
            {"//SYSTEM · "}
            {ficha.especie.especie.label}
            {ficha.especie.casta && ` · ${ficha.especie.casta.label}`}
            {ficha.especie.linaje && ` · ${ficha.especie.linaje.label}`}
          </p>
          <p className="font-sans text-sm leading-relaxed text-muted">
            {ficha.especie.especie.descripcion}
          </p>
          {[...new Set(ficha.especie.rasgos.map((r) => r.fuente))].map((fuente) => {
            const rasgos = ficha.especie!.rasgos.filter((r) => r.fuente === fuente);
            const mods = rasgos.flatMap((r) => r.modificadores ?? []);
            const textos = rasgos.filter((r) => !r.modificadores?.length);
            return (
              <div key={fuente} className="mt-3 border-t border-border pt-2">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted">{fuente}</p>
                {mods.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {mods.map((m, i) => (
                      <span
                        key={i}
                        className={`clip-chamfer-sm border px-2 py-1 font-mono text-[10px] uppercase ${
                          m.valor >= 0 ? "border-info text-info" : "border-danger text-danger"
                        }`}
                      >
                        {m.valor >= 0 ? `+${m.valor}` : m.valor} {etiquetaModificador(m)}
                      </span>
                    ))}
                  </div>
                )}
                {textos.map((r) => (
                  <p key={r.id} className="mt-1.5 font-sans text-xs leading-relaxed text-muted">
                    <span className="font-semibold text-foreground">{r.label}.</span> {r.texto}
                  </p>
                ))}
              </div>
            );
          })}
        </HudCard>
      )}

      {/* Derivados: nada de esto se edita, todo sale de atributos y habilidades */}
      <HudCard className="p-4">
        <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-muted">
          {"//SYSTEM · estado"}
        </p>
        <Dato label="Puntos de vida" value={sheet.vidaActual} max={vida} tono="text-danger" />
        <Dato
          label="Puntos de fatiga"
          value={sheet.fatigaActual}
          max={fatiga}
          tono="text-info"
          nota={sheet.fatigaTemporal > 0 ? `${sheet.fatigaTemporal} temporal de Proeza · efectiva ${sheet.fatigaActual - sheet.fatigaTemporal}` : undefined}
        />
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
        {lev && (
          <Dato label={`Levitar (Traslación ${lev.nivel})`} value={lev.velocidadM} unidad="m" tono="text-info" />
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
