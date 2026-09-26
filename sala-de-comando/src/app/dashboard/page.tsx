import { createAdminClient } from "@/lib/supabase/admin";

type AutonomyLevel = "N0" | "N1" | "N2" | "N3";

type Agent = {
  id: string;
  code: string;
  name: string;
  squad: string;
  autonomy_level: AutonomyLevel;
  is_active: boolean;
};

type AgentRun = {
  agent_id: string;
  status: string;
  created_at: string;
};

const SQUAD_LABELS: Record<string, string> = {
  conteudo_organico: "Conteúdo Orgânico",
  conversao_anuncios: "Conversão/Anúncios",
  comercial: "Comercial",
  estrategia_funil: "Estratégia & Funil",
  nucleo: "Núcleo",
  juridico: "Jurídico",
};

// N0 cinza, N1 amarelo, N2 azul, N3 verde — CLAUDE.md seção 6.
const AUTONOMY_STYLES: Record<AutonomyLevel, string> = {
  N0: "bg-gray-500/15 text-gray-300 border-gray-500/40",
  N1: "bg-yellow-500/15 text-yellow-300 border-yellow-500/40",
  N2: "bg-blue-500/15 text-blue-300 border-blue-500/40",
  N3: "bg-green-500/15 text-green-300 border-green-500/40",
};

const AUTONOMY_LABELS: Record<AutonomyLevel, string> = {
  N0: "N0 — Sombra",
  N1: "N1 — Aprovação",
  N2: "N2 — Autônomo c/ limites",
  N3: "N3 — Pleno",
};

const RUN_STATUS_LABELS: Record<string, string> = {
  success: "Sucesso",
  error: "Erro",
  needs_approval: "Aguardando aprovação",
  rejected: "Rejeitado",
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

export default async function DashboardPage() {
  const supabase = createAdminClient();

  const [{ data: agents, error: agentsError }, { data: runs, error: runsError }] =
    await Promise.all([
      supabase
        .from("agents")
        .select("id, code, name, squad, autonomy_level, is_active")
        .order("code"),
      supabase
        .from("agent_runs")
        .select("agent_id, status, created_at")
        .order("created_at", { ascending: false }),
    ]);

  if (agentsError) {
    throw new Error(`Falha ao carregar agentes: ${agentsError.message}`);
  }

  const lastRunByAgent = new Map<string, AgentRun>();
  for (const run of (runs ?? []) as AgentRun[]) {
    if (!lastRunByAgent.has(run.agent_id)) {
      lastRunByAgent.set(run.agent_id, run);
    }
  }

  const agentList = (agents ?? []) as Agent[];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Agentes</h2>
        <p className="text-sm text-foreground/50">
          {agentList.length} agentes cadastrados
          {runsError ? " · não foi possível carregar as últimas execuções" : ""}
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-wide text-foreground/50">
            <tr>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Squad</th>
              <th className="px-4 py-3">Autonomia</th>
              <th className="px-4 py-3">Última execução</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {agentList.map((agent) => {
              const lastRun = lastRunByAgent.get(agent.id);
              return (
                <tr key={agent.id} className="hover:bg-white/[0.03]">
                  <td className="px-4 py-3 font-mono text-xs text-foreground/60">
                    {agent.code}
                  </td>
                  <td className="px-4 py-3">
                    {agent.name}
                    {!agent.is_active && (
                      <span className="ml-2 text-xs text-foreground/40">(inativo)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-foreground/70">
                    {SQUAD_LABELS[agent.squad] ?? agent.squad}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${AUTONOMY_STYLES[agent.autonomy_level]}`}
                    >
                      {AUTONOMY_LABELS[agent.autonomy_level]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-foreground/70">
                    {lastRun ? (
                      <span>
                        {formatDate(lastRun.created_at)}{" "}
                        <span className="text-foreground/40">
                          ({RUN_STATUS_LABELS[lastRun.status] ?? lastRun.status})
                        </span>
                      </span>
                    ) : (
                      <span className="text-foreground/30">Nunca executado</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
