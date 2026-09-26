import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  LEAD_STAGES,
  STAGE_LABELS,
  STAGE_STYLES,
  SOURCE_CHANNEL_LABELS,
  CHANNEL_LABELS,
  DIRECTION_LABELS,
  PAYMENT_FLAG_LABELS,
  isLeadStage,
  formatDateTime,
} from "@/lib/leads";
import { updateLeadStage, logInboundInteraction } from "./actions";

type Lead = {
  id: string;
  full_name: string | null;
  phone: string | null;
  instagram_handle: string | null;
  email: string | null;
  company_name: string | null;
  monthly_revenue_range: string | null;
  source_channel: string;
  source_detail: string | null;
  stage: string;
  lead_score: number | null;
  sentiment_summary: string | null;
  assigned_channel: string | null;
  payment_capacity_flag: string | null;
  owner: string | null;
  created_at: string;
  updated_at: string;
};

type LeadInteraction = {
  id: string;
  agent_id: string | null;
  channel: string;
  direction: string;
  message_type: string | null;
  content: string | null;
  requires_approval: boolean | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-foreground/50">{label}</p>
      <p className="text-sm">{value ?? <span className="text-foreground/30">—</span>}</p>
    </div>
  );
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: lead, error } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !lead) {
    notFound();
  }

  const typedLead = lead as Lead;

  const { data: interactions } = await supabase
    .from("lead_interactions")
    .select(
      "id, agent_id, channel, direction, message_type, content, requires_approval, approved_by, approved_at, created_at",
    )
    .eq("lead_id", id)
    .order("created_at", { ascending: false });

  const interactionList = (interactions ?? []) as LeadInteraction[];
  const stage = isLeadStage(typedLead.stage) ? typedLead.stage : null;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/leads" className="text-sm text-foreground/50 hover:text-gold">
          ← Voltar para leads
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">{typedLead.full_name || "Lead sem nome"}</h2>
          <p className="text-sm text-foreground/50">
            {typedLead.phone || typedLead.instagram_handle || "Sem contato registrado"}
          </p>
        </div>
        {stage && (
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${STAGE_STYLES[stage]}`}
          >
            {STAGE_LABELS[stage]}
          </span>
        )}
      </div>

      <div className="rounded-lg border border-gold-dark/40 bg-gold/5 p-4">
        <p className="text-xs uppercase tracking-wide text-gold/80">Leitura de sentimento (Ag11)</p>
        <p className="mt-1 text-sm">
          {typedLead.sentiment_summary || (
            <span className="text-foreground/40">Nenhuma análise de sentimento ainda.</span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-lg border border-white/10 bg-white/5 p-4 sm:grid-cols-3 lg:grid-cols-4">
        <Field label="Telefone" value={typedLead.phone} />
        <Field label="Instagram" value={typedLead.instagram_handle} />
        <Field label="E-mail" value={typedLead.email} />
        <Field label="Empresa" value={typedLead.company_name} />
        <Field label="Faturamento mensal" value={typedLead.monthly_revenue_range} />
        <Field
          label="Canal de origem"
          value={SOURCE_CHANNEL_LABELS[typedLead.source_channel] ?? typedLead.source_channel}
        />
        <Field label="Detalhe da origem" value={typedLead.source_detail} />
        <Field
          label="Canal atribuído"
          value={
            typedLead.assigned_channel
              ? CHANNEL_LABELS[typedLead.assigned_channel] ?? typedLead.assigned_channel
              : null
          }
        />
        <Field
          label="Capacidade de pagamento"
          value={
            typedLead.payment_capacity_flag
              ? PAYMENT_FLAG_LABELS[typedLead.payment_capacity_flag] ?? typedLead.payment_capacity_flag
              : null
          }
        />
        <Field label="Responsável" value={typedLead.owner} />
        <Field label="Lead score" value={typedLead.lead_score ?? 0} />
        <Field label="Criado em" value={formatDateTime(typedLead.created_at)} />
        <Field label="Atualizado em" value={formatDateTime(typedLead.updated_at)} />
      </div>

      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <p className="mb-2 text-xs uppercase tracking-wide text-foreground/50">Mudar estágio manualmente</p>
        <form action={updateLeadStage} className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="leadId" value={typedLead.id} />
          <select
            name="stage"
            defaultValue={typedLead.stage}
            className="rounded border border-white/10 bg-black/40 px-3 py-1.5 text-sm outline-none focus:border-gold"
          >
            {LEAD_STAGES.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABELS[s]}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded bg-gold px-4 py-1.5 text-sm font-medium text-black transition hover:bg-gold-light"
          >
            Atualizar estágio
          </button>
        </form>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <p className="mb-2 text-xs uppercase tracking-wide text-foreground/50">
          Registrar interação recebida
        </p>
        <p className="mb-3 text-xs text-foreground/40">
          Ainda não há webhook do WhatsApp/Instagram conectado — use isto pra simular uma mensagem
          recebida do lead. Isso dispara a análise de sentimento (Ag11) e um rascunho de resposta
          (Ag09/Ag10) que cai na fila de aprovação.
        </p>
        <form action={logInboundInteraction} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="leadId" value={typedLead.id} />
          <div>
            <label className="mb-1 block text-xs text-foreground/50">Canal</label>
            <select
              name="channel"
              defaultValue="whatsapp"
              className="rounded border border-white/10 bg-black/40 px-3 py-1.5 text-sm outline-none focus:border-gold"
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="instagram">Instagram</option>
              <option value="email">E-mail</option>
            </select>
          </div>
          <div className="min-w-[240px] flex-1">
            <label className="mb-1 block text-xs text-foreground/50">Mensagem recebida</label>
            <input
              type="text"
              name="content"
              required
              className="w-full rounded border border-white/10 bg-black/40 px-3 py-1.5 text-sm outline-none focus:border-gold"
            />
          </div>
          <button
            type="submit"
            className="rounded bg-gold px-4 py-1.5 text-sm font-medium text-black transition hover:bg-gold-light"
          >
            Registrar
          </button>
        </form>
      </div>

      <div>
        <h3 className="mb-3 text-lg font-semibold">Histórico de interações</h3>
        {interactionList.length === 0 ? (
          <p className="text-sm text-foreground/40">Nenhuma interação registrada ainda.</p>
        ) : (
          <ol className="space-y-3 border-l border-white/10 pl-4">
            {interactionList.map((interaction) => (
              <li key={interaction.id} className="relative rounded-lg border border-white/10 bg-white/5 p-3">
                <span className="absolute -left-[21px] top-4 h-2 w-2 rounded-full bg-gold" />
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-foreground/50">
                  <span>
                    {CHANNEL_LABELS[interaction.channel] ?? interaction.channel} ·{" "}
                    {DIRECTION_LABELS[interaction.direction] ?? interaction.direction}
                    {interaction.message_type ? ` · ${interaction.message_type}` : ""}
                  </span>
                  <span>{formatDateTime(interaction.created_at)}</span>
                </div>
                {interaction.content && <p className="mt-2 text-sm">{interaction.content}</p>}
                {interaction.requires_approval && (
                  <p className="mt-2 text-xs text-yellow-300">
                    {interaction.approved_by
                      ? `Aprovado por ${interaction.approved_by}${
                          interaction.approved_at ? ` em ${formatDateTime(interaction.approved_at)}` : ""
                        }`
                      : "Aguardando aprovação"}
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
