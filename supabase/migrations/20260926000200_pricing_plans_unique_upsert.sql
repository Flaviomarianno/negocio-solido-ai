-- Garante unicidade (method, max_installments), faz upsert dos 8 planos exatos
-- e desativa (sem apagar) qualquer plano fora da lista. Idempotente.

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

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'mentoria_pricing_plans_method_installments_key'
  ) then
    alter table mentoria_pricing_plans
      add constraint mentoria_pricing_plans_method_installments_key
      unique (method, max_installments);
  end if;
end $$;

insert into mentoria_pricing_plans (method, max_installments, discount_amount, total_price, is_active)
values
  ('pix',            1,  5500.00, 20000.00, true),
  ('cartao',         1,  4500.00, 21000.00, true),
  ('cartao',         2,  4000.00, 21500.00, true),
  ('cartao',         3,  3500.00, 22000.00, true),
  ('cartao',         6,  2500.00, 23000.00, true),
  ('cartao',        12,  1500.00, 24000.00, true),
  ('pix_automatico',12,   500.00, 25000.00, true),
  ('boleto',        12,     0.00, 25500.00, true)
on conflict (method, max_installments) do update
  set discount_amount = excluded.discount_amount,
      total_price     = excluded.total_price,
      is_active       = true;

update mentoria_pricing_plans
set is_active = false
where (method, max_installments) not in (
  ('pix', 1), ('cartao', 1), ('cartao', 2), ('cartao', 3), ('cartao', 6),
  ('cartao', 12), ('pix_automatico', 12), ('boleto', 12)
);

alter table payments drop constraint if exists payments_method_purpose_rule;
alter table payments
  add constraint payments_method_purpose_rule
  check (method not in ('pix_automatico','boleto') or purpose = 'mentoria');
