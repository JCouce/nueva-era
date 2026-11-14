import { trozosDeEtiqueta } from "@/lib/rules";

// La etiqueta de una línea de desglose, con la marca «(shock)» de una pieza tocada por el Shock
// resaltada en azul (trozosDeEtiqueta, el motor). Para todos los desgloses: tirada, Resistir daño,
// atributos y habilidades.
export function EtiquetaDesglose({ etiqueta }: { etiqueta: string }) {
  return (
    <>
      {trozosDeEtiqueta(etiqueta).map((t, i) =>
        t.shock ? (
          <span key={i} className="text-info">
            {t.texto}
          </span>
        ) : (
          <span key={i}>{t.texto}</span>
        ),
      )}
    </>
  );
}
