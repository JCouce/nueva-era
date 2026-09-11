import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-helpers";
import { AppHeader } from "@/components/AppHeader";
import { MasterTabs } from "@/components/MasterTabs";
import { parseSheet, poder, type EstadoActivo } from "@/lib/rules";
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
  // `sheet` sí pasa por `parseSheet` (subtarea 5.5): es la foto congelada al
  // añadir el NPC (5.0), pero sigue siendo Json guardado hace tiempo —
  // mismo tratamiento tolerante que la ficha de un Character, no un cast a
  // pelo. `null` para un Combatiente-jugador, que no lo necesita (lee su
  // Sheet en vivo desde su propia ficha).
  const combate = combateRaw && {
    ...combateRaw,
    combatientes: combateRaw.combatientes.map((c) => ({
      ...c,
      estados: c.estados as unknown as EstadoActivo[],
      sheet: c.sheet ? parseSheet(c.sheet) : null,
    })),
  };

  const characters = await prisma.character.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, owner: { select: { name: true, email: true } } },
  });

  // Fase 6b, subtarea 5.2: el catálogo entero (nombre + nota + Poder de
  // 5.0b, no solo el id) para que el máster elija con algo de contexto sin
  // saltar a /master/npcs — mismo criterio que ya usa esa pantalla.
  const npcTemplates = await prisma.npcTemplate.findMany({ orderBy: { nombre: "asc" } });
  const npcs = npcTemplates.map((n) => ({
    id: n.id,
    nombre: n.nombre,
    nota: n.nota,
    poder: poder(parseSheet(n.stats)),
  }));

  return (
    <>
      <AppHeader name={user.name} role={user.role} />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-5">
        <h1 className="mb-4 font-display text-2xl font-bold uppercase tracking-wide">
          Gestor de combate
        </h1>
        <MasterTabs />
        <CombateConsole combate={combate} characters={characters} npcs={npcs} />
      </main>
    </>
  );
}
