import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser, canEditCharacter } from "@/lib/auth-helpers";
import { parseSheet, type EstadoActivo } from "@/lib/rules";
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

  // Fase 6b bloque 3 (D5: combate → ficha, nunca al revés): si el personaje
  // está metido en el Combate EN_CURSO actual, la ficha se lo enseña — tira
  // compacta siempre visible + tab "Combate" con la cola completa. Mismo
  // patrón de cast tolerante que master/combate/page.tsx: `estados` es Json
  // escrito solo por las server actions de ese módulo.
  const combateRaw = await prisma.combate.findFirst({
    where: { estado: "EN_CURSO" },
    include: { combatientes: { orderBy: { orden: "asc" } } },
  });
  const combate = combateRaw && {
    ...combateRaw,
    combatientes: combateRaw.combatientes.map((c) => ({
      ...c,
      estados: c.estados as unknown as EstadoActivo[],
    })),
  };
  // Si el personaje no tiene fila en este combate, no hay "su combate" que
  // enseñar (mismo criterio que la redacción original de la 3.1).
  const enCombate = combate?.combatientes.some((c) => c.characterId === character.id) ?? false;

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
          esMaster={user.role === "MASTER"}
          combate={enCombate ? combate : null}
        />
      </main>
    </>
  );
}
