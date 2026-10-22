import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-helpers";
import { AppHeader } from "@/components/AppHeader";
import { listarRegistro } from "@/lib/registroMaster";
import {
  parseSheet,
  poder,
  estadosDeCombatiente,
  describirEstadosActivos,
  inmunidadesDe,
  resumenCombate,
  textoEntradaRegistro,
} from "@/lib/rules";
import { CombateConsole } from "./CombateConsole";

const ENTRADAS_REGISTRO = 30;

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
    include: {
      combatientes: {
        orderBy: { orden: "asc" },
        include: { character: { select: { estados: true, stats: true, xp: true, creditos: true } } },
      },
    },
  });

  // `estados`: los de la ficha para un jugador (Character.estados, E1a), los de su
  // fila para un NPC, con el lector tolerante (estadosDeCombatiente).
  // `sheet` sí pasa por `parseSheet` (subtarea 5.5): es la foto congelada al
  // añadir el NPC (5.0), pero sigue siendo Json guardado hace tiempo —
  // mismo tratamiento tolerante que la ficha de un Character, no un cast a
  // pelo. `null` para un Combatiente-jugador, que no lo necesita (lee su
  // Sheet en vivo desde su propia ficha).
  const combate = combateRaw && {
    ...combateRaw,
    combatientes: combateRaw.combatientes.map(({ character, ...c }) => {
      const sheet = c.sheet ? parseSheet(c.sheet) : null;
      // A7: las del jugador, con su ficha en vivo; las del NPC, con su foto.
      const deFicha = character ? parseSheet(character.stats) : sheet;
      const inmunidades = deFicha ? inmunidadesDe(deFicha) : [];
      return {
        ...c,
        estados: describirEstadosActivos(estadosDeCombatiente({ ...c, character }), inmunidades),
        inmunidades,
        xp: character?.xp ?? null,
        creditos: character?.creditos ?? null,
        sheet,
      };
    }),
  };

  // Sin combate abierto: el resumen del último terminado (E1d). El siguiente combate es
  // otra fila y nace en ronda 1 (default del schema).
  const resumen = combate ? null : await cargarResumen();

  const { registro, generadoEn } = await cargarRegistro();

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
      <main className="mx-auto w-full max-w-md flex-1 px-4 pb-56 pt-5 lg:max-w-7xl lg:pb-10">
        <CombateConsole
          combate={combate}
          characters={characters}
          npcs={npcs}
          resumen={resumen}
          registro={registro}
          generadoEn={generadoEn}
        />
      </main>
    </>
  );
}

async function cargarRegistro() {
  const registro = (await listarRegistro(ENTRADAS_REGISTRO)).map((e) => ({
    id: e.id,
    creadaEn: e.createdAt.getTime(),
    texto: textoEntradaRegistro(e.tipo, e.datos, e.personajes),
    motivo: e.motivo,
    deshecha: e.deshechoAt !== null,
    deshacible: e.datos !== null,
  }));
  return { registro, generadoEn: Date.now() };
}

async function cargarResumen() {
  const ultimo = await prisma.combate.findFirst({
    where: { estado: "TERMINADO" },
    orderBy: { terminadoAt: "desc" },
    include: { combatientes: { select: { characterId: true, derrotado: true } } },
  });
  if (!ultimo) return null;
  const acciones =
    ultimo.iniciadoAt && ultimo.terminadoAt
      ? await prisma.registroMaster.count({
          where: { createdAt: { gte: ultimo.iniciadoAt, lte: ultimo.terminadoAt }, deshechoAt: null },
        })
      : 0;
  return resumenCombate({ ...ultimo, acciones });
}
