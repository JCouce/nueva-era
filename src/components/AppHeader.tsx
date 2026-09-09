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
        <Link href="/characters" className="text-base font-bold tracking-tight">
          Nueva Era
        </Link>
      )}
      <div className="flex items-center gap-3">
        {name && (
          <span className="text-sm text-zinc-400">
            {name}
            {role === "MASTER" && (
              <span className="ml-1 rounded bg-accent px-1.5 py-0.5 text-xs font-semibold text-black">
                MÁSTER
              </span>
            )}
          </span>
        )}
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
