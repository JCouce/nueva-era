// Control +/− con una pista de coste debajo. Presentacional: la lógica vive en el padre.
export function Stepper({
  value,
  hint,
  canBuy,
  atMin,
  atMax,
  onBuy,
  onSell,
}: {
  value: number;
  hint: string;
  canBuy: boolean;
  atMin: boolean;
  atMax: boolean;
  onBuy: () => void;
  onSell: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onSell}
        disabled={atMin}
        aria-label="Bajar"
        className="h-9 w-9 shrink-0 border border-border bg-elevated font-mono text-lg leading-none text-muted active:scale-95 disabled:opacity-30"
      >
        −
      </button>
      <span className="w-7 text-center font-mono text-xl tabular-nums text-foreground">
        {value}
      </span>
      <div className="flex flex-col items-center">
        <button
          type="button"
          onClick={onBuy}
          disabled={atMax || !canBuy}
          aria-label="Subir"
          className="h-9 w-9 shrink-0 border border-accent bg-accent font-mono text-lg leading-none text-black active:scale-95 disabled:border-border disabled:bg-elevated disabled:text-muted"
        >
          +
        </button>
        <span className="mt-0.5 font-mono text-[10px] leading-none text-muted">
          {hint}
        </span>
      </div>
    </div>
  );
}
