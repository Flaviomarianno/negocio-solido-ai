import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";

// Preço por 1M tokens, usado só pra estimar agent_runs.cost_usd (auditoria).
const PRICING_PER_MTOK: Record<string, { input: number; output: number }> = {
  "claude-sonnet-5": { input: 2, output: 10 },
  "claude-haiku-4-5": { input: 1, output: 5 },
};

function estimateCostUsd(model: string, inputTokens: number, outputTokens: number) {
  const pricing = PRICING_PER_MTOK[model];
  if (!pricing) return null;
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
}

type AgentRow = {
  id: string;
  code: string;
  name: string;
  claude_model: string;
  current_prompt_version: number;
  is_active: boolean;
};

type RunAgentInput = {
  leadId?: string;
  userMessage: string;
  maxTokens?: number;
  effort?: "low" | "medium" | "high";
  extraOutput?: Record<string, unknown>;
};

type RunAgentResult = {
  text: string;
  agentRunId: string;
};

export async function loadAgent(code: string): Promise<AgentRow> {
  const supabase = createAdminClient();
  const { data: agent, error } = await supabase
    .from("agents")
    .select("id, code, name, claude_model, current_prompt_version, is_active")
    .eq("code", code)
    .single();

  if (error || !agent) {
    throw new Error(`Agente ${code} não encontrado: ${error?.message}`);
  }
  if (!agent.is_active) {
    throw new Error(`Agente ${code} está inativo.`);
  }
  return agent as AgentRow;
}

async function loadPrompt(agentId: string, version: number): Promise<string> {
  const supabase = createAdminClient();
  const { data: promptRow, error } = await supabase
    .from("agent_prompt_versions")
    .select("prompt_text")
    .eq("agent_id", agentId)
    .eq("version", version)
    .single();

  if (error || !promptRow) {
    throw new Error(`Prompt v${version} do agente ${agentId} não encontrado: ${error?.message}`);
  }
  return promptRow.prompt_text as string;
}

export async function runAgent(
  agent: AgentRow,
  input: RunAgentInput,
): Promise<RunAgentResult> {
  const supabase = createAdminClient();
  const systemPrompt = await loadPrompt(agent.id, agent.current_prompt_version);

  const client = new Anthropic();
  const startedAt = Date.now();

  let text = "";
  let status: "success" | "error" | "needs_approval" = "success";
  let tokensInput: number | null = null;
  let tokensOutput: number | null = null;
  let errorMessage: string | null = null;

  try {
    const response = await client.messages.create({
      model: agent.claude_model,
      max_tokens: input.maxTokens ?? 1024,
      system: systemPrompt,
      output_config: { effort: input.effort ?? "medium" },
      messages: [{ role: "user", content: input.userMessage }],
    });

    text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    tokensInput = response.usage.input_tokens;
    tokensOutput = response.usage.output_tokens;
  } catch (err) {
    status = "error";
    errorMessage = err instanceof Error ? err.message : String(err);
  }

  const latencyMs = Date.now() - startedAt;
  const costUsd =
    tokensInput !== null && tokensOutput !== null
      ? estimateCostUsd(agent.claude_model, tokensInput, tokensOutput)
      : null;

  const { data: runRow, error: runError } = await supabase
    .from("agent_runs")
    .insert({
      agent_id: agent.id,
      lead_id: input.leadId ?? null,
      input: { user_message: input.userMessage },
      output: errorMessage ? { error: errorMessage } : { text, ...input.extraOutput },
      status,
      tokens_input: tokensInput,
      tokens_output: tokensOutput,
      cost_usd: costUsd,
      latency_ms: latencyMs,
    })
    .select("id")
    .single();

  if (runError || !runRow) {
    throw new Error(`Falha ao registrar agent_run: ${runError?.message}`);
  }

  if (status === "error") {
    throw new Error(`Agente ${agent.code} falhou: ${errorMessage}`);
  }

  return { text, agentRunId: runRow.id as string };
}

export async function setAgentRunStatus(
  agentRunId: string,
  status: "success" | "error" | "needs_approval" | "rejected",
) {
  const supabase = createAdminClient();
  await supabase.from("agent_runs").update({ status }).eq("id", agentRunId);
}

export async function markAgentRunOutput(agentRunId: string, extraOutput: Record<string, unknown>) {
  const supabase = createAdminClient();
  const { data: current } = await supabase
    .from("agent_runs")
    .select("output")
    .eq("id", agentRunId)
    .single();

  await supabase
    .from("agent_runs")
    .update({ output: { ...(current?.output ?? {}), ...extraOutput } })
    .eq("id", agentRunId);
}

export async function updateAgentRunStatus(interactionId: string, status: "success" | "rejected") {
  const supabase = createAdminClient();
  await supabase
    .from("agent_runs")
    .update({ status })
    .eq("output->>interaction_id", interactionId);
}
