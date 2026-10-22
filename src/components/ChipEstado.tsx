import { etiquetaDuracionCorta, type EstadoActivoDescrito } from "@/lib/rules";

const FOCO =
  "outline-none focus-visible:ring-2 focus-visible:ring-info focus-visible:ring-offset-2 focus-visible:ring-offset-background";

// Un estado activo en un chip: "Aturdido · Fracaso · 2r". Fondo tintado y borde del
// color de aviso, nombre en tinta y negrita (se lee sobre cualquier superficie), grado y
// duración en mono atenuado. Sin text-shadow: la utilidad `text-glitch` de globals.css
// añade sombra doble y no se lee. Con `onQuitar`, una × de 44 px de área táctil.
// Mesa, cola del combate y ficha del jugador.
export function ChipEstado({
  estado,
  onQuitar,
  quitarLabel,
  deshabilitado = false,
}: {
  estado: EstadoActivoDescrito;
  onQuitar?: () => void;
  quitarLabel?: string;
  deshabilitado?: boolean;
}) {
  // Activables de aumento (A5a): la duración larga, que dice que las rondas solo corren en combate.
  const extra = [estado.grado, estado.duracionActivable ?? etiquetaDuracionCorta(estado.duracion)].filter(Boolean).join(" · ");
  return (
    <span
      className={`inline-flex min-h-7 max-w-full items-center gap-1.5 border border-glitch bg-glitch/15 text-[0.85rem] leading-tight text-foreground ${
        onQuitar ? "pl-2" : "px-2"
      }`}
    >
      <b className="truncate font-bold">{estado.nombre}</b>
      {extra && (
        <span
          className={`${estado.duracionActivable ? "min-w-0" : "shrink-0 whitespace-nowrap"} font-mono text-[0.72rem] text-muted`}
        >
          · {extra}
        </span>
      )}
      {onQuitar && (
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
