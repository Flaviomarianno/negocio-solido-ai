import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  LEAD_STAGES,
  STAGE_LABELS,
  STAGE_STYLES,
  SOURCE_CHANNEL_LABELS,
  isLeadStage,
  formatDateTime,
} from "@/lib/leads";

type Lead = {
  id: string;
  full_name: string | null;
  phone: string | null;
  instagram_handle: string | null;
  source_channel: string;
  stage: string;
  lead_score: number | null;
  created_at: string;
};

type SearchParams = {
  stage?: string;
  source_channel?: string;
  min_score?: string;
  sort?: string;
};

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const stageFilter = params.stage && isLeadStage(params.stage) ? params.stage : undefined;
  const sourceChannelFilter = params.source_channel || undefined;
  const minScore = params.min_score ? Number(params.min_score) : undefined;
  const sort = params.sort === "asc" ? "asc" : "desc";

  const supabase = createAdminClient();

  let query = supabase
    .from("leads")
    .select("id, full_name, phone, instagram_handle, source_channel, stage, lead_score, created_at");

  if (stageFilter) {
    query = query.eq("stage", stageFilter);
  }
  if (sourceChannelFilter) {
    query = query.eq("source_channel", sourceChannelFilter);
  }
  if (minScore !== undefined && !Number.isNaN(minScore)) {
    query = query.gte("lead_score", minScore);
  }

  const { data: leads, error } = await query
    .order("created_at", { ascending: sort === "asc" })
    .limit(200);

  const { data: channelRows } = await supabase.from("leads").select("source_channel");
  const availableChannels = Array.from(
    new Set((channelRows ?? []).map((row) => row.source_channel).filter(Boolean)),
  ).sort();

  const leadList = (leads ?? []) as Lead[];

  const toggledSort = sort === "asc" ? "desc" : "asc";
  const sortLinkParams = new URLSearchParams();
  if (stageFilter) sortLinkParams.set("stage", stageFilter);
  if (sourceChannelFilter) sortLinkParams.set("source_channel", sourceChannelFilter);
  if (params.min_score) sortLinkParams.set("min_score", params.min_score);
  sortLinkParams.set("sort", toggledSort);

  const hasFilters = Boolean(stageFilter || sourceChannelFilter || params.min_score);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Leads</h2>
        <p className="text-sm text-foreground/50">
          {leadList.length} leads exibidos
          {error ? " · falha ao carregar a lista" : ""}
        </p>
      </div>

      <form
        method="GET"
        className="flex flex-wrap items-end gap-4 rounded-lg border border-white/10 bg-white/5 p-4"
      >
        <div>
          <label className="mb-1 block text-xs text-foreground/50">Estágio</label>
          <select
            name="stage"
            defaultValue={stageFilter ?? ""}
            className="rounded border border-white/10 bg-black/40 px-3 py-1.5 text-sm outline-none focus:border-gold"
          >
            <option value="">Todos</option>
            {LEAD_STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {STAGE_LABELS[stage]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs text-foreground/50">Canal</label>
          <select
            name="source_channel"
            defaultValue={sourceChannelFilter ?? ""}
            className="rounded border border-white/10 bg-black/40 px-3 py-1.5 text-sm outline-none focus:border-gold"
          >
            <option value="">Todos</option>
            {availableChannels.map((channel) => (
              <option key={channel} value={channel}>
                {SOURCE_CHANNEL_LABELS[channel] ?? channel}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs text-foreground/50">Score mínimo</label>
          <input
            type="number"
            name="min_score"
            defaultValue={params.min_score ?? ""}
            className="w-24 rounded border border-white/10 bg-black/40 px-3 py-1.5 text-sm outline-none focus:border-gold"
          />
        </div>

        <input type="hidden" name="sort" value={sort} />

        <button
          type="submit"
          className="rounded bg-gold px-4 py-1.5 text-sm font-medium text-black transition hover:bg-gold-light"
        >
          Filtrar
        </button>

        {hasFilters && (
          <Link href="/dashboard/leads" className="text-sm text-foreground/50 hover:text-gold">
            Limpar filtros
          </Link>
        )}
      </form>

      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-wide text-foreground/50">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Contato</th>
              <th className="px-4 py-3">Canal</th>
              <th className="px-4 py-3">Estágio</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">
                <Link href={`/dashboard/leads?${sortLinkParams.toString()}`} className="hover:text-gold">
                  Criado em {sort === "asc" ? "▲" : "▼"}
                </Link>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {leadList.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-foreground/40">
                  Nenhum lead encontrado.
                </td>
              </tr>
            )}
            {leadList.map((lead) => {
              const stage = isLeadStage(lead.stage) ? lead.stage : null;
              return (
                <tr key={lead.id} className="hover:bg-white/[0.03]">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/leads/${lead.id}`} className="hover:text-gold">
                      {lead.full_name || "Sem nome"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-foreground/70">
                    {lead.phone || lead.instagram_handle || "—"}
                  </td>
                  <td className="px-4 py-3 text-foreground/70">
                    {SOURCE_CHANNEL_LABELS[lead.source_channel] ?? lead.source_channel}
                  </td>
                  <td className="px-4 py-3">
                    {stage ? (
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STAGE_STYLES[stage]}`}
                      >
                        {STAGE_LABELS[stage]}
                      </span>
                    ) : (
                      lead.stage
                    )}
                  </td>
                  <td className="px-4 py-3 text-foreground/70">{lead.lead_score ?? 0}</td>
                  <td className="px-4 py-3 text-foreground/70">{formatDateTime(lead.created_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
