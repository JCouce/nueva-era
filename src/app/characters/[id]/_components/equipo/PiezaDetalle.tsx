import {
  APLICADOS,
  ATRIBUTOS,
  HABILIDADES,
  ACCIONES,
  ALCANCE_ARROJADA,
  disciplinaPorId,
  ETIQUETA_DERIVADO,
  aumentoPorId,
  textoDanioModo,
} from "@/lib/rules";
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
  ArmaPesada,
  MunicionGranada,
  Modificador,
  Rareza,
  OperacionGenetica,
  Implante,
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
      className={`clip-chamfer-sm shrink-0 whitespace-nowrap border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide ${RAREZA_CLASES[rareza]}`}
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
// que sí toquen un atributo o un derivado directamente.
function etiquetaModificador(m: Modificador): string {
  if (m.tipo === "atributo") return ATRIBUTOS.find((a) => a.id === m.id)!.label;
  if (m.tipo === "habilidad") return HABILIDADES.find((h) => h.id === m.id)!.label;
  if (m.tipo === "derivado") return ETIQUETA_DERIVADO[m.id];
  if (m.tipo === "disciplina") return disciplinaPorId(m.id).label;
  if (m.tipo === "multiplicadorVida") return "Fortaleza en la vida";
  const a = m.alcance;
  if (a.tipo === "tiradaId") return ACCIONES.find((t) => t.id === a.id)?.label ?? a.id;
  if (a.tipo === "grupo") return a.grupo;
  if (a.tipo === "habilidad") return HABILIDADES.find((h) => h.id === a.habilidad)!.label;
  if (a.tipo === "grupoHabilidad") return `${a.grupo} con ${HABILIDADES.find((h) => h.id === a.habilidad)!.label}`;
  if (a.tipo === "todas") return "Todas las tiradas";
  if (a.tipo === "aplicado") return `Tiradas de ${a.aplicados.map((id) => APLICADOS.find((x) => x.id === id)!.label).join(", ")}`;
  if (a.tipo === "familiaArma") return `Ataques (${a.familia.replace("_", " ")})${a.empleo ? `, arma a ${a.empleo}` : ""}`;
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
          {m.tipo === "multiplicadorVida" ? `×${String(m.valor).replace(".", ",")}` : signo(m.valor)} {etiquetaModificador(m)}
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
      <p className="font-sans text-prosa text-soft">{p.descripcion}</p>
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
      <p className="font-sans text-prosa text-soft">{p.descripcion}</p>

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
              dif. {signo(m.dificultad)} · {textoDanioModo(m)} {m.categoriaDanio}
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
      <p className="font-sans text-prosa text-soft">{p.descripcion}</p>

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

      <dl className="mt-3 grid grid-cols-1 gap-x-4 font-mono text-[11px] sm:grid-cols-2">
        <Stat label="Empleo" value={p.empleo} />
        {p.alcance !== undefined && <Stat label="Alcance" value={String(p.alcance)} />}
        {p.ignoraBlindaje !== undefined && (
          <Stat label="Ignora blindaje" value={`${p.ignoraBlindaje} puntos`} />
        )}
      </dl>

      {(p.sutil || p.arrojadiza) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[p.sutil ? "Sutil" : null, p.arrojadiza ? "Arrojadiza" : null].filter((u) => u !== null).map((u) => (
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
      <p className="font-sans text-prosa text-soft">{p.descripcion}</p>

      {p.familia === "subsistema" && (
        <div className="mt-3 flex flex-col gap-1.5 border-t border-border pt-3">
          {p.modos.map((m) => (
            <p key={m.label} className="font-sans text-prosa text-soft">
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
            <p className="font-sans text-prosa-sm italic text-soft">
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
            <ul className="mt-1.5 list-disc pl-4 font-sans text-prosa text-soft">
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

// Armamento Pesado: dificultad y daño fijos (sin modos entre los que
// elegir, a diferencia de DetalleArma) — mismos campos que la tirada
// dinámica de lib/rules/combate.ts pinta en el modal, para que la ficha
// técnica de la Tienda no diga algo distinto de lo que sale al tirar.
export function DetalleArmaPesada({ p }: { p: ArmaPesada }) {
  return (
    <>
      <p className="font-sans text-prosa text-soft">{p.descripcion}</p>

      <div className="mt-3 flex items-baseline justify-between gap-2 font-mono text-[11px]">
        <span className="uppercase text-foreground">{p.accion}</span>
        <span className="tabular-nums text-muted">
          dif. {signo(p.dificultad)} ·{" "}
          {p.danio === null ? "según granada" : `${p.danio} ${p.categoriaDanio}`}
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-1 gap-x-4 font-mono text-[11px] sm:grid-cols-2">
        <Stat label="Alcance" value={p.alcanceM === null ? "— (área)" : `${p.alcanceM} m`} />
        <Stat label="Cargador" value={String(p.cargador)} />
        <Stat label="Mejoras admitidas" value={String(p.mejorasAdmitidas)} />
        <Stat label="Peso" value={p.pesoNota ? `${p.pesoKg} kg (${p.pesoNota})` : `${p.pesoKg} kg`} />
        <Stat label="Rareza" value={`${p.rareza} · ${p.coste} cr.`} />
      </dl>
      {p.efectos && (
        <p className="mt-2 font-mono text-[10px] uppercase leading-relaxed text-info">{p.efectos}</p>
      )}
      <ChipsModificadores mods={p.modificadores} />
    </>
  );
}

// Granadas: se lanzan a mano (Potencia + Atletismo, dificultad
// `dificultadArrojada`) — mismo dato que usa su tirada dinámica en
// lib/rules/combate.ts. Sin `modificadores`: su único número mecanizado es
// la dificultad de lanzarla, que vive en la tirada, no en un bono de
// personaje (ver catalog/municion.ts).
export function DetalleGranada({ p }: { p: MunicionGranada }) {
  return (
    <>
      <div className="flex items-baseline justify-between gap-2 font-mono text-[11px]">
        <span className="uppercase text-foreground">Lanzada a mano</span>
        <span className="tabular-nums text-muted">
          dif. {signo(p.dificultadArrojada)} ·{" "}
          {p.categoriaDanio === null ? "sin daño directo" : `${p.danio} ${p.categoriaDanio}`}
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-1 gap-x-4 font-mono text-[11px] sm:grid-cols-2">
        <Stat label="Alcance" value={ALCANCE_ARROJADA} />
        <Stat label="Rareza" value={`${p.rareza} · ${p.coste} cr.`} />
      </dl>
      <p className="mt-2 font-mono text-[10px] uppercase leading-relaxed text-info">{p.areaEfecto}</p>
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
      <p className="font-sans text-prosa text-soft">{p.descripcion}</p>
      <ul className="mt-3 list-disc pl-4 font-sans text-prosa text-soft">
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

// ── Aumentos (docs/sistema.md §11.3): texto; los efectos que ya se aplican (A1) van por la ficha ──

function Lineas({ lineas }: { lineas: string[] }) {
  return (
    <ul className="mt-1.5 list-disc pl-4 font-sans text-prosa text-soft">
      {lineas.map((d, i) => (
        <li key={i}>{d}</li>
      ))}
    </ul>
  );
}

// Marcas de las reglas generales de los implantes.
export function MarcasImplante({ p }: { p: Implante }) {
  const marcas = [p.sabotaje && "sabotaje", p.electronico && "electrónico (Shock)"].filter(
    (m): m is string => typeof m === "string",
  );
  if (marcas.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {marcas.map((m) => (
        <span
          key={m}
          className="clip-chamfer-sm border border-glitch px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-neon-magenta"
        >
          {m}
        </span>
      ))}
    </div>
  );
}

// `eleccion`: en la ficha, solo se enseña la opción elegida; sin ella (Tienda), todas.
export function DetalleOperacion({ p, eleccion }: { p: OperacionGenetica; eleccion?: string }) {
  const opciones = p.eleccion?.opciones.filter((o) => eleccion === undefined || o.id === eleccion) ?? [];
  return (
    <>
      <Lineas lineas={p.detalle} />
      {opciones.map((o) => (
        <div key={o.id} className="mt-2 clip-chamfer-sm border border-border p-2">
          <p className="font-mono text-[11px] uppercase text-foreground">{o.label}</p>
          <Lineas lineas={o.detalle} />
        </div>
      ))}
      <dl className="mt-3 grid grid-cols-1 gap-x-4 font-mono text-[11px] sm:grid-cols-2">
        <Stat
          label="Requisitos"
          value={p.requisitos.length ? p.requisitos.map((id) => aumentoPorId(id)?.label ?? id).join(", ") : "Ninguno"}
        />
        <Stat label="Rareza" value={`${p.rareza} · ${p.coste} cr.`} />
      </dl>
    </>
  );
}

export function DetalleImplante({
  p,
  nivelActual,
  eleccion,
}: {
  p: Implante;
  nivelActual?: number;
  eleccion?: string;
}) {
  return (
    <>
      <p className="font-sans text-prosa text-soft">{p.descripcion}</p>
      <div className="mt-2">
        <MarcasImplante p={p} />
      </div>
      <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
        {p.niveles.map((n) => {
          const actual = n.nivel === nivelActual;
          return (
            <div key={n.nivel} className={`clip-chamfer-sm border p-2 ${actual ? "border-accent" : "border-border"}`}>
              <div className="flex items-baseline justify-between font-mono text-[11px] uppercase">
                <span className={actual ? "text-accent" : "text-foreground"}>
                  Nivel {n.nivel}
                  {actual ? " · equipado" : ""}
                </span>
                <span className="text-muted">
                  {n.rareza} · {n.coste} cr.
                </span>
              </div>
              <Lineas lineas={n.detalle} />
              {n.variantes?.map((v) => {
                const elegida = actual && v.id === eleccion;
                return (
                  <div
                    key={v.id}
                    className={`mt-1.5 clip-chamfer-sm border p-2 ${elegida ? "border-accent" : "border-border"}`}
                  >
                    <p className={`font-mono text-[10px] uppercase ${elegida ? "text-accent" : "text-foreground"}`}>
                      {v.label}
                      {elegida ? " · el tuyo" : ""}
                    </p>
                    <Lineas lineas={v.detalle} />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </>
  );
}
