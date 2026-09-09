import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-helpers";
import { AppHeader } from "@/components/AppHeader";
import { HudCard } from "@/components/HudCard";
import {
  approveCharacterAction,
  revertToDraftAction,
  adjustXpAction,
  adjustCreditosAction,
} from "./actions";

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
                  <form action={approveCharacterAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <button
                      type="submit"
                      className="clip-chamfer-sm bg-accent px-3 py-2 font-mono text-xs font-semibold uppercase tracking-wide text-black shadow-glow-yellow active:scale-[0.99]"
                    >
                      Aprobar
                    </button>
                  </form>
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
                  <form action={revertToDraftAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <button
                      type="submit"
                      className="px-2 py-1 font-mono text-xs uppercase tracking-wide text-muted transition hover:text-danger"
                    >
                      Revertir
                    </button>
                  </form>
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

function ResourceRow({
  characterId,
  xp,
  creditos,
}: {
  characterId: string;
  xp: number;
  creditos: number;
}) {
  return (
    <div className="flex items-center gap-4 border-t border-border pt-3">
      <Stepper
        characterId={characterId}
        label="XP"
        value={xp}
        action={adjustXpAction}
      />
      <Stepper
        characterId={characterId}
        label="Créditos"
        value={creditos}
        action={adjustCreditosAction}
      />
    </div>
  );
}

function Stepper({
  characterId,
  label,
  value,
  action,
}: {
  characterId: string;
  label: string;
  value: number;
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <div className="flex flex-1 items-center gap-2 font-mono text-xs">
      <span className="w-14 text-muted">{label}</span>
      <form action={action}>
        <input type="hidden" name="id" value={characterId} />
        <input type="hidden" name="delta" value="-1" />
        <button
          type="submit"
          className="h-6 w-6 border border-border text-muted transition hover:text-danger"
          aria-label={`Restar ${label}`}
        >
          −
        </button>
      </form>
      <span className="w-8 text-center">{value}</span>
      <form action={action}>
        <input type="hidden" name="id" value={characterId} />
        <input type="hidden" name="delta" value="1" />
        <button
          type="submit"
          className="h-6 w-6 border border-border text-muted transition hover:text-accent"
          aria-label={`Sumar ${label}`}
        >
          +
        </button>
      </form>
    </div>
  );
}
