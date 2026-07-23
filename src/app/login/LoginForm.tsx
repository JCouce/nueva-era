"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction, registerAction, type AuthState } from "./actions";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="clip-chamfer mt-2 w-full bg-accent px-4 py-3 font-display text-base font-semibold uppercase tracking-wider text-black shadow-glow-yellow transition active:scale-[0.99] disabled:opacity-60"
    >
      {pending ? "Un momento…" : label}
    </button>
  );
}

export function LoginForm() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const action = mode === "login" ? loginAction : registerAction;
  const [state, formAction] = useActionState<AuthState, FormData>(
    action,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {mode === "register" && (
        <input
          name="name"
          type="text"
          placeholder="Nombre (opcional)"
          autoComplete="name"
          className="clip-chamfer-sm border border-border bg-night px-4 py-3 text-base text-foreground outline-none placeholder:text-muted focus:border-accent"
        />
      )}
      <input
        name="email"
        type="text"
        required
        placeholder="Usuario"
        autoComplete="username"
        className="clip-chamfer-sm border border-border bg-night px-4 py-3 text-base text-foreground outline-none placeholder:text-muted focus:border-accent"
      />
      <input
        name="password"
        type="password"
        required
        placeholder="Contraseña"
        autoComplete={mode === "login" ? "current-password" : "new-password"}
        className="clip-chamfer-sm border border-border bg-night px-4 py-3 text-base text-foreground outline-none placeholder:text-muted focus:border-accent"
      />

      {state?.error && (
        <p className="font-mono text-sm text-danger">// {state.error}</p>
      )}

      <SubmitButton label={mode === "login" ? "Entrar" : "Crear cuenta"} />

      <button
        type="button"
        onClick={() => setMode(mode === "login" ? "register" : "login")}
        className="mt-2 text-center font-mono text-xs uppercase tracking-wide text-muted transition hover:text-info"
      >
        {mode === "login"
          ? "¿No tienes cuenta? Regístrate"
          : "¿Ya tienes cuenta? Entra"}
      </button>
    </form>
  );
}
