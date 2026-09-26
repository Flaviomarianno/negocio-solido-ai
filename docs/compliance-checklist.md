# Checklist de compliance — Ag13 / Ag15

> Todo criativo (`content_pieces`) muda de status para `em_compliance` antes de
> `aprovado_final`. Reprova automaticamente se encontrar qualquer item abaixo.

## Reprova sempre

- [ ] Promessa de resultado financeiro específico ("fature R$ X em Y dias")
- [ ] Antes/depois financeiro (prints de saldo, faturamento)
- [ ] Afirmação sobre a vida pessoal do espectador ("você está falido",
      "você é escravo do seu negócio")
- [ ] Depoimento sem autorização por escrito arquivada
- [ ] Escassez falsa (contador fictício, "últimas vagas" sem lastro real)
- [ ] Linguagem de urgência agressiva sem base real
- [ ] Qualquer termo da lista de restrição de finanças/cursos da Meta vigente
      (revisar periodicamente — políticas mudam)

## Aprova quando

- [ ] Fala do método e do processo, não de resultado garantido
- [ ] Usa perguntas para engajar, não afirmações sobre a vida do espectador
- [ ] Cases com dados reais e autorização documentada
- [ ] Tom consistente com a voz do Flávio (validado pelo Ag15)
- [ ] CTA claro e honesto sobre o que a pessoa vai receber

## Registro obrigatório

Toda análise grava em `content_pieces.compliance_notes` o motivo da aprovação
ou reprovação, e quem revisou (`reviewed_by`). Nada sobe sem esse registro.
