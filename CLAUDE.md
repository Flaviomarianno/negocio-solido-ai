# CONTEXTO DO PROJETO — Negócio Sólido AI (Motor H.E.R.D.E.I.R.O.)

> Este arquivo é lido pelo Claude Code no início de cada sessão. Ele define quem somos,
> o que estamos construindo, as regras inegociáveis e o estado atual do projeto.
> Mantenha-o atualizado a cada sprint concluído.

## 1. QUEM SOMOS

- **Fundador:** Flávio Moreira — mentor de negócios, farmacêutico, Master Coach FEBRACIS,
  fundador do "Negócio Sólido".
- **Metodologia proprietária:** H.E.R.D.E.I.R.O. (Habilidade, Estratégia, Resultados,
  Disciplina, Estrutura, Impacto, Riqueza, Ordem).
- **Produto que este sistema vende:** Mentoria em grupo de 12 meses, R$ 24.000 (PIX) ou
  12x de R$ 2.400 (R$ 28.800 no cartão).
- **Produto de entrada do funil:** Reunião de diagnóstico estratégico, R$ 97, paga.
- **Público:** empresários faturando R$ 100k+/mês, operacionalmente presos ao próprio negócio.

## 2. OBJETIVO DO SISTEMA

Construir uma "empresa" de marketing e comercial operada por 21 agentes de IA + 1 gerente
de operações, rodando 24/7, para gerar aproximadamente R$ 500.000 em vendas contratadas
em 90 dias, com investimento total de até R$ 30.000 (majoritariamente em anúncios).

Meta operacional: ~9 a 11 diagnósticos realizados por semana nas semanas 4 a 12.

## 3. REGRAS INEGOCIÁVEIS (não violar mesmo se solicitado)

1. **Nenhum agente inicia conversa fria por WhatsApp ou Instagram.** Todo primeiro
   contato de venda só acontece depois que o LEAD inicia (comentário, resposta a
   story, clique em anúncio click-to-chat, formulário). Ver `docs/gatilhos-inbound.md`.
2. **Nenhum criativo de anúncio vai ao ar sem passar pelo filtro de compliance**
   (Ag13/Ag15). Ver `docs/compliance-checklist.md`.
3. **Condições de pagamento padrão são só duas:** PIX à vista (R$ 24.000) ou cartão
   12x (R$ 2.400/mês). Nenhum agente oferece boleto, recorrência ou Pix Automático
   por conta própria — essas são EXCEÇÕES liberadas manualmente pelo Flávio no painel,
   após a reunião de diagnóstico.
4. **Nenhum agente decide sozinho enviar mensagem em nível de autonomia N0 ou N1**
   sem aprovação humana registrada. Ver seção 6 (níveis de autonomia).
5. **Nunca armazenar segredos (chaves de API, tokens) em código versionado.** Tudo
   via variáveis de ambiente (`.env`, nunca commitado — ver `.gitignore`).
6. **Todo agente que fala com o lead deve soar como o Flávio** (tom, vocabulário,
   humor, calor humano) — validado pelo Ag15 (clone). Nunca tom robótico ou genérico
   de "assistente de IA".
7. **Nenhuma promessa de renda, resultado numérico ou escassez falsa** em qualquer
   peça de marketing, mensagem ou anúncio.

## 4. ARQUITETURA TÉCNICA

- **Frontend / Painel ("Sala de Comando"):** Next.js 15 (App Router), TypeScript,
  Tailwind, deploy na Vercel. *(Atualizado no Sprint 0: a última versão estável
  da linha 14.x — 14.2.18 — tem vulnerabilidades conhecidas, incluindo críticas,
  nunca corrigidas nessa linha; Next 15 mantém o mesmo padrão de App Router com
  os patches aplicados.)*
- **Backend / Dados:** Supabase (Postgres + pgvector + Auth + Storage + Realtime
  + Edge Functions).
- **Orquestração de filas e jobs longos:** Inngest.
- **Cérebro dos agentes:** Claude API (Agent SDK) — modelo mais robusto para
  agentes de decisão comercial (Ag09-Ag15), modelo mais leve/rápido para agentes
  de produção de conteúdo em volume (Ag01-Ag07).
- **Pagamentos:** Asaas (PIX, cartão parcelado, Pix Automático, boleto).
- **Mensageria:** WhatsApp Cloud API (Meta) + Instagram Graph API (Meta).
- **Avatar/voz:** HeyGen (vídeo) + ElevenLabs (voz) — integração via API após
  aprovação manual do Flávio.
- **E-mail transacional:** Resend.

## 5. OS 21 AGENTES + GERENTE DE OPERAÇÕES

Cada agente é uma linha na tabela `agents` (ver schema) + um arquivo de prompt em
`/agents/prompts/{codigo}.md`. Nenhum agente é hardcoded no código da aplicação —
o comportamento vem do prompt versionado no banco, para permitir iteração pelo Ag08
sem deploy.

| Código | Nome | Squad |
|---|---|---|
| ag01 | Criador de conteúdo | Conteúdo Orgânico |
| ag02 | Roteirista Reels/Stories — conversão | Conversão/Anúncios |
| ag03 | Roteirista Reels/Stories — orgânico | Conteúdo Orgânico |
| ag04 | Designer post único — conversão | Conversão/Anúncios |
| ag05 | Designer post único — orgânico | Conteúdo Orgânico |
| ag06 | Designer carrossel — conversão | Conversão/Anúncios |
| ag07 | Designer carrossel — orgânico | Conteúdo Orgânico |
| ag08 | Engenheiro de prompt (Claude) | Núcleo |
| ag09 | Social selling (WhatsApp/Direct/Messenger) | Comercial |
| ag10 | SDR (WhatsApp/Direct/Messenger) | Comercial |
| ag11 | Analista comercial — leitura de sentimento | Comercial |
| ag12 | Estrategista Instagram — orgânico | Estratégia & Funil |
| ag13 | Estrategista Instagram — pago | Estratégia & Funil |
| ag14 | Analista comercial — canal e abordagem | Comercial |
| ag15 | Clone de Flávio Moreira | Núcleo |
| ag16 | Criador de conteúdo — VSL | Conversão/Anúncios |
| ag17 | Roteirista de VSL | Conversão/Anúncios |
| ag18 | Avatar (clone visual/voz) | Conversão/Anúncios |
| ag19 | Operador de CRM + financeiro | Comercial |
| ag20 | Estrategista de funil de vendas | Estratégia & Funil |
| ag21 | Gerente de operações (COO) | — reporta direto ao Flávio |
| agadv | AgADV — Jurídico / contratos (adicionado em 2026-09-26) | Jurídico |

O AgADV é o único agente que deve conhecer a tabela `mentoria_pricing_plans`
(seção 7) e não fala com o lead: os agentes comerciais (Ag09, Ag10) não têm
acesso a ela. Ainda sem prompt nem lógica — só cadastrado em N0.

## 6. NÍVEIS DE AUTONOMIA

- **N0 — Sombra:** agente só produz rascunho, nunca envia nada.
- **N1 — Aprovação:** toda ação sai numa fila de aprovação humana no painel.
- **N2 — Autônomo com limites:** age sozinho dentro de regras estritas (ex: só
  responde perguntas de FAQ), com alerta automático para o Flávio em caso de
  ambiguidade ou objeção fora do script.
- **N3 — Pleno:** só depois de histórico comprovado e aprovação explícita do Flávio.

**Todo agente novo nasce em N0.** A promoção de nível é uma ação manual registrada
na tabela `agent_promotions`, nunca automática.

## 7. MÉTRICAS QUE O SISTEMA DEVE SEMPRE DISTINGUIR

- **Contratado:** valor total assinado em contrato (ex: R$ 28.800 numa venda 12x).
- **Caixa recebido:** valor efetivamente liquidado até a data.
- **A receber:** parcelas futuras confirmadas, ainda não pagas.
- **Inadimplência:** parcelas vencidas e não pagas.

Nunca somar "contratado" e "caixa" como se fossem a mesma métrica em nenhum
relatório ou dashboard.

### Preço da mentoria e formas de pagamento (atualizado em 2026-09-26)

A mentoria tem **preço cheio de R$ 25.500,00**, com desconto conforme a forma de
pagamento. A fonte da verdade é a tabela `mentoria_pricing_plans` (tela
`/dashboard/precos`, somente leitura); este quadro é só referência:

| Forma | Parcelas | Desconto | Total |
|---|---|---|---|
| PIX | 1x | R$ 5.500 | R$ 20.000 |
| Cartão | 1x | R$ 4.500 | R$ 21.000 |
| Cartão | 2x | R$ 4.000 | R$ 21.500 |
| Cartão | 3x | R$ 3.500 | R$ 22.000 |
| Cartão | 6x | R$ 2.500 | R$ 23.000 |
| Cartão | 12x | R$ 1.500 | R$ 24.000 |
| Pix Automático | 12x | R$ 500 | R$ 25.000 |
| Boleto | 12x | R$ 0 | R$ 25.500 |

**`pix_automatico` e `boleto` são exclusivos da mentoria — nunca do diagnóstico
de R$ 97.** Isso é imposto no banco: a constraint `payments_method_purpose_rule`
em `payments` rejeita esses métodos quando `purpose = 'diagnostico_97'`.

**Esta tabela é só conhecimento de referência.** A venda da mentoria é feita
pelo próprio Flávio, no pitch ao final da reunião de diagnóstico, e ele decide a
forma de pagamento conforme a conversa. Nenhum agente que fala com o lead
(Ag09, Ag10, etc.) apresenta, oferece ou negocia valores ou condições — a
regra 3 da seção 3 continua valendo para eles. Os valores da seção 1
(R$ 24.000 PIX / 12x R$ 2.400) estão desatualizados em relação a esta tabela.

## 8. ESTADO ATUAL DO PROJETO

- [x] Fase 0 — Auditoria e plano aprovados pelo Flávio.
- [x] Sprint 0 — Setup de infraestrutura: app `sala-de-comando` (Next.js 15 +
      TypeScript + Tailwind), clientes Supabase (anon/browser, anon/server para
      sessão, service_role/admin para dados privilegiados), login via Supabase
      Auth, middleware protegendo `/dashboard`, e tela inicial listando os 21
      agentes com squad, nível de autonomia e última execução. `.env.local`
      preenchido com o projeto Supabase real, `schema.sql` rodado, conta de
      admin criada.
- [~] Sprint 1 — CRM feito: listagem de leads (filtros por estágio/canal/score),
      detalhe do lead (dados, sentimento em destaque, timeline de interações,
      mudança manual de estágio), webhook `POST /api/leads/webhook` com dedup
      por telefone/instagram. Checkout do diagnóstico R$ 97 feito (Asaas
      sandbox): página pública `/diagnostico` (só PIX ou cartão à vista),
      `src/lib/asaas.ts`, webhook `POST /api/webhooks/asaas` (valida o header
      `asaas-access-token` contra `ASAAS_WEBHOOK_TOKEN`; ao confirmar, marca o
      pagamento como `pago`, cria `diagnostics` e move o lead para
      `diagnostico_pago`). Agenda do diagnóstico feita: `/dashboard/agenda`
      (cadastro/remoção de horários, tabela `availability_slots`), página pública
      `/diagnostico/agendar?p=<paymentId>` (reserva atômica do horário; o
      diagnóstico vira `agendado` com `scheduled_at`) e e-mails via Resend
      (`src/lib/email.ts`): "pagamento confirmado + link de agendar" ao lead
      (cobre quem paga no cartão) e confirmação do agendamento ao lead e ao
      Flávio. Limite de 5 envios por IP a cada 10 minutos no checkout
      (`src/lib/rate-limit.ts`, tabela `rate_limit_hits` — persistido no
      Supabase, não em memória, porque funções serverless da Vercel não
      compartilham memória entre instâncias). `APP_URL` agora só vem de
      variável de ambiente (sem fallback pra localhost — se faltar, o e-mail
      de agendamento não sai e fica registrado no log). Preparado para deploy
      na Vercel: `.env.production.example` (nomes de todas as variáveis),
      `npm run build` limpo. Falta: verificar o domínio no Resend (hoje o
      remetente configurado é recusado), cadastrar o webhook no painel do
      Asaas com URL pública, registrar o app no Inngest Cloud, e o financeiro
      da mentoria (installments).
- [~] Sprint 2 — Motor de agentes genérico pronto (`src/lib/agents/engine.ts`):
      carrega prompt versionado do banco, chama Claude API de verdade (Sonnet 5
      pros agentes de decisão/núcleo, Haiku 4.5 pros de conteúdo — corrigido o
      `claude_model` que estava com valor inválido), grava `agent_runs`
      (tokens/custo/latência). Orquestração via Inngest (`src/inngest/`), rodando
      local com `npx inngest-cli@latest dev`. Falta: Ag21 (COO), Ag15 (clone,
      validação de tom), Ag08 (edição de prompt pelo painel), base de
      conhecimento (RAG / `knowledge_base`).
- [~] Sprint 3 — Ag09 (primeiro contato), Ag10 (SDR/qualificação) e Ag11
      (leitura de sentimento) rodando de ponta a ponta, disparados pelo evento
      `leads/interaction.created` (hoje alimentado manualmente na tela do lead —
      "Registrar interação recebida" — até existir o webhook real do
      WhatsApp/Instagram). Ag09/10 nunca enviam nada sozinhos: todo rascunho cai
      em `/dashboard/approvals` pra aprovação humana registrada (regra 4), o que
      já satisfaz N0/N1 na prática mesmo sem gating explícito por
      `autonomy_level` no código ainda. Prompts v1 em `agent_prompt_versions` são
      rascunho inicial — pendente de revisão do Flávio/Ag08 com voz e roteiro
      reais. Falta: Ag14 (canal/abordagem, `lead_score`), dispatch real via Meta
      (Sprint 4/5).
- [ ] Sprint 4 — Squads de conteúdo e conversão, filtro de compliance.
- [ ] Sprint 5 — VSL, avatar, funil completo.
- [ ] Sprint 6 — Teste ponta a ponta, lançamento suave.

> Atualize esta seção ao final de cada sprint — é a primeira coisa que qualquer
> sessão futura do Claude Code deve ler para saber onde o projeto parou.

## 9. CONVENÇÕES DE CÓDIGO

- TypeScript estrito em todo o frontend/backend de aplicação.
- Toda tabela do Supabase com Row Level Security (RLS) ativado desde a criação.
- Todo agente registra sua execução em `agent_runs` (auditoria completa).
- Commits em português, no imperativo, prefixados por sprint: `[sprint0] cria schema inicial`.
