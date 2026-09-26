-- Agenda dos diagnósticos pagos. Idempotente.

create table if not exists availability_slots (
  id uuid primary key default uuid_generate_v4(),
  slot_datetime timestamptz not null,
  duration_minutes int not null default 60 check (duration_minutes > 0),
  is_booked boolean not null default false,
  diagnostic_id uuid references diagnostics(id),
  created_at timestamptz not null default now()
);

alter table availability_slots enable row level security;
-- Sem policies de propósito: acesso só via service_role no backend.

-- Não cadastrar dois horários no mesmo instante.
create unique index if not exists availability_slots_datetime_key
  on availability_slots (slot_datetime);

-- Um diagnóstico ocupa no máximo um horário (protege contra reserva dupla).
create unique index if not exists availability_slots_diagnostic_key
  on availability_slots (diagnostic_id)
  where diagnostic_id is not null;

-- Consulta da página pública: horários livres em ordem de data.
create index if not exists idx_availability_slots_open
  on availability_slots (slot_datetime)
  where is_booked = false;
