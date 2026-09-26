-- =====================================================================
-- NEGÓCIO SÓLIDO AI — SCHEMA INICIAL (Sprint 0 / Sprint 1)
-- Rode este arquivo no SQL Editor do Supabase (projeto novo) ou via
-- `supabase db push` depois de colocá-lo em supabase/migrations/.
-- =====================================================================

create extension if not exists "uuid-ossp";
create extension if not exists vector;

-- =====================================================================
-- 1. AGENTES — definição, prompt versionado e nível de autonomia
-- =====================================================================

create table agents (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,              -- 'ag01', 'ag02', ... 'ag21'
  name text not null,
  squad text not null,                    -- 'estrategia_funil' | 'conteudo_organico' | ...
  autonomy_level text not null default 'N0'
    check (autonomy_level in ('N0','N1','N2','N3')),
  current_prompt_version int not null default 1,
  claude_model text not null default 'claude-sonnet-4-6',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table agent_prompt_versions (
  id uuid primary key default uuid_generate_v4(),
  agent_id uuid not null references agents(id) on delete cascade,
  version int not null,
  prompt_text text not null,
  changelog text,
  created_by text not null default 'ag08', -- quem editou: 'ag08' ou 'flavio'
  created_at timestamptz not null default now(),
  unique (agent_id, version)
);

create table agent_promotions (
  id uuid primary key default uuid_generate_v4(),
  agent_id uuid not null references agents(id) on delete cascade,
  from_level text not null,
  to_level text not null,
  approved_by text not null default 'flavio',
  reason text,
  created_at timestamptz not null default now()
);

-- Toda execução de agente é logada aqui — base da auditoria e dos custos
create table agent_runs (
  id uuid primary key default uuid_generate_v4(),
  agent_id uuid not null references agents(id),
  lead_id uuid,                            -- preenchido quando aplicável (fk abaixo)
  input jsonb,
  output jsonb,
  status text not null default 'success'
    check (status in ('success','error','needs_approval','rejected')),
  tokens_input int,
  tokens_output int,
  cost_usd numeric(10,4),
  latency_ms int,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- 2. CRM — leads, interações, scoring
-- =====================================================================

create table leads (
  id uuid primary key default uuid_generate_v4(),
  full_name text,
  phone text,
  instagram_handle text,
  email text,
  company_name text,
  monthly_revenue_range text,             -- ex: '100k-300k', '300k-1M', '1M+'
  source_channel text not null,           -- 'ig_comment' | 'ig_story' | 'ig_dm' | 'whatsapp_ad' | 'vsl' | 'indicacao' | 'evento'
  source_detail text,                     -- id do post, nome da campanha, etc.
  stage text not null default 'novo'
    check (stage in (
      'novo','em_qualificacao','qualificado','desqualificado',
      'diagnostico_agendado','diagnostico_pago','diagnostico_realizado',
      'proposta_enviada','venda_ganha','venda_perdida'
    )),
  lead_score int default 0,               -- calculado pelo Ag14
  sentiment_summary text,                 -- último resumo do Ag11
  assigned_channel text,                  -- 'whatsapp' | 'instagram_dm' | 'messenger'
  payment_capacity_flag text,             -- sinal do Ag11: 'ok' | 'sem_limite_cartao' | null
  owner text default 'sistema',           -- 'sistema' ou 'flavio' quando ele assume
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table lead_interactions (
  id uuid primary key default uuid_generate_v4(),
  lead_id uuid not null references leads(id) on delete cascade,
  agent_id uuid references agents(id),
  channel text not null,                  -- 'whatsapp' | 'instagram' | 'email'
  direction text not null check (direction in ('inbound','outbound')),
  message_type text,                      -- 'text' | 'template' | 'private_reply' | 'media'
  content text,
  requires_approval boolean default false,
  approved_by text,                       -- null até aprovar; 'flavio' quando aprovado
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

-- fk tardia (agent_runs.lead_id -> leads.id), criada aqui por ordem de dependência
alter table agent_runs
  add constraint agent_runs_lead_fk foreign key (lead_id) references leads(id);

-- =====================================================================
-- 3. FUNIL — diagnósticos e agenda
-- =====================================================================

create table diagnostics (
  id uuid primary key default uuid_generate_v4(),
  lead_id uuid not null references leads(id) on delete cascade,
  scheduled_at timestamptz,
  status text not null default 'agendado'
    check (status in ('agendado','pago','realizado','no_show','cancelado')),
  payment_id uuid,                        -- fk para payments (definida abaixo)
  pre_call_dossier jsonb,                 -- gerado pelo Ag11 antes da reunião
  outcome text check (outcome in ('venda_ganha','venda_perdida','follow_up', null)),
  outcome_notes text,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- 4. FINANCEIRO — pagamentos, parcelas, exceções
-- =====================================================================

create table payments (
  id uuid primary key default uuid_generate_v4(),
  lead_id uuid not null references leads(id),
  diagnostic_id uuid references diagnostics(id),
  purpose text not null check (purpose in ('diagnostico_97', 'mentoria')),
  method text not null
    check (method in ('pix', 'cartao_12x', 'pix_automatico', 'boleto', 'recorrencia_cartao')),
  is_exception boolean not null default false,   -- true = boleto/recorrência/Pix Automático fora do padrão
  exception_approved_by text,                    -- 'flavio' obrigatório se is_exception = true
  total_contracted numeric(12,2) not null,        -- ex: 28800.00 no 12x
  installments int not null default 1,
  asaas_customer_id text,
  asaas_subscription_id text,
  asaas_charge_id text,
  status text not null default 'pendente'
    check (status in ('pendente','parcial','pago','atrasado','cancelado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exception_needs_approval
    check ( (is_exception = false) or (is_exception = true and exception_approved_by is not null) )
);

alter table diagnostics
  add constraint diagnostics_payment_fk foreign key (payment_id) references payments(id);

create table installments (
  id uuid primary key default uuid_generate_v4(),
  payment_id uuid not null references payments(id) on delete cascade,
  installment_number int not null,
  due_date date not null,
  amount numeric(12,2) not null,
  status text not null default 'pendente'
    check (status in ('pendente','pago','atrasado','cancelado')),
  paid_at timestamptz,
  asaas_charge_id text,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- 5. CONTEÚDO — pipeline de criativos e compliance
-- =====================================================================

create table content_pieces (
  id uuid primary key default uuid_generate_v4(),
  created_by_agent_id uuid references agents(id),
  content_type text not null
    check (content_type in ('reel_conversao','reel_organico','post_unico','carrossel','vsl_script','vsl_video')),
  purpose text not null check (purpose in ('organico','pago')),
  status text not null default 'rascunho'
    check (status in ('rascunho','em_revisao_ag15','aprovado_voz','em_compliance','reprovado_compliance','aprovado_final','publicado')),
  script_or_copy text,
  asset_url text,
  compliance_notes text,
  reviewed_by text,                       -- 'ag15' | 'ag13' | 'flavio'
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================================================================
-- 6. BASE DE CONHECIMENTO (RAG) — metodologia, objeções, cases
-- =====================================================================

create table knowledge_base (
  id uuid primary key default uuid_generate_v4(),
  category text not null,   -- 'metodologia' | 'objecao' | 'case' | 'contrato' | 'script_diagnostico'
  title text not null,
  content text not null,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

-- =====================================================================
-- 7. MÉTRICAS DIÁRIAS (snapshot para o painel do Ag21)
-- =====================================================================

create table daily_metrics (
  id uuid primary key default uuid_generate_v4(),
  metric_date date not null unique,
  new_leads int default 0,
  diagnostics_scheduled int default 0,
  diagnostics_completed int default 0,
  sales_won int default 0,
  total_contracted numeric(12,2) default 0,
  total_cash_received numeric(12,2) default 0,
  total_receivable numeric(12,2) default 0,
  ad_spend numeric(12,2) default 0,
  ai_cost_usd numeric(12,2) default 0,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- 8. ÍNDICES
-- =====================================================================

create index idx_leads_stage on leads(stage);
create index idx_leads_source on leads(source_channel);
create index idx_lead_interactions_lead on lead_interactions(lead_id);
create index idx_agent_runs_agent on agent_runs(agent_id);
create index idx_agent_runs_lead on agent_runs(lead_id);
create index idx_payments_lead on payments(lead_id);
create index idx_installments_payment on installments(payment_id);
create index idx_installments_due on installments(due_date) where status = 'pendente';
create index idx_content_status on content_pieces(status);

-- =====================================================================
-- 9. ROW LEVEL SECURITY — ativado em tudo, acesso só via service role
-- (o painel Next.js usa a service role no backend; nenhuma tabela
-- fica aberta ao anon key além do estritamente necessário)
-- =====================================================================

alter table agents enable row level security;
alter table agent_prompt_versions enable row level security;
alter table agent_promotions enable row level security;
alter table agent_runs enable row level security;
alter table leads enable row level security;
alter table lead_interactions enable row level security;
alter table diagnostics enable row level security;
alter table payments enable row level security;
alter table installments enable row level security;
alter table content_pieces enable row level security;
alter table knowledge_base enable row level security;
alter table daily_metrics enable row level security;

-- Nenhuma policy de leitura pública é criada aqui de propósito.
-- Acesso do painel: exclusivamente via service_role key no backend (Server Actions
-- / Route Handlers), nunca exposta ao cliente. Ajustar policies específicas
-- quando (e se) houver necessidade de acesso client-side autenticado.

-- =====================================================================
-- 10. SEED — os 21 agentes + gerente de operações
-- =====================================================================

insert into agents (code, name, squad) values
  ('ag01', 'Criador de conteúdo', 'conteudo_organico'),
  ('ag02', 'Roteirista Reels/Stories — conversão', 'conversao_anuncios'),
  ('ag03', 'Roteirista Reels/Stories — orgânico', 'conteudo_organico'),
  ('ag04', 'Designer post único — conversão', 'conversao_anuncios'),
  ('ag05', 'Designer post único — orgânico', 'conteudo_organico'),
  ('ag06', 'Designer carrossel — conversão', 'conversao_anuncios'),
  ('ag07', 'Designer carrossel — orgânico', 'conteudo_organico'),
  ('ag08', 'Engenheiro de prompt (Claude)', 'nucleo'),
  ('ag09', 'Social selling', 'comercial'),
  ('ag10', 'SDR', 'comercial'),
  ('ag11', 'Analista comercial — leitura de sentimento', 'comercial'),
  ('ag12', 'Estrategista Instagram — orgânico', 'estrategia_funil'),
  ('ag13', 'Estrategista Instagram — pago', 'estrategia_funil'),
  ('ag14', 'Analista comercial — canal e abordagem', 'comercial'),
  ('ag15', 'Clone de Flávio Moreira', 'nucleo'),
  ('ag16', 'Criador de conteúdo — VSL', 'conversao_anuncios'),
  ('ag17', 'Roteirista de VSL', 'conversao_anuncios'),
  ('ag18', 'Avatar (clone visual/voz)', 'conversao_anuncios'),
  ('ag19', 'Operador de CRM + financeiro', 'comercial'),
  ('ag20', 'Estrategista de funil de vendas', 'estrategia_funil'),
  ('ag21', 'Gerente de operações (COO)', 'nucleo');
