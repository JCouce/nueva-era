"use client";

import { use } from "react";
import type { ApartadosDocumento } from "@/lib/manual/paraFicha";
import { DocumentoMarkdown } from "./DocumentoMarkdown";

// Cuerpo de la hoja del manual. Va en su propio trozo (BotonManual lo carga con
// next/dynamic) para que react-markdown no pese en la ficha hasta que se abre.
export function ApartadoManual({
  apartados,
  ancla,
}: {
  apartados: Promise<ApartadosDocumento | null>;
  ancla: string;
}) {
  const apartado = use(apartados)?.[ancla];
  if (!apartado) {
    return <p className="font-mono text-[11px] uppercase text-muted">No se ha podido cargar el apartado.</p>;
  }
  return (
    <div className="pb-2">
      <DocumentoMarkdown markdown={apartado.markdown} />
    </div>
  );
}
