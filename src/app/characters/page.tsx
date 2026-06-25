import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-helpers";
import { AppHeader } from "@/components/AppHeader";
import { createCharacter, deleteCharacter } from "./actions";

export default async function CharactersPage() {
  const user = await requireUser();
  const isMaster = user.role === "MASTER";

  const characters = await prisma.character.findMany({
    where: isMaster ? undefined : { ownerId: user.id },
    orderBy: { updatedAt: "desc" },
    include: { owner: { select: { name: true, email: true } } },
  });

  return (
    <>
      <AppHeader name={user.name} role={user.role} />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-5">
        <h1 className="mb-4 text-xl font-bold">
          {isMaster ? "Todas las fichas" : "Mis personajes"}
        </h1>

        <ul className="flex flex-col gap-2">
          {characters.map((c) => (
            <li key={c.id}>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3">
                <Link href={`/characters/${c.id}`} className="flex-1">
                  <span className="text-base font-medium">{c.name}</span>
                  {isMaster && (
                    <span className="block text-xs text-zinc-500">
                      {c.owner.name ?? c.owner.email}
                    </span>
                  )}
                </Link>
                <form action={deleteCharacter}>
                  <input type="hidden" name="id" value={c.id} />
                  <button
                    type="submit"
                    className="rounded px-2 py-1 text-sm text-zinc-500 hover:text-red-400"
                    aria-label={`Borrar ${c.name}`}
                  >
                    Borrar
                  </button>
                </form>
              </div>
            </li>
          ))}
          {characters.length === 0 && (
            <li className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-zinc-500">
              Aún no hay personajes. Crea el primero.
            </li>
          )}
        </ul>

        <form action={createCharacter} className="mt-5 flex gap-2">
          <input
            name="name"
            required
            maxLength={80}
            placeholder="Nombre del personaje"
            className="flex-1 rounded-lg border border-border bg-card px-4 py-3 text-base outline-none focus:border-accent"
          />
          <button
            type="submit"
            className="rounded-lg bg-accent px-4 py-3 font-semibold text-black active:scale-[0.99]"
          >
            Crear
          </button>
        </form>
      </main>
    </>
  );
}
