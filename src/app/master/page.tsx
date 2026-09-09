import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-helpers";
import { AppHeader } from "@/components/AppHeader";
import { HudCard } from "@/components/HudCard";
import { StatusControl, ResourceRow } from "./MasterControls";

export default async function MasterPage() {
  const user = await requireUser();
  if (user.role !== "MASTER") redirect("/characters");

  const characters = await prisma.character.findMany({
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    include: { owner: { select: { name: true, email: true } } },
  });

  const pendientes = characters.filter((c) => c.status === "DRAFT");
  const aprobadas = characters.filter((c) => c.status === "APPROVED");

  return (
    <>
      <AppHeader name={user.name} role={user.role} />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-5">
        <h1 className="mb-4 font-display text-2xl font-bold uppercase tracking-wide">
          Panel del máster
        </h1>

        <h2 className="mb-2 font-mono text-xs uppercase tracking-wide text-muted">
          Pendientes de aprobar ({pendientes.length})
        </h2>
        <ul className="mb-6 flex flex-col gap-2">
          {pendientes.map((c) => (
            <li key={c.id}>
              <HudCard className="flex flex-col gap-3 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Link href={`/characters/${c.id}`} className="flex-1">
                    <span className="font-display text-base font-medium uppercase tracking-wide">
                      {c.name}
                    </span>
                    <span className="block font-mono text-xs text-muted">
                      {c.owner.name ?? c.owner.email}
                    </span>
                  </Link>
                  <StatusControl characterId={c.id} status={c.status} />
                </div>
                <ResourceRow characterId={c.id} xp={c.xp} creditos={c.creditos} />
              </HudCard>
            </li>
          ))}
          {pendientes.length === 0 && (
            <li className="clip-chamfer border border-dashed border-border px-4 py-8 text-center font-mono text-sm text-muted">
              No hay fichas esperando aprobación.
            </li>
          )}
        </ul>

        <h2 className="mb-2 font-mono text-xs uppercase tracking-wide text-muted">
          Aprobadas ({aprobadas.length})
        </h2>
        <ul className="flex flex-col gap-2">
          {aprobadas.map((c) => (
            <li key={c.id}>
              <HudCard className="flex flex-col gap-3 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Link href={`/characters/${c.id}`} className="flex-1">
                    <span className="font-display text-base font-medium uppercase tracking-wide">
                      {c.name}
                    </span>
                    <span className="block font-mono text-xs text-muted">
                      {c.owner.name ?? c.owner.email}
                    </span>
                  </Link>
                  <StatusControl characterId={c.id} status={c.status} />
                </div>
                <ResourceRow characterId={c.id} xp={c.xp} creditos={c.creditos} />
              </HudCard>
            </li>
          ))}
          {aprobadas.length === 0 && (
            <li className="clip-chamfer border border-dashed border-border px-4 py-8 text-center font-mono text-sm text-muted">
              Aún no hay fichas aprobadas.
            </li>
          )}
        </ul>
      </main>
    </>
  );
}
