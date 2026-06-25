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
      className="mt-2 w-full rounded-lg bg-accent px-4 py-3 text-base font-semibold text-black transition active:scale-[0.99] disabled:opacity-60"
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
          className="rounded-lg border border-border bg-card px-4 py-3 text-base outline-none focus:border-accent"
        />
      )}
      <input
        name="email"
        type="email"
        required
        placeholder="Email"
        autoComplete="email"
        className="rounded-lg border border-border bg-card px-4 py-3 text-base outline-none focus:border-accent"
      />
      <input
        name="password"
        type="password"
        required
        minLength={6}
        placeholder="Contraseña"
        autoComplete={mode === "login" ? "current-password" : "new-password"}
        className="rounded-lg border border-border bg-card px-4 py-3 text-base outline-none focus:border-accent"
      />

      {state?.error && (
        <p className="text-sm text-red-400">{state.error}</p>
      )}

      <SubmitButton label={mode === "login" ? "Entrar" : "Crear cuenta"} />

      <button
        type="button"
        onClick={() => setMode(mode === "login" ? "register" : "login")}
        className="mt-2 text-center text-sm text-zinc-400 underline-offset-4 hover:underline"
      >
        {mode === "login"
          ? "¿No tienes cuenta? Regístrate"
          : "¿Ya tienes cuenta? Entra"}
      </button>
    </form>
  );
}
