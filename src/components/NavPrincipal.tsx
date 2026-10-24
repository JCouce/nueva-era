"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Rol = "PLAYER" | "MASTER";
type Cuenta = { name?: string | null; role?: Rol };

// Las páginas estáticas (el manual) no conocen la cuenta al renderizar: la pide a la sesión.
function useCuenta(servidor: Cuenta): Cuenta {
  const [cuenta, setCuenta] = useState(servidor);
  const conocida = Boolean(servidor.role);
  useEffect(() => {
    if (conocida) return;
    let vivo = true;
    fetch("/api/auth/session")
      .then((r) => (r.ok ? r.json() : null))
      .then((s: { user?: Cuenta } | null) => {
        if (vivo && s?.user) setCuenta({ name: s.user.name, role: s.user.role });
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [conocida]);
  return cuenta;
}

export function NavPrincipal({ name, role }: Cuenta) {
  const cuenta = useCuenta({ name, role });
  const ruta = usePathname();
  const enlaces = [
    { href: "/manual", label: "Manual" },
    { href: "/characters", label: "Personajes" },
    ...(cuenta.role === "MASTER" ? [{ href: "/master", label: "Panel" }] : []),
  ];

  return (
    <>
      {cuenta.name && (
        <span className="max-w-24 truncate border-r border-border pr-3 font-mono text-xs uppercase tracking-wide text-info sm:max-w-none">
          {cuenta.name}
        </span>
      )}
      {enlaces.map(({ href, label }) => {
        const activo = ruta === href || ruta.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={activo ? "page" : undefined}
            className={`text-sm underline-offset-4 hover:underline ${activo ? "text-accent" : "text-zinc-400"}`}
          >
            {label}
          </Link>
        );
      })}
    </>
  );
}
