import "server-only";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

// Vercel/proxy sempre preenchem x-forwarded-for; sem ele, não dá pra
// diferenciar visitantes — melhor negar do que deixar um "desconhecido"
// coletivo estourar o limite de todo mundo.
export async function getClientIp(): Promise<string | null> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return h.get("x-real-ip");
}

// Guarda no Supabase (não em memória): funções serverless da Vercel não
// compartilham memória entre instâncias, então um limitador em memória não
// protegeria nada em produção.
export async function checkRateLimit(
  scope: string,
  ip: string,
  limit: number,
  windowMinutes: number,
): Promise<boolean> {
  const supabase = createAdminClient();
  const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

  const { count, error } = await supabase
    .from("rate_limit_hits")
    .select("id", { count: "exact", head: true })
    .eq("scope", scope)
    .eq("ip", ip)
    .gte("created_at", since);

  // Se o limitador falhar, não é motivo para travar o formulário inteiro.
  if (error) {
    console.error(`[rate-limit] falha ao consultar (${scope}):`, error.message);
    return true;
  }
  if ((count ?? 0) >= limit) return false;

  await supabase.from("rate_limit_hits").insert({ scope, ip });
  return true;
}
