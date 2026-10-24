"use client";

import { Suspense, useState, useSyncExternalStore, type SyntheticEvent } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { HojaInferior } from "@/components/mando/HojaInferior";
import { FOCO } from "@/components/mando/controles";
import { cargarApartados, leerIndice, suscribirIndice } from "@/lib/manual/cliente";
import type { ApartadosDocumento } from "@/lib/manual/paraFicha";
import type { ClaveManual, TipoElemento } from "@/lib/manual/referencias";

const Cargando = () => <p className="font-mono text-[11px] uppercase text-muted">Cargando…</p>;

const ApartadoManual = dynamic(() => import("./ApartadoManual").then((m) => m.ApartadoManual), {
  ssr: false,
  loading: Cargando,
});

// Los detalles de la ficha viven a veces dentro de tarjetas clicables (la de especie
// elige al pulsar). Los eventos de la hoja suben por el árbol de React aunque vaya en
// portal: se cortan aquí.
const cortar = (e: SyntheticEvent) => e.stopPropagation();

// Enlace de un elemento del catálogo a su apartado del manual. Se resuelve por clave
// (src/lib/manual/referencias.ts); sin referencia no pinta nada.
export function BotonManual({
  tipo,
  id,
  className = "",
}: {
  tipo: TipoElemento;
  id: string;
  className?: string;
}) {
  const indice = useSyncExternalStore(suscribirIndice, leerIndice, () => null);
  const clave: ClaveManual = `${tipo}:${id}`;
  const referencia = indice?.[clave];
  const [apartados, setApartados] = useState<Promise<ApartadosDocumento | null> | null>(null);

  if (!referencia) return null;
  const cerrar = () => setApartados(null);

  return (
    <span onClick={cortar} onKeyDown={cortar} className={`inline-flex ${className}`}>
      <button
        type="button"
        onClick={() => setApartados(cargarApartados(referencia.slug))}
        aria-label={`Ver «${referencia.titulo}» en el manual`}
        className={`clip-chamfer-sm inline-flex min-h-9 items-center gap-1.5 border border-border px-2.5 font-mono text-[10px] uppercase tracking-wide text-info active:scale-95 ${FOCO}`}
      >
        <span aria-hidden="true">§</span> Manual
      </button>
      {apartados && (
        <HojaInferior
          titulo={referencia.titulo}
          onCerrar={cerrar}
          pie={
            <Link
              href={`/manual/${referencia.slug}#${referencia.ancla}`}
              className={`inline-flex min-h-11 items-center font-mono text-xs uppercase tracking-wide text-info underline underline-offset-4 ${FOCO}`}
            >
              Abrir en el manual ›
            </Link>
          }
        >
          <Suspense fallback={<Cargando />}>
            <ApartadoManual apartados={apartados} ancla={referencia.ancla} />
          </Suspense>
        </HojaInferior>
      )}
    </span>
  );
}
