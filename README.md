# Sprint 0 — Negócio Sólido AI

Pacote de arranque do projeto. Contém o arquivo de contexto para o Claude Code,
o schema completo do banco e os documentos de regras que os agentes seguem.

## O que tem aqui

```
CLAUDE.md                     ← contexto que o Claude Code lê em toda sessão
supabase/schema.sql           ← schema completo (agentes, CRM, financeiro, conteúdo, RAG)
docs/gatilhos-inbound.md      ← regras dos 6 gatilhos de início de conversa
docs/compliance-checklist.md  ← checklist que todo criativo passa antes de publicar
.env.example                  ← modelo das variáveis de ambiente
```

## Passo a passo (você faz isto, uma vez, antes de eu continuar)

### 1. Criar o repositório
```bash
mkdir negocio-solido-ai && cd negocio-solido-ai
git init
```
Copie os arquivos deste pacote para a raiz do repositório.

### 2. Criar o projeto no Supabase
1. Acesse supabase.com → New Project.
2. Guarde a **Project URL**, a **anon key** e a **service_role key**
   (Project Settings → API).
3. No SQL Editor do projeto, cole e rode `supabase/schema.sql` inteiro.
4. Confirme que a tabela `agents` tem 21 linhas: `select count(*) from agents;`

### 3. Criar o projeto na Vercel
1. Conecte o repositório GitHub à Vercel (crie o repo no GitHub primeiro,
   `git remote add origin ...` e `git push`).
2. Ainda não faça deploy — vamos gerar o app Next.js no Sprint 1.

### 4. Preencher as variáveis de ambiente
```bash
cp .env.example .env.local
```
Preencha pelo menos `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`. O resto pode
esperar até o sprint em que cada integração entra.

### 5. Instalar o Claude Code (se ainda não tiver)
```bash
npm install -g @anthropic-ai/claude-code
```

### 6. O primeiro comando

Dentro da pasta do projeto, com o `CLAUDE.md` na raiz:

```bash
claude
```

E dentro da sessão do Claude Code, digite:

```
Leia o CLAUDE.md e o supabase/schema.sql deste projeto. Depois, gere a estrutura
inicial de um app Next.js 14 (App Router, TypeScript, Tailwind) chamado
"sala-de-comando", com conexão ao Supabase configurada a partir das variáveis
de ambiente em .env.local. Crie a primeira tela: um dashboard que lista os 21
agentes (tabela `agents`) com nome, squad e nível de autonomia. Siga as regras
da seção 3 e 9 do CLAUDE.md.
```

Isso dá início ao Sprint 1 dentro do próprio Claude Code, já com todo o
contexto do projeto carregado.

## O que enviar antes da Semana 1 terminar

- Metodologia H.E.R.D.E.I.R.O. detalhada, em texto ou documento
- Contrato da mentoria (modelo atual)
- Roteiro do diagnóstico + lista de objeções recorrentes
- 30 a 50 conversas reais de venda (dados pessoais removidos)
- Cases e depoimentos autorizados
- Horários fixos disponíveis para diagnóstico (9 a 11 por semana)
- Regras da exceção de pagamento: entrada mínima, máximo de parcelas no boleto
