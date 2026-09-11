import Link from "next/link";
import { logoutAction } from "@/lib/session-actions";

export function AppHeader({
  name,
  role,
  back,
}: {
  name?: string | null;
  role?: "PLAYER" | "MASTER";
  back?: { href: string; label: string };
}) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
      {back ? (
        <Link href={back.href} className="text-sm text-zinc-400">
          ‹ {back.label}
        </Link>
      ) : (
        // Cabecera bifurcada (fase 6b, diseño del panel de máster, 2026-09-11):
        // "Nueva Era Master" en vez de un badge aparte junto al nombre — el
        // badge "MÁSTER" que había antes duplicaba la misma información.
        <Link href="/characters" className="text-base font-bold tracking-tight">
          Nueva Era{role === "MASTER" && <span className="text-accent"> Master</span>}
        </Link>
      )}
      <div className="flex items-center gap-3">
        {name && <span className="text-sm text-zinc-400">{name}</span>}
        {role === "MASTER" && (
          <Link href="/master" className="text-sm text-zinc-400 underline-offset-4 hover:underline">
            Panel
          </Link>
        )}
        <form action={logoutAction}>
          <button
            type="submit"
            className="text-sm text-zinc-400 underline-offset-4 hover:underline"
          >
            Salir
          </button>
        </form>
      </div>
    </header>
  );
}
