import { etiquetaDuracionCorta, type EstadoActivoDescrito } from "@/lib/rules";

const FOCO =
  "outline-none focus-visible:ring-2 focus-visible:ring-info focus-visible:ring-offset-2 focus-visible:ring-offset-background";

// Un estado activo en un chip: "Aturdido · Fracaso · 2r". Fondo tintado y borde del
// color de aviso, nombre en tinta y negrita (se lee sobre cualquier superficie), grado y
// duración en mono atenuado. Sin text-shadow: la utilidad `text-glitch` de globals.css
// añade sombra doble y no se lee. Con `onQuitar`, una × de 44 px de área táctil. Con
// `onProlongar` (ps-07, Sondeo No-Local), el botón de alargarlo con lo que cuesta.
// Mesa, cola del combate y ficha del jugador.
export function ChipEstado({
  estado,
  onQuitar,
  quitarLabel,
  onProlongar,
  deshabilitado = false,
}: {
  estado: EstadoActivoDescrito;
  onQuitar?: () => void;
  onProlongar?: () => void;
  quitarLabel?: string;
  deshabilitado?: boolean;
}) {
  // Activables de aumento (A5a): la duración larga, que dice que las rondas solo corren en combate.
  // A7: un estado que la inmunidad deja sin efecto lo dice ("Inmune (Ojo Biónico 2)"), y uno
  // puesto con "Aplicar igualmente", "forzado". Los automáticos (Heridas, Fatiga, Inconsciencia
  // por la vida o la fatiga) no tienen duración ni ×: se van solos.
  const quitable = onQuitar && !estado.automatico;
  const extra = [
    estado.grado,
    estado.automatico ? "automático" : (estado.duracionActivable ?? etiquetaDuracionCorta(estado.duracion)),
    estado.inmune ? `Inmune (${estado.inmune})` : null,
    estado.forzado ? "forzado" : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <span
      className={`inline-flex min-h-7 max-w-full items-center gap-1.5 border text-[0.85rem] leading-tight text-foreground ${
        estado.inmune
          ? "border-dashed border-info bg-info/10"
          : estado.automatico
            ? "border-danger bg-danger/10"
            : "border-glitch bg-glitch/15"
      } ${quitable ? "pl-2" : "px-2"} ${onProlongar && estado.prolongar ? "flex-wrap py-1" : ""}`}
    >
      <b className={`truncate font-bold ${estado.inmune ? "line-through decoration-info" : ""}`}>{estado.nombre}</b>
      {/* T4: el número que guarda (Sigilo por sentido, «dificultad 12 · Mosquito»). */}
      {estado.valorTexto && <span className="min-w-0 font-mono text-[0.78rem] tabular-nums text-accent">{estado.valorTexto}</span>}
      {extra && (
        <span
          className={`${estado.duracionActivable || estado.inmune ? "min-w-0" : "shrink-0 whitespace-nowrap"} font-mono text-[0.72rem] text-muted`}
        >
          · {extra}
        </span>
      )}
      {onProlongar && estado.prolongar && (
        <button
          type="button"
          onClick={onProlongar}
          disabled={deshabilitado}
          className={`min-h-9 shrink-0 border border-accent px-2 font-display text-[0.72rem] font-semibold uppercase tracking-wide text-accent active:scale-95 disabled:opacity-50 ${FOCO}`}
        >
          {estado.prolongar.etiqueta} (−{estado.prolongar.coste} fatiga)
        </button>
      )}
      {quitable && (
        <button
          type="button"
          onClick={onQuitar}
          disabled={deshabilitado}
          aria-label={quitarLabel ?? `Quitar ${estado.label}`}
          // 44 px de área con un chip más bajo: el margen negativo no empuja la fila.
          className={`-my-2 grid size-11 shrink-0 place-items-center text-lg text-foreground hover:bg-glitch/30 disabled:opacity-50 ${FOCO}`}
        >
          ×
        </button>
      )}
    </span>
  );
}
