import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { CHANNEL_LABELS, formatDateTime } from "@/lib/leads";
import { approveInteraction, rejectInteraction } from "./actions";

type PendingInteraction = {
  id: string;
  channel: string;
  content: string | null;
  created_at: string;
  leads: { id: string; full_name: string | null } | null;
  agents: { code: string; name: string } | null;
};

export default async function ApprovalsPage() {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("lead_interactions")
    .select("id, channel, content, created_at, leads(id, full_name), agents(code, name)")
    .eq("requires_approval", true)
    .is("approved_by", null)
    .order("created_at", { ascending: true });

  const pending = (data ?? []) as unknown as PendingInteraction[];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Fila de aprovação</h2>
        <p className="text-sm text-foreground/50">
          {pending.length} rascunhos aguardando revisão
          {error ? " · falha ao carregar a fila" : ""}
        </p>
        <p className="mt-1 text-xs text-foreground/40">
          Aprovar aqui só registra a aprovação no CRM — o envio de verdade pelo WhatsApp/Instagram
          ainda não está conectado (Sprint 4/5).
        </p>
      </div>

      {pending.length === 0 ? (
        <p className="text-sm text-foreground/40">Nenhum rascunho pendente.</p>
      ) : (
        <ul className="space-y-3">
          {pending.map((interaction) => (
            <li key={interaction.id} className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-foreground/50">
                <span>
                  <Link
                    href={`/dashboard/leads/${interaction.leads?.id}`}
                    className="font-medium text-foreground hover:text-gold"
                  >
                    {interaction.leads?.full_name || "Lead sem nome"}
                  </Link>
                  {" · "}
                  {interaction.agents ? `${interaction.agents.code} · ${interaction.agents.name}` : "—"}
                  {" · "}
                  {CHANNEL_LABELS[interaction.channel] ?? interaction.channel}
                </span>
                <span>{formatDateTime(interaction.created_at)}</span>
              </div>

              <p className="mt-3 rounded border border-white/10 bg-black/30 p-3 text-sm">
                {interaction.content}
              </p>

              <div className="mt-3 flex gap-3">
                <form action={approveInteraction}>
                  <input type="hidden" name="interactionId" value={interaction.id} />
                  <button
                    type="submit"
                    className="rounded bg-gold px-4 py-1.5 text-sm font-medium text-black transition hover:bg-gold-light"
                  >
                    Aprovar
                  </button>
                </form>
                <form action={rejectInteraction}>
                  <input type="hidden" name="interactionId" value={interaction.id} />
                  <button
                    type="submit"
                    className="rounded border border-red-500/40 px-4 py-1.5 text-sm text-red-300 transition hover:bg-red-500/10"
                  >
                    Rejeitar
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
