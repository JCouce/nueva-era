import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-helpers";
import { listarRegistro } from "@/lib/registroMaster";
import {
  describirEstadosActivos,
  leerEstados,
  parseSheet,
  resolverFicha,
  textoEntradaRegistro,
  VITALIDAD_DE_FICHA,
} from "@/lib/rules";
import { AppHeader } from "@/components/AppHeader";
import { MesaMaster, type JugadorMesa } from "./MesaMaster";

const ENTRADAS_REGISTRO = 40;

// La Mesa (E1c, docs/tareas.md "Centro de mando del máster"): estados, recompensas y
// registro con deshacer sobre los personajes en juego. La lista de fichas (revisión,
// aprobar...) vive en /master/fichas.
export default async function MesaPage() {
  const user = await requireUser();
  if (user.role !== "MASTER") redirect("/characters");
  const { jugadores, registro, generadoEn } = await cargarMesa();

  return (
    <>
      <AppHeader name={user.name} role={user.role} />
      <main className="mx-auto w-full max-w-md flex-1 px-4 pb-28 pt-5 lg:max-w-7xl lg:pb-10">
        <MesaMaster jugadores={jugadores} registro={registro} generadoEn={generadoEn} />
      </main>
    </>
  );
}

async function cargarMesa() {
  // En juego = aprobados, los mismos que limpia "Terminar escena".
  const filas = await prisma.character.findMany({
    where: { status: "APPROVED" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, stats: true, estados: true, xp: true, creditos: true },
  });
  // TODO(revisar): la vida y la fatiga son las de la ficha; con un combate abierto el
  // jugador lleva además su foto (Combatiente), que la Mesa no enseña.
  const jugadores: JugadorMesa[] = filas.map((f) => {
    const sheet = parseSheet(f.stats);
    const estados = leerEstados(f.estados);
    const ficha = resolverFicha(sheet, { estados, vitalidad: VITALIDAD_DE_FICHA });
    const especie = ficha.especie
      ? [ficha.especie.especie.label, ficha.especie.casta?.label].filter(Boolean).join(" · ")
      : null;
    return {
      id: f.id,
      nombre: f.name,
      especie,
      xp: f.xp,
      creditos: f.creditos,
      vida: { actual: sheet.vidaActual, max: ficha.salud.vida },
      fatiga: { actual: sheet.fatigaActual, max: ficha.salud.fatiga },
      estados: describirEstadosActivos(estados),
    };
  });

  const registro = (await listarRegistro(ENTRADAS_REGISTRO)).map((e) => ({
    id: e.id,
    creadaEn: e.createdAt.getTime(),
    texto: textoEntradaRegistro(e.tipo, e.datos, e.personajes),
    motivo: e.motivo,
    deshecha: e.deshechoAt !== null,
    deshacible: e.datos !== null,
  }));

  return { jugadores, registro, generadoEn: Date.now() };
}
