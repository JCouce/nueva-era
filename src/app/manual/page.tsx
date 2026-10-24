import Link from "next/link";
import type { Metadata } from "next";
import { AppHeader } from "@/components/AppHeader";
import { HudCard } from "@/components/HudCard";
import { listarDocumentos } from "@/lib/manual/documentos";

export const metadata: Metadata = { title: "Manual — Nueva Era" };

// Estática a propósito (se genera en build desde docs/fuente/). La sesión la exige
// src/proxy.ts, como en el resto de páginas: llamar aquí a requireUser() la haría
// dinámica. Por eso la cabecera no lleva nombre ni rol.
export default async function ManualPage() {
  const documentos = await listarDocumentos();

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-5">
        <h1 className="mb-1 font-display text-2xl font-bold uppercase tracking-wide">Manual</h1>
        <p className="mb-4 font-mono text-xs text-muted">Reglas del diseñador, tal cual</p>
        <ul className="flex flex-col gap-2">
          {documentos.map((d, i) => (
            <li key={d.slug}>
              <Link href={`/manual/${d.slug}`} className="block">
                <HudCard className="flex items-center gap-3 px-4 py-3 transition active:scale-[0.99]">
                  <span className="w-6 shrink-0 font-mono text-xs text-accent">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1 font-display text-base font-medium uppercase tracking-wide">
                    {d.nombre}
                  </span>
                  <span className="font-mono text-xs text-muted">›</span>
                </HudCard>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
