import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-helpers";
import { AppHeader } from "@/components/AppHeader";
import type { EstadoActivo } from "@/lib/rules";
import { CombateConsole } from "./CombateConsole";

// Fase 6b (docs/fase-6b.md), subtarea 2.1: la consola de combate en sí. Solo
// un combate abierto a la vez (D1 del brainstorm), así que no hay id en la
// URL — esta ruta ES el combate activo (preparándose o en curso), o la
// pantalla para crear uno. PREPARANDO también cuenta como "abierto" aquí —
// el máster necesita ver la consola para montar la escena antes de pulsar
// "Comenzar combate" (a diferencia de characters/[id]/page.tsx, que solo
// busca EN_CURSO: el jugador no ve nada hasta que el máster empieza).
export default async function CombatePage() {
  const user = await requireUser();
  if (user.role !== "MASTER") redirect("/characters");

  const combateRaw = await prisma.combate.findFirst({
    where: { estado: { in: ["PREPARANDO", "EN_CURSO"] } },
    include: { combatientes: { orderBy: { orden: "asc" } } },
  });

  // `estados` es Json en la base (lib/rules/estados.ts, EstadoActivo[]) —
  // lo escriben solo las server actions de este mismo módulo, nunca el
  // cliente, así que un cast basta aquí. Si algún día algo más lo escribe,
  // esto necesita el mismo tratamiento tolerante que parseSheet.
  const combate = combateRaw && {
    ...combateRaw,
    combatientes: combateRaw.combatientes.map((c) => ({
      ...c,
      estados: c.estados as unknown as EstadoActivo[],
    })),
  };

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
