import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-center text-3xl font-bold tracking-tight">
          Nueva Era
        </h1>
        <p className="mb-8 text-center text-sm text-zinc-400">
          Fichas de personaje del grupo
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
