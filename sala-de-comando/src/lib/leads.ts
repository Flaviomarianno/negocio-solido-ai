export const LEAD_STAGES = [
  "novo",
  "em_qualificacao",
  "qualificado",
  "desqualificado",
  "diagnostico_agendado",
  "diagnostico_pago",
  "diagnostico_realizado",
  "proposta_enviada",
  "venda_ganha",
  "venda_perdida",
] as const;

export type LeadStage = (typeof LEAD_STAGES)[number];

export const STAGE_LABELS: Record<LeadStage, string> = {
  novo: "Novo",
  em_qualificacao: "Em qualificação",
  qualificado: "Qualificado",
  desqualificado: "Desqualificado",
  diagnostico_agendado: "Diagnóstico agendado",
  diagnostico_pago: "Diagnóstico pago",
  diagnostico_realizado: "Diagnóstico realizado",
  proposta_enviada: "Proposta enviada",
  venda_ganha: "Venda ganha",
  venda_perdida: "Venda perdida",
};

export const STAGE_STYLES: Record<LeadStage, string> = {
  novo: "bg-gray-500/15 text-gray-300 border-gray-500/40",
  em_qualificacao: "bg-yellow-500/15 text-yellow-300 border-yellow-500/40",
  qualificado: "bg-blue-500/15 text-blue-300 border-blue-500/40",
  desqualificado: "bg-red-500/15 text-red-300 border-red-500/40",
  diagnostico_agendado: "bg-purple-500/15 text-purple-300 border-purple-500/40",
  diagnostico_pago: "bg-purple-500/15 text-purple-300 border-purple-500/40",
  diagnostico_realizado: "bg-indigo-500/15 text-indigo-300 border-indigo-500/40",
  proposta_enviada: "bg-orange-500/15 text-orange-300 border-orange-500/40",
  venda_ganha: "bg-green-500/15 text-green-300 border-green-500/40",
  venda_perdida: "bg-red-500/15 text-red-300 border-red-500/40",
};

export function isLeadStage(value: string): value is LeadStage {
  return (LEAD_STAGES as readonly string[]).includes(value);
}

// source_channel não tem CHECK constraint no schema — estes são os valores
// convencionados (ver supabase/schema.sql), mas o dado real pode variar.
export const SOURCE_CHANNEL_LABELS: Record<string, string> = {
  ig_comment: "Comentário IG",
  ig_story: "Resposta a Story",
  ig_dm: "DM Instagram",
  whatsapp_ad: "Anúncio WhatsApp",
  vsl: "VSL",
  indicacao: "Indicação",
  evento: "Evento",
  pagina_diagnostico: "Página do diagnóstico",
};

export const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  email: "E-mail",
};

export const DIRECTION_LABELS: Record<string, string> = {
  inbound: "Recebida",
  outbound: "Enviada",
};

export const PAYMENT_FLAG_LABELS: Record<string, string> = {
  ok: "OK",
  sem_limite_cartao: "Sem limite no cartão",
};

export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}
