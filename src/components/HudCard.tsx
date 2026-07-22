import type { ReactNode } from "react";

// Superficie HUD reutilizable: esquinas cortadas + borde + fondo. Base visual
// compartida entre la lista de personajes y la ficha para mantener coherencia.
export function HudCard({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`clip-chamfer border border-border bg-surface ${className}`}>
      {children}
    </div>
  );
}
