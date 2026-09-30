import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = {
  title: "Descubra o que te prende no seu negócio — Negócio Sólido",
};

// Busca o roteiro/vídeo mais recente a cada requisição — sem isso o Next
// pré-renderiza a página uma vez no build e nunca mais reflete um roteiro
// novo em content_pieces.
export const dynamic = "force-dynamic";

function renderScript(script: string) {
  return script
    .split(/\n\n+/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block, i) => {
      if (block.startsWith("## ")) {
        return (
          <h2 key={i} className="mb-2 mt-6 text-lg font-semibold text-gold first:mt-0">
            {block.replace(/^##\s*/, "")}
          </h2>
        );
      }
      return (
        <p key={i} className="mb-4 text-sm leading-relaxed text-foreground/80">
          {block}
        </p>
      );
    });
}

export default async function VslPage() {
  const supabase = createAdminClient();
  const { data: piece } = await supabase
    .from("content_pieces")
    .select("script_or_copy, asset_url")
    .eq("content_type", "vsl_script")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-12">
      <h1 className="mb-6 text-2xl font-semibold text-gold">
        Descubra o que está te prendendo no seu próprio negócio
      </h1>

      {/*
        Placeholder de vídeo. A URL final entra em content_pieces.asset_url
        quando o avatar (HeyGen) for gravado — próximo passo, ainda não
        implementado. Enquanto asset_url for null, mostramos este aviso.
      */}
      <div className="mb-8 flex aspect-video items-center justify-center rounded-lg border border-white/10 bg-white/5 px-6 text-center text-sm text-foreground/40">
        {piece?.asset_url ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video src={piece.asset_url} controls className="h-full w-full rounded-lg" />
        ) : (
          "Vídeo em produção — avatar (HeyGen) ainda não gravado"
        )}
      </div>

      {piece?.script_or_copy ? (
        <div>{renderScript(piece.script_or_copy)}</div>
      ) : (
        <p className="text-sm text-foreground/40">Roteiro ainda não gerado.</p>
      )}

      <div className="mt-10 text-center">
        <Link
          href="/diagnostico"
          className="inline-block rounded bg-gold px-6 py-3 text-sm font-medium text-black transition hover:bg-gold-light"
        >
          Agendar meu diagnóstico estratégico
        </Link>
      </div>
    </main>
  );
}
