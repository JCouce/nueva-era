import { etiquetaTipoDanio, type DanioExtra, type TipoDanio } from "@/lib/rules";

// Un color por tipo de daño (tokens --color-danio-* de globals.css). Clases enteras, no
// montadas, para que Tailwind las encuentre.
export const CLASE_TIPO_DANIO: Record<TipoDanio, string> = {
  cinetico: "text-danio-cinetico",
  electrico: "text-danio-electrico",
  fuego: "text-danio-fuego",
  frio: "text-danio-frio",
  corrosivo: "text-danio-corrosivo",
  plasma: "text-danio-plasma",
  sonico: "text-danio-sonico",
  toxico: "text-danio-toxico",
  mental: "text-danio-mental",
};

// "7 Cinético + 2 Eléctrico (Letal)", cada parte con el color de su tipo y, si la trae, su
// gravedad (la del daño extra, que no tiene por qué ser la del golpe).
export function PartesDanio({
  partes,
}: {
  partes: { tipo: TipoDanio; label: string; valor: number | string; categoria?: string }[];
}) {
  return (
    <>
      {partes.map((p, i) => (
        <span key={p.tipo}>
          {i > 0 && <span className="text-muted"> + </span>}
          <span className={CLASE_TIPO_DANIO[p.tipo]}>
            <span className="tabular-nums">{p.valor}</span> {p.label}
            {p.categoria && ` (${p.categoria})`}
          </span>
        </span>
      ))}
    </>
  );
}

// Lo que se suma al daño de un modo antes de tirarlo: el tipo del básico (si lo trae) y los
// extras (la munición especial de otro tipo los trae sin tipo de básico).
export function TipoYExtras({ tipoBase, extras }: { tipoBase?: TipoDanio; extras: readonly DanioExtra[] }) {
  return (
    <>
      {tipoBase && <span className={CLASE_TIPO_DANIO[tipoBase]}> {etiquetaTipoDanio(tipoBase).toLowerCase()}</span>}
      {extras.map((e) => (
        <span key={e.tipo} className={CLASE_TIPO_DANIO[e.tipo]}>
          {" "}
          +{e.valor} {etiquetaTipoDanio(e.tipo)}
        </span>
      ))}
    </>
  );
}
