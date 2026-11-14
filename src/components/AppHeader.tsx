import Link from "next/link";
import { logoutAction } from "@/lib/session-actions";
import { NavPrincipal } from "./NavPrincipal";
import { RUTA_COMBATE } from "@/lib/navegacionCombate";

export function AppHeader({
  name,
  role,
  back,
  volverAlCombate = false,
}: {
  name?: string | null;
  role?: "PLAYER" | "MASTER";
  back?: { href: string; label: string };
  // «← Volver al combate» (máster con un combate abierto, lib/navegacionCombate.ts): ocupa el
  // hueco de `back`, destacado. En la cabecera porque ya es fija y no tapa nada; ring y no borde
  // para no cambiarle la altura (las barras pegadas debajo cuentan con top-[49px]).
  volverAlCombate?: boolean;
}) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
      {volverAlCombate ? (
        <Link
          href={RUTA_COMBATE}
          aria-label="Volver al combate"
          className="shrink-0 whitespace-nowrap rounded-sm px-1.5 text-sm font-semibold text-accent ring-1 ring-accent/60 transition hover:bg-accent/10"
        >
          {/* En móvil la cabecera va justa (nombre, tres enlaces y Salir): el texto corto. */}
          <span className="sm:hidden">← Combate</span>
          <span className="hidden sm:inline">← Volver al combate</span>
        </Link>
      ) : back ? (
        <Link href={back.href} className="text-sm text-zinc-400">
          ‹ {back.label}
        </Link>
      ) : (
        // Cabecera bifurcada (fase 6b, diseño del panel de máster, 2026-09-11):
        // "Nueva Era Master" en vez de un badge aparte junto al nombre — el
        // badge "MÁSTER" que había antes duplicaba la misma información.
        // Sin rol (páginas estáticas como el manual) se va a "/", que redirige según el rol.
        <Link href={role ? "/characters" : "/"} className="text-base font-bold tracking-tight">
          Nueva Era{role === "MASTER" && <span className="text-accent"> Master</span>}
        </Link>
      )}
      <div className="flex items-center gap-3">
        <NavPrincipal name={name} role={role} />
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
