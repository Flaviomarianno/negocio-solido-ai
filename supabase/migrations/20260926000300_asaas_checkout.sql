-- Checkout do diagnóstico R$ 97 (Asaas). Idempotente.

-- 1. payments.method passa a aceitar 'cartao' (cartão à vista).
--    O CHECK original tem nome automático; localizamos e trocamos.
do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'payments'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%cartao_12x%'
  loop
    execute format('alter table payments drop constraint %I', c.conname);
  end loop;
end $$;

alter table payments drop constraint if exists payments_method_check;
alter table payments
  add constraint payments_method_check
  check (method in ('pix','cartao','cartao_12x','pix_automatico','boleto','recorrencia_cartao'));

-- 2. Uma cobrança Asaas corresponde a no máximo um pagamento (idempotência do webhook).
create unique index if not exists payments_asaas_charge_id_key
  on payments (asaas_charge_id)
  where asaas_charge_id is not null;

-- 3. WhatsApp do lead (o formulário /diagnostico coleta telefone e WhatsApp).
alter table leads add column if not exists whatsapp text;
