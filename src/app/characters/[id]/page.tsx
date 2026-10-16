import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser, canEditCharacter } from "@/lib/auth-helpers";
import { parseSheet, parseSnapshot, leerEstados, estadosDeCombatiente } from "@/lib/rules";
import { AppHeader } from "@/components/AppHeader";
import { HudCard } from "@/components/HudCard";
import { StatusControl, ResourceRow } from "@/app/master/MasterControls";
import { EstadoFichaChip } from "@/components/EstadoFichaChip";
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
  // Aparte de `sheet` (que la ficha guarda en useState): así el polling los refresca.
  const estados = leerEstados(character.estados);

  // Fase 6b bloque 3 (D5: combate → ficha, nunca al revés): si el personaje
  // está metido en el Combate EN_CURSO actual, la ficha se lo enseña — tira
  // compacta siempre visible + tab "Combate" con la cola completa. Los estados de
  // cada fila, como en master/combate/page.tsx (estadosDeCombatiente): los de su
  // ficha para un jugador, los de su fila para un NPC.
  const combateRaw = await prisma.combate.findFirst({
    where: { estado: "EN_CURSO" },
    include: {
      combatientes: {
        orderBy: { orden: "asc" },
        include: { character: { select: { estados: true } } },
      },
    },
  });
  const combate = combateRaw && {
    ...combateRaw,
    combatientes: combateRaw.combatientes.map(({ character, ...c }) => ({
      ...c,
      estados: estadosDeCombatiente({ ...c, character }),
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <EstadoFichaChip estado={character.status} />
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
          esDueno={character.ownerId === user.id}
          submittedAt={character.submittedAt?.toISOString() ?? null}
          reviewNote={character.reviewNote}
          dotesDeLaFoto={parseSnapshot(character.approvedSnapshot)?.dotes ?? null}
          estados={estados}
          vidaGuardada={{ vida: sheet.vidaActual, fatiga: sheet.fatigaActual }}
          combate={enCombate ? combate : null}
        />
      </main>
    </>
  );
}
