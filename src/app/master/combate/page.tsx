import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-helpers";
import { AppHeader } from "@/components/AppHeader";
import { CombateConsole } from "./CombateConsole";

// Fase 6b (docs/fase-6b.md), subtarea 2.1: la consola de combate en sí. Solo
// un Combate EN_CURSO a la vez (D1 del brainstorm), así que no hay id en la
// URL — esta ruta ES el combate activo, o la pantalla para crear uno.
export default async function CombatePage() {
  const user = await requireUser();
  if (user.role !== "MASTER") redirect("/characters");

  const combate = await prisma.combate.findFirst({
    where: { estado: "EN_CURSO" },
    include: { combatientes: { orderBy: { orden: "asc" } } },
  });

  const characters = await prisma.character.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, owner: { select: { name: true, email: true } } },
  });

  return (
    <>
      <AppHeader name={user.name} role={user.role} back={{ href: "/master", label: "Panel" }} />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-5">
        <h1 className="mb-4 font-display text-2xl font-bold uppercase tracking-wide">
          Gestor de combate
        </h1>
        <CombateConsole combate={combate} characters={characters} />
      </main>
    </>
  );
}
