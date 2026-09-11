import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-helpers";
import { parseSheet } from "@/lib/rules";
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
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-5">
        <NpcEditor
          npcId={npc.id}
          initialNombre={npc.nombre}
          initialNota={npc.nota ?? ""}
          initialSheet={parseSheet(npc.stats)}
        />
      </main>
    </>
  );
}
