import { LoginForm } from "./LoginForm";
import { HudCard } from "@/components/HudCard";

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.3em] text-info">
            {"// acceso al sistema"}
          </p>
          <h1 className="text-glitch font-display text-4xl font-bold uppercase tracking-wide">
            Nueva Era
          </h1>
          <p className="mt-1 font-mono text-xs text-muted">
            Fichas de personaje del grupo
          </p>
        </div>
        <HudCard className="p-5">
          <LoginForm />
        </HudCard>
      </div>
    </main>
  );
}
