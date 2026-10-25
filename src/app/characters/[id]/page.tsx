import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser, canEditCharacter } from "@/lib/auth-helpers";
import { parseSheet, parseSnapshot, leerEstados, estadosDeCombatiente, reconciliarVidaConEstados, danioDeFoto } from "@/lib/rules";
import { AppHeader } from "@/components/AppHeader";
import { HudCard } from "@/components/HudCard";
import { StatusControl } from "@/app/master/MasterControls";
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

  // Aparte de `sheet` (que la ficha guarda en useState): así el polling los refresca.
  const estados = leerEstados(character.estados);
  // parseSheet topa la vida con el máximo posible; aquí, el exacto con los activables puestos
  // (A5b): con la Neuroprótesis se ve 9/9, sin ella nunca 9/8.
  const sheet = reconciliarVidaConEstados(parseSheet(character.stats), estados);

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
      danio: danioDeFoto(c.danio, c.pgActual, c.pgMax),
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
      {/* Abajo, hueco para el dock de NavegacionFicha en móvil (más el safe-area); en
          escritorio, una columna hasta xl; desde xl, ancho entero para la cabina de tres columnas. */}
      <main className="mx-auto w-full max-w-md flex-1 px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-5 lg:max-w-4xl lg:pb-5 xl:max-w-[1600px] xl:px-6 xl:pb-8">
        {user.role === "MASTER" && (
          // XP y créditos se dan desde la Mesa (E1c); aquí solo el estado de revisión. En
          // la cabina (xl+) va en la columna izquierda de la ficha (controlMaster).
          <HudCard className="mb-4 flex flex-wrap items-center justify-between gap-2 px-4 py-3 xl:hidden">
            <EstadoFichaChip estado={character.status} />
            <StatusControl characterId={character.id} status={character.status} />
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
          controlMaster={
            user.role === "MASTER" ? (
              <StatusControl characterId={character.id} status={character.status} />
            ) : undefined
          }
        />
      </main>
    </>
  );
}
