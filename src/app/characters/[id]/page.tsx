import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser, canEditCharacter } from "@/lib/auth-helpers";
import { parseSheet } from "@/lib/rules";
import { AppHeader } from "@/components/AppHeader";
import { HudCard } from "@/components/HudCard";
import { StatusControl, ResourceRow } from "@/app/master/MasterControls";
import { CharacterSheet } from "./CharacterSheet";

export default async function CharacterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const character = await prisma.character.findUnique({ where: { id } });
  // En este modelo, ver = poder editar (dueño o máster).
  if (!character || !canEditCharacter(user, character)) notFound();

  const sheet = parseSheet(character.stats);

  return (
    <>
      <AppHeader
        name={user.name}
        role={user.role}
        back={{ href: "/characters", label: "Personajes" }}
      />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-5">
        {user.role === "MASTER" && (
          <HudCard className="mb-4 flex flex-col gap-3 px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-wide text-muted">
                {character.status === "DRAFT" ? "Borrador" : "Aprobada"}
              </span>
              <StatusControl characterId={character.id} status={character.status} />
            </div>
            <ResourceRow
              characterId={character.id}
              xp={character.xp}
              creditos={character.creditos}
            />
          </HudCard>
        )}
        <CharacterSheet
          characterId={character.id}
          initialName={character.name}
          initialSheet={sheet}
          characterStatus={character.status}
          initialXp={character.xp}
          initialCreditos={character.creditos}
        />
      </main>
    </>
  );
}
