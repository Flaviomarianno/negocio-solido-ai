import "server-only";
import { NonRetriableError } from "inngest";
import { inngest, type LeadInteractionCreatedData } from "./client";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadAgent, runAgent, markAgentRunOutput, setAgentRunStatus } from "@/lib/agents/engine";
import { CHANNEL_LABELS, DIRECTION_LABELS } from "@/lib/leads";

type LeadRow = {
  id: string;
  full_name: string | null;
  company_name: string | null;
  monthly_revenue_range: string | null;
  source_channel: string;
  source_detail: string | null;
  stage: string;
};

type InteractionRow = {
  id: string;
  channel: string;
  direction: string;
  content: string | null;
  created_at: string;
};

async function loadLeadContext(leadId: string) {
  const supabase = createAdminClient();

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id, full_name, company_name, monthly_revenue_range, source_channel, source_detail, stage")
    .eq("id", leadId)
    .single();

  if (leadError || !lead) {
    throw new NonRetriableError(`Lead ${leadId} não encontrado: ${leadError?.message}`);
  }

  const { data: interactions } = await supabase
    .from("lead_interactions")
    .select("id, channel, direction, content, created_at")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: true })
    .limit(30);

  return {
    lead: lead as LeadRow,
    interactions: (interactions ?? []) as InteractionRow[],
  };
}

function formatConversation(interactions: InteractionRow[]) {
  if (interactions.length === 0) return "(sem histórico ainda)";
  return interactions
    .map((interaction) => {
      const channel = CHANNEL_LABELS[interaction.channel] ?? interaction.channel;
      const direction = DIRECTION_LABELS[interaction.direction] ?? interaction.direction;
      return `[${channel} · ${direction}] ${interaction.content ?? "(sem conteúdo)"}`;
    })
    .join("\n");
}

export const analyzeLeadSentiment = inngest.createFunction(
  { id: "analyze-lead-sentiment", triggers: [{ event: "leads/interaction.created" }] },
  async ({ event, step }) => {
    const { leadId } = event.data as LeadInteractionCreatedData;

    const { lead, interactions } = await step.run("load-context", () => loadLeadContext(leadId));

    const agent = await step.run("load-agent", () => loadAgent("ag11"));

    const userMessage = [
      `Lead: ${lead.full_name ?? "sem nome"} · Empresa: ${lead.company_name ?? "não informado"}`,
      `Faturamento: ${lead.monthly_revenue_range ?? "não informado"} · Estágio: ${lead.stage}`,
      "",
      "Conversa até agora:",
      formatConversation(interactions),
    ].join("\n");

    const { text, agentRunId } = await step.run("call-claude", () =>
      runAgent(agent, { leadId, userMessage, effort: "low", maxTokens: 400 }),
    );

    const summaryMatch = text.match(/SENTIMENT_SUMMARY:\s*([\s\S]*?)(?:\nPAYMENT_CAPACITY_FLAG:|$)/i);
    const flagMatch = text.match(/PAYMENT_CAPACITY_FLAG:\s*(ok|sem_limite_cartao|indeterminado)/i);

    const sentimentSummary = summaryMatch?.[1]?.trim() || text.trim();
    const flagRaw = flagMatch?.[1]?.toLowerCase();
    const paymentCapacityFlag = flagRaw === "ok" || flagRaw === "sem_limite_cartao" ? flagRaw : null;

    await step.run("save-sentiment", async () => {
      const supabase = createAdminClient();
      await supabase
        .from("leads")
        .update({
          sentiment_summary: sentimentSummary,
          payment_capacity_flag: paymentCapacityFlag,
          updated_at: new Date().toISOString(),
        })
        .eq("id", leadId);
    });

    await markAgentRunOutput(agentRunId, { lead_id: leadId, parsed_flag: paymentCapacityFlag });

    return { leadId, sentimentSummary, paymentCapacityFlag };
  },
);

export const draftLeadReply = inngest.createFunction(
  { id: "draft-lead-reply", triggers: [{ event: "leads/interaction.created" }] },
  async ({ event, step }) => {
    const { leadId, interactionId, direction } = event.data as LeadInteractionCreatedData;

    if (direction !== "inbound") {
      return { skipped: true, reason: "not-inbound" };
    }

    const { lead, interactions } = await step.run("load-context", () => loadLeadContext(leadId));

    const triggeringInteraction = interactions.find((i) => i.id === interactionId);
    const hasPriorOutbound = interactions.some(
      (i) => i.direction === "outbound" && i.id !== interactionId,
    );
    const agentCode = hasPriorOutbound ? "ag10" : "ag09";

    const agent = await step.run("load-agent", () => loadAgent(agentCode));

    const userMessage = [
      `Lead: ${lead.full_name ?? "sem nome"} · Empresa: ${lead.company_name ?? "não informado"}`,
      `Canal de origem: ${lead.source_channel}${lead.source_detail ? ` (${lead.source_detail})` : ""}`,
      `Estágio atual: ${lead.stage}`,
      "",
      "Conversa até agora (a última mensagem é a que você precisa responder):",
      formatConversation(interactions),
      "",
      "Escreva a próxima mensagem, só o texto da mensagem, sem comentários seus.",
    ].join("\n");

    const { text, agentRunId } = await step.run("call-claude", () =>
      runAgent(agent, { leadId, userMessage, effort: "medium", maxTokens: 500 }),
    );

    const draftInteraction = await step.run("insert-draft-interaction", async () => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("lead_interactions")
        .insert({
          lead_id: leadId,
          agent_id: agent.id,
          channel: triggeringInteraction?.channel ?? "whatsapp",
          direction: "outbound",
          message_type: "text",
          content: text,
          requires_approval: true,
        })
        .select("id")
        .single();

      if (error || !data) {
        throw new Error(`Falha ao inserir rascunho: ${error?.message}`);
      }
      return data as { id: string };
    });

    await markAgentRunOutput(agentRunId, { interaction_id: draftInteraction.id, lead_id: leadId });
    await setAgentRunStatus(agentRunId, "needs_approval");

    return { leadId, agentCode, draftInteractionId: draftInteraction.id };
  },
);
