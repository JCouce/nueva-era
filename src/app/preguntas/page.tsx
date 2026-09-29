import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { PreguntasLista, type PreguntaVista } from "./PreguntasLista";

export const metadata: Metadata = {
  title: "Preguntas al diseñador — Nueva Era",
};

export default async function PreguntasPage() {
  const preguntas = await prisma.pregunta.findMany({ orderBy: [{ area: "asc" }, { orden: "asc" }] });
  const vista: PreguntaVista[] = preguntas.map((p) => ({
    id: p.id,
    area: p.area,
    grupo: p.grupo,
    texto: p.texto,
    contexto: p.contexto,
    respuesta: p.respuesta,
    respondidaAt: p.respondidaAt?.toISOString() ?? null,
  }));

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 pb-16 pt-5">
      <h1 className="font-display text-2xl font-bold uppercase tracking-wide">Preguntas al diseñador</h1>
      <p className="mt-2 text-base text-muted">
        Dudas de reglas que han salido al pasar el sistema a la app. Escribe la respuesta debajo de cada una:
        se guarda sola. Puedes dejar cualquiera en blanco y volver otro día.
      </p>
      <PreguntasLista preguntas={vista} />
    </main>
  );
}
