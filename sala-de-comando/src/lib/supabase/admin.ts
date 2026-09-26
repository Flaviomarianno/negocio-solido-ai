import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service role key — acesso total, ignora RLS. Nunca importar este arquivo
// a partir de um Client Component: o pacote "server-only" quebra o build
// se isso acontecer. Ver CLAUDE.md seção 3 (regra 5) e 9 (RLS).
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
