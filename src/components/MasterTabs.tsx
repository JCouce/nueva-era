"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Fase 6b, diseño del panel de máster (2026-09-11): tres rutas server ya
// separadas (/master, /master/combate, /master/npcs) presentadas como tabs
// horizontales, mismo lenguaje visual que los tabs de CharacterSheet.tsx —
// pero de navegación real, no de estado de cliente: cada una es su propio
// RSC con su propio fetch, así que esto es solo el selector, no un switch.
const TABS = [
  { href: "/master", label: "Jugadores" },
  { href: "/master/combate", label: "Combate" },
  { href: "/master/npcs", label: "NPC" },
] as const;

export function MasterTabs() {
  const pathname = usePathname();

  return (
    <nav className="mb-4 flex gap-1 border-b border-border">
      {TABS.map((t) => {
        // "/master" a secas necesita match exacto (si no, "Jugadores"
        // seguiría activo dentro de /master/combate, que también empieza
        // por "/master"); las otras dos sí usan prefijo, para que
        // /master/npcs/[id] deje "NPC" resaltado.
        const active = t.href === "/master" ? pathname === "/master" : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`-mb-px border-b-2 px-3 py-2 font-display text-sm font-semibold uppercase tracking-wide ${
              active ? "border-accent text-foreground" : "border-transparent text-muted"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
