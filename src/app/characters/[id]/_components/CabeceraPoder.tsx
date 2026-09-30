import {
  HABILIDADES,
  etiquetaEconomia,
  opcionesDisponibles,
  textoValor,
  type AccionPoder,
  type CosteFatiga,
  type PoderResuelto,
  type ToggleFatiga,
} from "@/lib/rules";

const TIPO_OBJETIVO: Record<NonNullable<PoderResuelto["objetivo"]>["tipo"], string> = {
  unico: "Único",
  casilla: "Casilla",
  varios: "Varios",
  propio: "Tú",
  aliado: "Aliado",
};

// Cabecera del modal de un poder: selectores de nivel empleado y opciones,
// casillas de fatiga, y la ficha del poder ya resuelta. Los cambios suben al
// padre, que vuelve a resolver el poder.
export function CabeceraPoder({
  accion,
  poder,
  coste,
  fatigaActual,
  toggles,
  togglesActivos,
  onElegir,
  onToggles,
  cargas,
  pesoKg,
  onPeso,
}: {
  accion: AccionPoder;
  poder: PoderResuelto;
  coste: CosteFatiga | null; // null = fatiga no numérica, se paga a mano
  fatigaActual: number;
  toggles: ToggleFatiga[];
  togglesActivos: string[];
  onElegir: (eje: string, opcion: string) => void;
  onToggles: (toggles: string[]) => void;
  // Derivación Psiónica instalada: puntos de fatiga que se pagan con cargas.
  cargas?: {
    nivel: number;
    disponibles: number;
    porPunto: number;
    puntos: number;
    max: number;
    onCambiar: (puntos: number) => void;
  };
  // Proeza: peso del objetivo (excesoDeCarga).
  pesoKg?: number;
  onPeso?: (kg: number | undefined) => void;
}) {
  const u = poder.unidades;
  const conUnidad = (v: Parameters<typeof textoValor>[0], unidad = "m") =>
    typeof v === "number" ? `${v} ${unidad}` : textoValor(v);
  const danio = poder.resolucion.tipo === "ataque" ? poder.resolucion.danio : null;
  const area = poder.objetivo?.area;
  const datos: [string, string][] = [
    ["Acción", etiquetaEconomia(poder.economia)],
    ["Fatiga", coste ? String(coste.total) : textoValor(poder.fatiga)],
  ];
  if (poder.alcance !== null) datos.push(["Alcance", conUnidad(poder.alcance, u.alcance)]);
  if (area !== undefined) datos.push(["Área", conUnidad(area, u.area)]);
  else if (poder.objetivo) datos.push(["Objetivo", TIPO_OBJETIVO[poder.objetivo.tipo]]);
  if (poder.duracion !== null) datos.push(["Duración", conUnidad(poder.duracion, u.duracion ?? "")]);
  if (poder.desplazamiento !== null) datos.push(["Desplaz.", conUnidad(poder.desplazamiento, u.desplazamiento)]);
  if (poder.carga !== null) datos.push(["Carga máx.", conUnidad(typeof poder.carga === "number" ? Math.max(0, poder.carga) : poder.carga, "kg")]);
  if (danio !== null && poder.resolucion.tipo === "ataque") datos.push(["Daño", `${textoValor(danio)} ${poder.resolucion.categoria}`]);
  for (const d of poder.datos) datos.push([d.etiqueta, textoValor(d.valor)]);
  const notas = poder.notas.filter((n) => n.lugar === "tirada");

  const alternar = (t: ToggleFatiga) => {
    if (togglesActivos.includes(t.toggle)) return onToggles(togglesActivos.filter((x) => x !== t.toggle));
    // Las casillas de un mismo grupo se excluyen entre sí.
    const delGrupo = t.grupo ? toggles.filter((o) => o.grupo === t.grupo).map((o) => o.toggle) : [];
    onToggles([...togglesActivos.filter((x) => !delGrupo.includes(x)), t.toggle]);
  };

  return (
    <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3">
      {accion.ejes.map((eje) => {
        const opciones = opcionesDisponibles(eje, poder.nivelPoseido);
        if (opciones.length < 2) return null;
        const boton = (id: string, texto: string) => {
          const activa = poder.elecciones[eje.id] === id;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={activa}
              onClick={() => onElegir(eje.id, id)}
              className={`clip-chamfer-sm border px-1 py-2 font-mono text-[11px] uppercase active:scale-95 ${
                activa ? "border-accent text-accent" : "border-border text-muted"
              }`}
            >
              {texto}
            </button>
          );
        };
        // En un eje de nivel, las opciones con nombre propio (Local) van en su
        // fila; los niveles, como números.
        const nombradas = eje.tipo === "nivel_empleado" ? opciones.filter((o) => o.nivel !== undefined) : [];
        const filas = eje.tipo === "nivel_empleado" ? opciones.filter((o) => o.nivel === undefined) : opciones;
        return (
          <div key={eje.id}>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">{`// ${eje.label}`}</p>
            {nombradas.length > 0 && (
              <div className={`mt-2 grid gap-1 ${nombradas.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                {nombradas.map((o) => boton(o.id, o.label))}
              </div>
            )}
            <div className={`mt-2 grid gap-1 ${eje.tipo === "nivel_empleado" ? "grid-cols-6" : filas.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
              {filas.map((o) => boton(o.id, eje.tipo === "nivel_empleado" ? o.id.slice(1) : o.label))}
            </div>
          </div>
        );
      })}

      {poder.habilidadesAElegir && (
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">{"// Habilidad"}</p>
          <div className="mt-2 grid grid-cols-2 gap-1">
            {poder.habilidadesAElegir.map((h) => {
              const activa = poder.resolucion.tipo !== "sin_dado" && poder.resolucion.habilidad === h;
              return (
                <button
                  key={h}
                  type="button"
                  aria-pressed={activa}
                  onClick={() => onElegir("habilidad", h)}
                  className={`clip-chamfer-sm border px-1 py-2 font-mono text-[11px] uppercase active:scale-95 ${
                    activa ? "border-accent text-accent" : "border-border text-muted"
                  }`}
                >
                  {HABILIDADES.find((x) => x.id === h)?.label ?? h}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {toggles.length > 0 && (
        <div className="flex flex-col gap-1">
          {toggles.map((t) => {
            const activo = togglesActivos.includes(t.toggle);
            return (
              <button
                key={t.toggle}
                type="button"
                aria-pressed={activo}
                onClick={() => alternar(t)}
                className={`clip-chamfer-sm border px-2 py-1.5 text-left font-mono text-[11px] uppercase active:scale-[0.98] ${
                  activo ? "border-info text-info" : "border-border text-muted"
                }`}
              >
                {activo ? "✓ " : ""}
                {t.toggle}
              </button>
            );
          })}
        </div>
      )}

      {accion.excesoDeCarga && onPeso && (
        <div>
          <label className="flex items-center justify-between gap-2 font-mono text-[11px] uppercase text-muted">
            Peso del objetivo (kg)
            <input
              type="number"
              inputMode="numeric"
              min={0}
              aria-label="Peso del objetivo en kg"
              value={pesoKg ?? ""}
              onChange={(e) => onPeso(e.target.value === "" ? undefined : Number(e.target.value))}
              className="clip-chamfer-sm w-24 border border-border bg-elevated px-2 py-1.5 text-right font-mono text-sm text-foreground"
            />
          </label>
          {poder.exceso && !poder.exceso.bloqueo && (
            <p className="mt-1 font-mono text-[11px] text-foreground">
              {poder.exceso.porcentajeCarga} % de tu carga ({poder.exceso.cargaMax} kg) → +{poder.exceso.extra} de fatiga
              {poder.exceso.enLimite && <span className="text-danger"> · en el límite</span>}
            </p>
          )}
        </div>
      )}

      {cargas && (
        <div>
          <div className="flex items-center justify-between gap-2 font-mono text-[11px] uppercase text-muted">
            <span>Pagar con cargas (Derivación {cargas.nivel})</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Un punto menos con cargas"
                disabled={cargas.puntos <= 0}
                onClick={() => cargas.onCambiar(cargas.puntos - 1)}
                className="clip-chamfer-sm border border-border px-2 py-1 text-foreground disabled:text-muted/50"
              >
                −
              </button>
              <span className="w-6 text-center tabular-nums text-foreground">{cargas.puntos}</span>
              <button
                type="button"
                aria-label="Un punto más con cargas"
                disabled={cargas.puntos >= cargas.max}
                onClick={() => cargas.onCambiar(cargas.puntos + 1)}
                className="clip-chamfer-sm border border-border px-2 py-1 text-foreground disabled:text-muted/50"
              >
                +
              </button>
            </div>
          </div>
          <p className="mt-1 font-mono text-[11px] text-muted">
            {cargas.porPunto} {cargas.porPunto === 1 ? "carga" : "cargas"} por punto · tienes {cargas.disponibles}
            {cargas.puntos > 0 && <span className="text-foreground"> · gastas {cargas.puntos * cargas.porPunto}</span>}
          </p>
        </div>
      )}

      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[11px]">
        {datos.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-2 border-b border-border/50 py-0.5">
            <dt className="uppercase text-muted">{k}</dt>
            <dd className="text-right tabular-nums text-foreground">{v}</dd>
          </div>
        ))}
      </dl>

      {coste && (
        <div className="font-mono text-[11px]">
          {coste.desglose.length > 1 &&
            coste.desglose.map((l, i) => (
              <div key={i} className="flex justify-between gap-2 text-muted">
                <span>{l.etiqueta}</span>
                <span className="tabular-nums">{l.valor}</span>
              </div>
            ))}
          <div className="flex justify-between gap-2">
            <span className="uppercase text-muted">Fatiga tras usarlo</span>
            <span className={`tabular-nums ${fatigaActual - coste.total < 0 ? "text-danger" : "text-foreground"}`}>
              {fatigaActual} → {fatigaActual - coste.total}
            </span>
          </div>
        </div>
      )}

      {poder.multiplesObjetivos && (
        <p className="border-l-2 border-accent pl-2 font-sans text-[11px] leading-relaxed text-foreground">
          Varios objetivos: cada uno paga{" "}
          {poder.multiplesObjetivos.fatigaPorObjetivo !== undefined
            ? textoValor(poder.multiplesObjetivos.fatigaPorObjetivo)
            : coste
              ? coste.total
              : textoValor(poder.fatiga)}{" "}
          de fatiga. Aquí se cobra uno; los demás, descuéntalos en Recursos. {poder.multiplesObjetivos.texto}
        </p>
      )}

      {notas.length > 0 && (
        <ul className="flex flex-col gap-1">
          {notas.map((n, i) => (
            <li key={i} className="border-l-2 border-info pl-2 font-sans text-[11px] leading-relaxed text-foreground">
              {n.texto}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
