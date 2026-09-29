import {
  etiquetaEconomia,
  opcionesDisponibles,
  textoValor,
  type AccionPoder,
  type CosteFatiga,
  type PoderResuelto,
} from "@/lib/rules";

// Cabecera del modal de tirada para un poder: selectores de nivel empleado y
// opciones, y la ficha del poder ya resuelta. Los cambios suben al padre, que
// vuelve a resolver el poder y a construir la tirada.
export function CabeceraPoder({
  accion,
  poder,
  coste,
  fatigaActual,
  onElegir,
}: {
  accion: AccionPoder;
  poder: PoderResuelto;
  coste: CosteFatiga | null; // null = fatiga no numérica, se paga a mano
  fatigaActual: number;
  onElegir: (eje: string, opcion: string) => void;
}) {
  const danio = poder.resolucion.tipo === "ataque" ? poder.resolucion.danio : null;
  const area = poder.objetivo?.area;
  const datos: [string, string][] = [
    ["Acción", etiquetaEconomia(poder.economia)],
    ["Fatiga", coste ? String(coste.total) : textoValor(poder.fatiga)],
    ...(poder.alcance !== null ? [["Alcance", `${textoValor(poder.alcance)} m`] as [string, string]] : []),
    ...(area !== undefined ? [["Área", `${textoValor(area)} m`] as [string, string]] : []),
    ...(poder.objetivo && area === undefined ? [["Objetivo", poder.objetivo.tipo === "unico" ? "Único" : poder.objetivo.tipo] as [string, string]] : []),
    ...(poder.desplazamiento !== null ? [["Empuje", `${textoValor(poder.desplazamiento)} m`] as [string, string]] : []),
    ...(danio !== null && poder.resolucion.tipo === "ataque"
      ? [["Daño", `${textoValor(danio)} ${poder.resolucion.categoria}`] as [string, string]]
      : []),
  ];
  const notas = poder.notas.filter((n) => n.lugar === "tirada");

  return (
    <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3">
      {accion.ejes.map((eje) => {
        const opciones = opcionesDisponibles(eje, poder.nivelPoseido);
        if (opciones.length < 2) return null;
        return (
          <div key={eje.id}>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">{`// ${eje.label}`}</p>
            <div className={`mt-2 grid gap-1 ${eje.tipo === "nivel_empleado" ? "grid-cols-6" : "grid-cols-2"}`}>
              {opciones.map((o) => {
                const activa = poder.elecciones[eje.id] === o.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    aria-pressed={activa}
                    onClick={() => onElegir(eje.id, o.id)}
                    className={`clip-chamfer-sm border px-1 py-2 font-mono text-[11px] uppercase active:scale-95 ${
                      activa ? "border-accent text-accent" : "border-border text-muted"
                    }`}
                  >
                    {eje.tipo === "nivel_empleado" ? o.id.slice(1) : o.label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[11px]">
        {datos.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-2 border-b border-border/50 py-0.5">
            <dt className="uppercase text-muted">{k}</dt>
            <dd className="tabular-nums text-foreground">{v}</dd>
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
