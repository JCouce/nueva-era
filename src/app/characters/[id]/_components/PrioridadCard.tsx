import {
  CATEGORIAS_PRIORIDAD,
  LETRAS_PRIORIDAD,
  letrasDisponibles,
  repartoCompleto,
  PUNTOS_ATRIBUTOS_POR_LETRA,
  PUNTOS_HABILIDADES_POR_LETRA,
  PUNTOS_PSIONICA_POR_LETRA,
  PUNTOS_DOTES_POR_LETRA,
  RECURSOS_POR_LETRA,
  type CategoriaPrioridad,
  type LetraPrioridad,
  type Prioridades,
} from "@/lib/rules";
import { HudCard } from "@/components/HudCard";

const ETIQUETAS: Record<CategoriaPrioridad, string> = {
  atributos: "Atributos",
  habilidades: "Habilidades",
  dotes: "Dotes",
  psionica: "Psiónica",
  recursos: "Recursos",
};

// Qué desbloquea cada letra en cada categoría, para pintarlo bajo los
// botones. Dotes A-D no tiene número en HOJA2 todavía (S12) — se declara
// "pendiente" en vez de inventar una cifra.
function resumenLetra(categoria: CategoriaPrioridad, letra: LetraPrioridad): string {
  switch (categoria) {
    case "atributos":
      return `${PUNTOS_ATRIBUTOS_POR_LETRA[letra]} pts`;
    case "habilidades":
      return `${PUNTOS_HABILIDADES_POR_LETRA[letra]} pts`;
    case "psionica":
      return `${PUNTOS_PSIONICA_POR_LETRA[letra]} pts`;
    case "dotes": {
      const pts = PUNTOS_DOTES_POR_LETRA[letra];
      return pts === undefined ? "pendiente" : `${pts} pts`;
    }
    case "recursos": {
      const r = RECURSOS_POR_LETRA[letra];
      return `${r.creditos.toLocaleString("es-ES")} créd`;
    }
  }
}

export function PrioridadCard({
  prioridades,
  onSet,
}: {
  prioridades: Prioridades;
  onSet: (categoria: CategoriaPrioridad, letra: LetraPrioridad | null) => void;
}) {
  const completo = repartoCompleto(prioridades);

  return (
    <HudCard className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
          {"//SYSTEM · reparto de prioridad"}
        </p>
        <span
          className={`font-mono text-[10px] uppercase tracking-wide ${
            completo ? "text-accent" : "text-muted"
          }`}
        >
          {completo ? "completo" : "reparte las 5 letras"}
        </span>
      </div>
      <p className="mb-3 font-mono text-[11px] leading-relaxed text-muted">
        Una letra por categoría, sin repetir — dónde pones la A y dónde la E define el
        personaje.
      </p>
      <div className="flex flex-col gap-3">
        {CATEGORIAS_PRIORIDAD.map((categoria) => {
          const actual = prioridades[categoria];
          const disponibles = new Set(letrasDisponibles(prioridades, categoria));
          return (
            <div key={categoria}>
              <div className="mb-1 flex items-baseline justify-between">
                <span className="font-display text-sm font-semibold uppercase tracking-wide">
                  {ETIQUETAS[categoria]}
                </span>
                <span className="font-mono text-[10px] text-muted">
                  {actual ? resumenLetra(categoria, actual) : "sin asignar"}
                </span>
              </div>
              <div className="flex gap-1">
                {LETRAS_PRIORIDAD.map((letra) => {
                  const activa = actual === letra;
                  const usable = disponibles.has(letra);
                  return (
                    <button
                      key={letra}
                      type="button"
                      disabled={!usable}
                      onClick={() => onSet(categoria, activa ? null : letra)}
                      className={`clip-chamfer-sm h-9 flex-1 border font-display text-sm font-semibold uppercase active:scale-95 disabled:opacity-25 ${
                        activa
                          ? "border-accent bg-accent text-black"
                          : "border-border text-muted"
                      }`}
                    >
                      {letra}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </HudCard>
  );
}
