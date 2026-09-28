-- Limite de tentativas por IP em endpoints públicos (ex.: /diagnostico).
-- Genérica (coluna scope) para servir outros endpoints públicos no futuro.
-- Idempotente.

create table if not exists rate_limit_hits (
  id uuid primary key default uuid_generate_v4(),
  scope text not null,
  ip text not null,
  created_at timestamptz not null default now()
);

alter table rate_limit_hits enable row level security;
-- Sem policies de propósito: acesso só via service_role no backend.

create index if not exists idx_rate_limit_hits_lookup
  on rate_limit_hits (scope, ip, created_at);

-- Sem limpeza automática ainda: para uma tabela que só recebe alguns
-- registros por tentativa de formulário, isso pode esperar um cron job
-- futuro (ex.: apagar linhas com mais de 1 dia).
