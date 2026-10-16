"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Navegación común del máster: rutas server separadas presentadas como pestañas. Es
// navegación real, no estado de cliente: cada una es su propio RSC con su fetch. Desde
// E1c, /master es la Mesa (centro de mando) y la lista de fichas vive en /master/fichas.
const TABS = [
  { href: "/master", label: "Mesa" },
  { href: "/master/combate", label: "Combate" },
  { href: "/master/fichas", label: "Fichas" },
  { href: "/master/npcs", label: "NPCs" },
] as const;

export function MasterTabs({ className = "mb-4" }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Panel del máster" className={`flex gap-1 overflow-x-auto border-b border-border ${className}`}>
      {TABS.map((t) => {
        // "/master" a secas necesita match exacto (todas las demás empiezan por
        // "/master"); el resto usa prefijo, para que /master/npcs/[id] deje "NPCs" activo.
        const active = t.href === "/master" ? pathname === "/master" : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px flex min-h-11 shrink-0 items-center border-b-2 px-3 font-display text-sm font-semibold uppercase tracking-wide outline-none focus-visible:ring-2 focus-visible:ring-info ${
              active ? "border-accent text-foreground" : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
