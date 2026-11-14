import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-helpers";
import { parseSheet, poder } from "@/lib/rules";
import { AppHeader } from "@/components/AppHeader";
import { MasterTabs } from "@/components/MasterTabs";
import { crearNpcFormAction, crearNpcAleatorioFormAction } from "./actions";
import { CatalogoNpcs, type NpcDelCatalogo } from "./CatalogoNpcs";

// Catálogo de NPCs del máster. Se trae entero en un fetch y la búsqueda/orden se
// hace en cliente (CatalogoNpcs): aunque haya cientos, son filas pequeñas.
export default async function NpcsPage() {
  const user = await requireUser();
  if (user.role !== "MASTER") redirect("/characters");

  const npcs = await prisma.npcTemplate.findMany();
  const conPoder: NpcDelCatalogo[] = npcs.map((npc) => ({
    id: npc.id,
    nombre: npc.nombre,
    nota: npc.nota,
    etiquetas: npc.etiquetas,
    poder: poder(parseSheet(npc.stats)),
    creadoEn: npc.createdAt.getTime(),
    borradoEn: npc.deletedAt?.getTime() ?? null,
  }));

  return (
    <>
      <AppHeader name={user.name} role={user.role} />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-5 lg:max-w-7xl lg:pb-10">
        <h1 className="mb-4 font-display text-2xl font-bold uppercase tracking-wide">Catálogo de NPCs</h1>
        <MasterTabs />

        <CatalogoNpcs
          npcs={conPoder}
          crear={
            <>
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

              <form action={crearNpcAleatorioFormAction} className="mb-6">
                <button
                  type="submit"
                  aria-label="Generar NPC aleatorio"
                  className="clip-chamfer flex w-full items-center justify-center gap-2 border border-border bg-surface px-5 py-3 font-display text-sm font-bold uppercase tracking-wide text-accent active:scale-95"
                >
                  Generar NPC aleatorio
                </button>
              </form>
            </>
          }
        />
      </main>
    </>
  );
}
