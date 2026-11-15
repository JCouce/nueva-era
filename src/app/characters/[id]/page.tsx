import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser, canEditCharacter } from "@/lib/auth-helpers";
import { parseSheet, parseSnapshot, leerEstados, estadosDeCombatiente, reconciliarVidaConEstados, danioDeFoto, tiradasDeFila } from "@/lib/rules";
import { AppHeader } from "@/components/AppHeader";
import { HudCard } from "@/components/HudCard";
import { StatusControl } from "@/app/master/MasterControls";
import { EstadoFichaChip } from "@/components/EstadoFichaChip";
import { CharacterSheet } from "./CharacterSheet";
import { mesaDeFicha } from "@/lib/mesaDeFicha";
import { hayVueltaAlCombate } from "@/lib/navegacionCombate";

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
  // parseSheet topa la vida en reposo; aquí, el exacto con los estados (td-12).
  const sheet = reconciliarVidaConEstados(parseSheet(character.stats), estados);

  // Fase 6b bloque 3 (D5: combate → ficha, nunca al revés): si el personaje
  // está metido en el Combate EN_CURSO actual, la ficha se lo enseña — tira
  // compacta siempre visible + tab "Combate" con la cola completa. Los estados de
  // cada fila, como en master/combate/page.tsx (estadosDeCombatiente): los de su
  // ficha para un jugador, los de su fila para un NPC.
  // Se busca también el que se está preparando (solo hay uno abierto a la vez), pero solo para
  // el «← Volver al combate» del máster: el jugador no ve nada hasta que empieza.
  const abierto = await prisma.combate.findFirst({
    where: { estado: { in: ["PREPARANDO", "EN_CURSO"] } },
    include: {
      combatientes: {
        orderBy: { orden: "asc" },
        include: { character: { select: { estados: true } } },
      },
    },
  });
  const combateRaw = abierto?.estado === "EN_CURSO" ? abierto : null;
  const combate = combateRaw && {
    ...combateRaw,
    combatientes: combateRaw.combatientes.map(({ character, tiradas, ...c }) => ({
      ...c,
      danio: danioDeFoto(c.danio, c.pgActual, c.pgMax),
      estados: estadosDeCombatiente({ ...c, character }),
      // Las tiradas de la mesa las ven todos, NPC incluidos (usuario, 2026-11-15). Como en la
      // consola: solo la ronda actual; el historial, con «Ver más» (historialTiradasAction).
      ...tiradasDeFila(tiradas, combateRaw.ronda),
    })),
  };
  // Si el personaje no tiene fila en este combate, no hay "su combate" que
  // enseñar (mismo criterio que la redacción original de la 3.1).
  const enCombate = combate?.combatientes.some((c) => c.characterId === character.id) ?? false;
  // Aliados y turno de combate, para los límites de las acciones de dote (Apoyo: uno por aliado).
  const mesa = await mesaDeFicha(character.id);

  return (
    <>
      <AppHeader
        name={user.name}
        role={user.role}
        back={{ href: "/characters", label: "Personajes" }}
        volverAlCombate={hayVueltaAlCombate(user.role, abierto?.estado)}
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
          mesa={mesa}
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
