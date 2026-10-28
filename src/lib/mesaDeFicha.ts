// Lo que la ficha de un jugador sabe de la mesa para los límites de sus acciones de dote
// (dotesAcciones.ts, MesaDeFicha): los aliados son los otros personajes en juego (aprobados y
// sin borrar, los mismos que la Mesa del máster), y el turno, el del combate en curso si el
// personaje está en su cola. La usan la página de la ficha y el servidor al gastar un uso, para
// que los dos cuenten con lo mismo.
import { prisma } from "@/lib/db";
import { NO_BORRADA } from "@/lib/borrado";
import { claveDeTurno, type MesaDeFicha } from "@/lib/rules";

export async function mesaDeFicha(characterId: string): Promise<MesaDeFicha> {
  const [otros, combate] = await Promise.all([
    prisma.character.findMany({
      where: { ...NO_BORRADA, status: "APPROVED", id: { not: characterId } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.combate.findFirst({
      where: { estado: "EN_CURSO", combatientes: { some: { characterId } } },
      select: { id: true, ronda: true },
    }),
  ]);
  return { aliados: otros.map((o) => ({ id: o.id, nombre: o.name })), turno: claveDeTurno(combate) };
}
