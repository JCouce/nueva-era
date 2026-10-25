import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-helpers";
import { parseSheet, reconciliarVida } from "@/lib/rules";
import { AppHeader } from "@/components/AppHeader";
import { NpcEditor } from "./NpcEditor";

export default async function NpcPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (user.role !== "MASTER") redirect("/characters");

  const npc = await prisma.npcTemplate.findUnique({ where: { id } });
  if (!npc) notFound();

  return (
    <>
      <AppHeader name={user.name} role={user.role} back={{ href: "/master/npcs", label: "NPCs" }} />
      {/* Abajo, hueco para el dock de NavegacionFicha en móvil (más el safe-area); en
          escritorio se ensancha para que las pestañas quepan en una sola fila. */}
      <main className="mx-auto w-full max-w-md flex-1 px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-5 lg:max-w-4xl lg:pb-5">
        <NpcEditor
          npcId={npc.id}
          initialNombre={npc.nombre}
          initialNota={npc.nota ?? ""}
          initialSheet={reconciliarVida(parseSheet(npc.stats))}
        />
      </main>
    </>
  );
}
