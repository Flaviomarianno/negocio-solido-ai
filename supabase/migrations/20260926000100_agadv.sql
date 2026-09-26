-- Novo agente AgADV (jurídico / contratos). Nasce em N0 (default da coluna).
-- Idempotente: só insere se ainda não existir.
insert into agents (code, name, squad, claude_model)
select 'agadv', 'AgADV — Jurídico / contratos', 'juridico', 'claude-sonnet-5'
where not exists (select 1 from agents where code = 'agadv');
