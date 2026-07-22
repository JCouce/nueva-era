import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-helpers";
import { AppHeader } from "@/components/AppHeader";
import { HudCard } from "@/components/HudCard";
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
        <h1 className="mb-4 font-display text-2xl font-bold uppercase tracking-wide">
          {isMaster ? "Todas las fichas" : "Mis personajes"}
        </h1>

        <ul className="flex flex-col gap-2">
          {characters.map((c) => (
            <li key={c.id}>
              <HudCard className="flex items-center gap-2 px-4 py-3">
                <Link href={`/characters/${c.id}`} className="flex-1">
                  <span className="font-display text-base font-medium uppercase tracking-wide">
                    {c.name}
                  </span>
                  {isMaster && (
                    <span className="block font-mono text-xs text-muted">
                      {c.owner.name ?? c.owner.email}
                    </span>
                  )}
                </Link>
                <form action={deleteCharacter}>
                  <input type="hidden" name="id" value={c.id} />
                  <button
                    type="submit"
                    className="px-2 py-1 font-mono text-xs uppercase tracking-wide text-muted transition hover:text-danger"
                    aria-label={`Borrar ${c.name}`}
                  >
                    Borrar
                  </button>
                </form>
              </HudCard>
            </li>
          ))}
          {characters.length === 0 && (
            <li className="clip-chamfer border border-dashed border-border px-4 py-8 text-center font-mono text-sm text-muted">
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
            className="clip-chamfer-sm flex-1 border border-border bg-surface px-4 py-3 text-base outline-none focus:border-accent"
          />
          <button
            type="submit"
            className="clip-chamfer bg-accent px-4 py-3 font-display font-semibold uppercase tracking-wide text-black shadow-glow-yellow active:scale-[0.99]"
          >
            Crear
          </button>
        </form>
      </main>
    </>
  );
}
