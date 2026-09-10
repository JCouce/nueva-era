import { ATRIBUTOS, HABILIDADES, TIRADAS } from "@/lib/rules";
import type {
  Armadura,
  ArmaFuego,
  ArmaMelee,
  MejoraEstandar,
  Subsistema,
  MejoraDeArma,
  MejoraMovimiento,
  Herramienta,
  Consumible,
  Modificador,
  Rareza,
} from "@/lib/rules";

// Un color por tramo de rareza, no uno por palabra: cinco tonos ya sobran de
// sistema, así que se reutilizan los que ya existen (info/accent/glitch) y
// solo se suma el naranja, que no tenía hueco en la paleta.
const RAREZA_CLASES: Record<Rareza, string> = {
  Común: "border-border text-foreground",
  "Poco Habitual": "border-info text-info",
  Extraño: "border-accent text-accent",
  "Muy Extraño": "border-neon-orange text-neon-orange",
  Singular: "border-glitch text-glitch",
};

// Null solo lo usan las armas melee que no se compran (ver armasMelee.ts):
// sin rareza asignada, no hay badge que pintar.
export function BadgeRareza({ rareza }: { rareza: Rareza | null }) {
  if (rareza === null) return null;
  return (
    <span
      className={`clip-chamfer-sm shrink-0 whitespace-nowrap border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide ${RAREZA_CLASES[rareza]}`}
    >
      {rareza}
    </span>
  );
}

function signo(n: number) {
  return n >= 0 ? `+${n}` : `${n}`;
}

// Traduce un modificador crudo del catálogo a texto legible. Solo hay
// "tirada" en el slice, pero se cubre el resto para cuando lleguen aumentos
// que sí toquen un atributo o un derivado directamente — mismo criterio que
// el desglose de especie en ResumenTab.
function etiquetaModificador(m: Modificador): string {
  if (m.tipo === "atributo") return ATRIBUTOS.find((a) => a.id === m.id)!.label;
  if (m.tipo === "habilidad") return HABILIDADES.find((h) => h.id === m.id)!.label;
  if (m.tipo === "derivado") return m.id;
  const a = m.alcance;
  if (a.tipo === "tiradaId") return TIRADAS.find((t) => t.id === a.id)?.label ?? a.id;
  if (a.tipo === "grupo") return a.grupo;
  if (a.tipo === "habilidad") return HABILIDADES.find((h) => h.id === a.habilidad)!.label;
  return `Modo ${a.contieneEtiqueta}`;
}

function ChipsModificadores({ mods }: { mods: Modificador[] }) {
  if (mods.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {mods.map((m, i) => (
        <span
          key={i}
          className={`clip-chamfer-sm border px-2 py-1 font-mono text-[10px] uppercase ${
            m.valor >= 0 ? "border-info text-info" : "border-danger text-danger"
          }`}
        >
          {signo(m.valor)} {etiquetaModificador(m)}
        </span>
      ))}
    </div>
  );
}

// Mismo criterio de color que ChipsModificadores: un valor que empieza por
// signo es un bonificador o penalizador, así que lleva su tinte (info/danger)
// en vez del blanco liso de un dato neutro como "8 kg" o "Nivel 4". Ninguno
// de los demás Stat de este fichero empieza por +/-, así que no hay riesgo
// de teñir algo que no toca.
function Stat({ label, value }: { label: string; value: string }) {
  const tono = value.startsWith("+") ? "text-info" : value.startsWith("-") ? "text-danger" : "text-foreground";
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-border py-1 last:border-0">
      <span className="text-muted">{label}</span>
      <span className={`tabular-nums ${tono}`}>{value}</span>
    </div>
  );
}

export function DetalleArmadura({ p }: { p: Armadura }) {
  return (
    <>
      <p className="font-sans text-sm leading-relaxed text-muted">{p.descripcion}</p>
      <dl className="mt-3 grid grid-cols-1 gap-x-4 font-mono text-[11px] sm:grid-cols-2">
        <Stat label="Blindaje" value={String(p.blindaje)} />
        <Stat
          label="Bonif. máx. Agilidad"
          value={p.bonifMaxAgilidad === null ? "Ilimitado" : `+${p.bonifMaxAgilidad}`}
        />
        <Stat label="Ranuras de subsistema" value={String(p.ranurasSubsistema)} />
        <Stat
          label="Tope exoesqueleto"
          value={p.topeExoesqueleto === null ? "No admite" : `Nivel ${p.topeExoesqueleto}`}
        />
        <Stat
          label="Tope mov. aérea"
          value={p.topeMovilidadAerea === null ? "No admite" : `Nivel ${p.topeMovilidadAerea}`}
        />
      </dl>
      <ChipsModificadores mods={p.modificadores} />
    </>
  );
}

export function DetalleArma({ p }: { p: ArmaFuego }) {
  return (
    <>
      <p className="font-sans text-sm leading-relaxed text-muted">{p.descripcion}</p>

      {/* Uno o dos modos de disparo: semi y automático tienen su propia
          dificultad y daño, pero comparten alcance, munición y peso. */}
      <div className="mt-3 flex flex-col gap-1.5">
        {p.modos.map((m) => (
          <div
            key={m.etiqueta}
            className="flex items-baseline justify-between gap-2 font-mono text-[11px]"
          >
            <span className="uppercase text-foreground">{m.etiqueta}</span>
            <span className="tabular-nums text-muted">
              dif. {signo(m.dificultad)} · {m.danio} {m.categoriaDanio}
            </span>
          </div>
        ))}
      </div>

      <dl className="mt-3 grid grid-cols-1 gap-x-4 font-mono text-[11px] sm:grid-cols-2">
        <Stat label="Empleo" value={p.empleo} />
        <Stat
          label="Alcance corta/media/larga"
          value={`${p.alcance.corta}/${p.alcance.media}/${p.alcance.larga} m`}
        />
        <Stat label="Munición" value={String(p.municion)} />
        <Stat label="Mejoras admitidas" value={String(p.mejorasAdmitidas)} />
        <Stat label="Peso" value={`${p.pesoKg} kg`} />
        <Stat label="Rareza" value={`${p.rareza} · ${p.coste} cr.`} />
      </dl>
      {p.especial && (
        <p className="mt-2 font-mono text-[10px] uppercase leading-relaxed text-info">
          {p.especial}
        </p>
      )}
      <ChipsModificadores mods={p.modificadores} />
    </>
  );
}

// Melee: uno o dos modos de ataque, pero el daño es una FÓRMULA sobre un
// atributo ("Fue+2"), no un número — se calcula al golpear, no aquí. Sin
// modificadores: nada de esto se mecaniza (ver catalog/armasMelee.ts).
export function DetalleArmaMelee({ p }: { p: ArmaMelee }) {
  return (
    <>
      <p className="font-sans text-sm leading-relaxed text-muted">{p.descripcion}</p>

      <div className="mt-3 flex flex-col gap-1.5">
        {p.modos.map((m) => (
          <div
            key={m.etiqueta}
            className="flex items-baseline justify-between gap-2 font-mono text-[11px]"
          >
            <span className="uppercase text-foreground">{m.etiqueta}</span>
            <span className="tabular-nums text-muted">
              dif. {signo(m.dificultad)} · {m.formulaDanio} {m.categoriaDanio}
            </span>
          </div>
        ))}
      </div>

      {p.uso.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {p.uso.map((u) => (
            <span
              key={u}
              className="clip-chamfer-sm border border-border px-2 py-1 font-mono text-[10px] uppercase text-muted"
            >
              {u}
            </span>
          ))}
        </div>
      )}

      {p.defensa && (
        <dl className="mt-3 grid grid-cols-1 gap-x-4 font-mono text-[11px] sm:grid-cols-2">
          <Stat label="Cobertura" value={`Nivel ${p.defensa.cobertura}`} />
          <Stat label="Blindaje del escudo" value={String(p.defensa.blindaje)} />
          <Stat label="Puntos de golpe del escudo" value={String(p.defensa.puntosGolpe)} />
        </dl>
      )}

      <dl className="mt-3 grid grid-cols-1 gap-x-4 font-mono text-[11px] sm:grid-cols-2">
        <Stat
          label="Peso"
          value={
            p.pesoKg === null
              ? "No especificado"
              : p.pesoKg === 0
                ? "Insignificante"
                : `${p.pesoKg} kg`
          }
        />
        <Stat
          label="Rareza"
          value={
            p.rareza === null && p.coste === null
              ? "No se compra"
              : `${p.rareza ?? "—"} · ${p.coste === null ? "—" : `${p.coste} cr.`}`
          }
        />
      </dl>
      {p.efectos && (
        <p className="mt-2 font-mono text-[10px] uppercase leading-relaxed text-info">{p.efectos}</p>
      )}
    </>
  );
}

// Mejoras estándar, subsistemas, mejoras de arma y herramientas (Valija
// Táctica Médica y lo que llegue después): mismo cuerpo (niveles, con el
// instalado resaltado si se pasa `nivelActual`), con el añadido de
// modos/célula cuando es un subsistema. Herramienta encaja tal cual porque
// comparte forma con MejoraEstandar (niveles con NivelModulo) — la única
// diferencia, que no se instala en nada, no afecta a cómo se muestra.
export function DetalleModulo({
  p,
  nivelActual,
}: {
  p: MejoraEstandar | Subsistema | MejoraDeArma | MejoraMovimiento | Herramienta;
  nivelActual?: number;
}) {
  return (
    <>
      <p className="font-sans text-sm leading-relaxed text-muted">{p.descripcion}</p>

      {p.familia === "subsistema" && (
        <div className="mt-3 flex flex-col gap-1.5 border-t border-border pt-3">
          {p.modos.map((m) => (
            <p key={m.label} className="font-sans text-xs leading-snug text-muted">
              <span className="font-mono uppercase text-foreground">{m.label}: </span>
              {m.descripcion}
            </p>
          ))}
          {p.celula && (
            <p className="mt-1 font-mono text-[10px] uppercase text-muted">
              Célula: {p.celula.cargas} cargas · recarga {p.celula.recarga} · batería nueva{" "}
              {p.celula.bateriaCoste} cr.
            </p>
          )}
          <p className="font-mono text-[10px] uppercase text-muted">{p.accionActivacion}</p>
          {p.notaApilamiento && (
            <p className="font-sans text-[11px] italic leading-relaxed text-muted">
              {p.notaApilamiento}
            </p>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
        {p.niveles.map((n) => (
          <div
            key={n.nivel}
            className={`clip-chamfer-sm border p-2 ${
              n.nivel === nivelActual ? "border-accent" : "border-border"
            }`}
          >
            <div className="flex items-baseline justify-between font-mono text-[11px] uppercase">
              <span className={n.nivel === nivelActual ? "text-accent" : "text-foreground"}>
                Nivel {n.nivel}
                {n.nivel === nivelActual ? " · equipado" : ""}
              </span>
              <span className="text-muted">
                {n.rareza} · {n.coste} cr.
              </span>
            </div>
            <ul className="mt-1.5 list-disc pl-4 font-sans text-[11px] leading-relaxed text-muted">
              {n.detalle.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
            <ChipsModificadores mods={n.modificadores} />
          </div>
        ))}
      </div>
    </>
  );
}

// Consumibles (fármacos, y más adelante materiales): precio plano, sin
// niveles. La mayoría no traen `modificadores` a propósito — son bonos por
// dosis, no de personaje entero, y el motor no lleva inventario de dosis
// consumidas (ver catalog/medicina.ts).
export function DetalleConsumible({ p }: { p: Consumible }) {
  return (
    <>
      <p className="font-sans text-sm leading-relaxed text-muted">{p.descripcion}</p>
      <ul className="mt-3 list-disc pl-4 font-sans text-[11px] leading-relaxed text-muted">
        {p.detalle.map((d, i) => (
          <li key={i}>{d}</li>
        ))}
      </ul>
      <dl className="mt-3 grid grid-cols-1 gap-x-4 font-mono text-[11px] sm:grid-cols-2">
        <Stat
          label="Peso"
          value={
            p.pesoKg === null
              ? "No especificado"
              : p.pesoKg === 0
                ? "Insignificante"
                : `${p.pesoKg} kg`
          }
        />
        <Stat label="Rareza" value={`${p.rareza} · ${p.coste} cr.`} />
      </dl>
      <ChipsModificadores mods={p.modificadores} />
    </>
  );
}
