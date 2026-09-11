import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-helpers";
import { parseSheet, poder } from "@/lib/rules";
import { AppHeader } from "@/components/AppHeader";
import { HudCard } from "@/components/HudCard";
import { MasterTabs } from "@/components/MasterTabs";
import { crearNpcFormAction, eliminarNpcFormAction } from "./actions";

// Fase 6b, subtarea 5.1: catálogo de NPCs, la pieza de UI que faltaba del
// rediseño del bloque 5 (backend cerrado en 5.0/5.0b, docs/fase-6b.md). Cards
// con nombre + Poder (5.0b) — "especialización" queda fuera, sin definir
// todavía (nota del diseño de UI, no bloquea nada). Con 30-50 NPCs como
// mucho esto se resuelve entero en un solo fetch, sin paginar.
export default async function NpcsPage() {
  const user = await requireUser();
  if (user.role !== "MASTER") redirect("/characters");

  const npcs = await prisma.npcTemplate.findMany({ orderBy: { nombre: "asc" } });
  const conPoder = npcs.map((npc) => ({
    ...npc,
    poder: poder(parseSheet(npc.stats)),
  }));

  return (
    <>
      <AppHeader name={user.name} role={user.role} />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-5">
        <h1 className="mb-4 font-display text-2xl font-bold uppercase tracking-wide">
          Catálogo de NPCs
        </h1>
        <MasterTabs />

        {/* El botón "+" siempre visible del diseño de UI (docs/fase-6b.md):
            aquí es el punto de entrada real a todo el bloque 5 (sin esto no
            hay forma de meter un NPC en un combate, ver 5.2), así que es la
            única pieza de esta pantalla que se sale del lenguaje visual
            estándar — glow que respira en vez de un botón plano. */}
        <form action={crearNpcFormAction} className="mb-6 flex gap-2">
          <input
            name="nombre"
            required
            maxLength={80}
            placeholder="Nombre del NPC"
            className="clip-chamfer-sm flex-1 border border-border bg-surface px-4 py-3.5 text-base outline-none focus:border-accent"
          />
          <button
            type="submit"
            aria-label="Crear NPC"
            className="animate-pulso-nucleo clip-chamfer flex shrink-0 items-center gap-2 bg-accent px-5 py-3.5 font-display text-base font-bold uppercase tracking-wide text-black active:scale-95"
          >
            <span className="text-xl leading-none">+</span> NPC
          </button>
        </form>

        <ul className="flex flex-col gap-2">
          {conPoder.map((npc) => (
            <li key={npc.id}>
              <HudCard className="flex items-center gap-2 px-4 py-3">
                <Link href={`/master/npcs/${npc.id}`} className="min-w-0 flex-1">
                  <span className="block truncate font-display text-base font-medium uppercase tracking-wide">
                    {npc.nombre}
                  </span>
                  {npc.nota && (
                    <span className="block truncate font-mono text-xs text-muted">{npc.nota}</span>
                  )}
                </Link>
                <span className="shrink-0 font-mono text-xs tabular-nums text-info">
                  {npc.poder.toFixed(1)} <span className="text-muted">poder</span>
                </span>
                <form action={eliminarNpcFormAction}>
                  <input type="hidden" name="id" value={npc.id} />
                  <button
                    type="submit"
                    className="shrink-0 px-2 py-1 font-mono text-xs uppercase tracking-wide text-muted transition hover:text-danger"
                    aria-label={`Borrar ${npc.nombre}`}
                  >
                    Borrar
                  </button>
                </form>
              </HudCard>
            </li>
          ))}
          {conPoder.length === 0 && (
            <li className="clip-chamfer border border-dashed border-border px-4 py-8 text-center font-mono text-sm text-muted">
              Aún no hay NPCs. Crea el primero.
            </li>
          )}
        </ul>
      </main>
    </>
  );
}
