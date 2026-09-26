"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError("E-mail ou senha inválidos.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-6 rounded-lg border border-gold-dark/30 bg-black/40 p-8"
      >
        <div>
          <h1 className="text-2xl font-semibold text-gold">Sala de Comando</h1>
          <p className="mt-1 text-sm text-foreground/60">
            Negócio Sólido AI — acesso restrito.
          </p>
        </div>

        {error && (
          <p className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm text-foreground/80">
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-gold"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm text-foreground/80">
            Senha
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-gold"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-gold px-4 py-2 text-sm font-medium text-black transition hover:bg-gold-light disabled:opacity-50"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
