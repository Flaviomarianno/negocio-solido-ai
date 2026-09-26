-- =====================================================================
-- Preço da mentoria por forma de pagamento + regra de método x finalidade
-- Preço cheio: R$ 25.500,00. Idempotente: pode ser rodada mais de uma vez.
-- =====================================================================

-- 1. Tabela de planos ----------------------------------------------------

create table if not exists mentoria_pricing_plans (
  id uuid primary key default uuid_generate_v4(),
  method text not null
    check (method in ('pix','cartao','pix_automatico','boleto')),
  max_installments int not null,
  discount_amount numeric(12,2) not null,
  total_price numeric(12,2) not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table mentoria_pricing_plans enable row level security;
-- Sem policies de propósito: acesso só via service_role no backend.

insert into mentoria_pricing_plans (method, max_installments, discount_amount, total_price)
select v.method, v.max_installments, v.discount_amount, v.total_price
from (values
  ('pix',            1,  5500.00, 20000.00),
  ('cartao',         1,  4500.00, 21000.00),
  ('cartao',         2,  4000.00, 21500.00),
  ('cartao',         3,  3500.00, 22000.00),
  ('cartao',         6,  2500.00, 23000.00),
  ('cartao',        12,  1500.00, 24000.00),
  ('pix_automatico',12,   500.00, 25000.00),
  ('boleto',        12,     0.00, 25500.00)
) as v(method, max_installments, discount_amount, total_price)
where not exists (select 1 from mentoria_pricing_plans);

-- 2. payments: pix_automatico e boleto só para a mentoria ----------------

alter table payments drop constraint if exists payments_method_purpose_rule;
alter table payments
  add constraint payments_method_purpose_rule
  check (method not in ('pix_automatico','boleto') or purpose = 'mentoria');

-- 3. agents: contatos opcionais ------------------------------------------

alter table agents add column if not exists contact_whatsapp text;
alter table agents add column if not exists contact_email text;
