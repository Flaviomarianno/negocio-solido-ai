# Gatilhos de início de conversa (inbound only)

> Referência para Ag09, Ag10, Ag12, Ag13 e Ag20. Nenhum agente inicia conversa —
> todos reagem a um destes seis gatilhos, dentro das janelas de tempo da Meta.

## Janelas de tempo (Meta) — não são configuráveis, são regra da plataforma

- **Comentário → resposta privada:** até 7 dias após o comentário. Um único envio.
- **Resposta do lead à mensagem privada → conversa livre:** 24 horas a partir da
  resposta dele. Cada nova mensagem dele reabre 24h.
- **Sem resposta do lead dentro da janela:** o agente não pode mais escrever.
  Fica marcado como "aguardando lead" no CRM, sem novas tentativas automáticas.

## Os 6 gatilhos

1. **Palavra-chave em Reels** — CTA no vídeo pedindo para comentar uma palavra
   específica (ex: "DIAGNÓSTICO"). Webhook de comentário aciona o Ag09.
2. **Raio-X do Dono Preso** — quiz de 2 minutos, entrega diagnóstico personalizado
   pelo WhatsApp. Maior gerador de leads qualificados.
3. **Stories interativos** — caixa de pergunta, enquete, figurinha de reação.
   Qualquer resposta é uma mensagem inbound válida.
4. **Anúncio click-to-WhatsApp / click-to-Direct** — o clique no anúncio já conta
   como o lead iniciando a conversa; mensagem pré-preenchida.
5. **VSL com CTA de conversa** — botão da página abre WhatsApp com mensagem pronta.
6. **Evento ao vivo / indicação** — palavra-chave em live, QR Code de indicação
   entre alunos.

## O que NUNCA fazer

- Disparo em massa via número não oficial de WhatsApp.
- Mensagem automática para quem nunca interagiu com o perfil.
- Reabrir conversa fora da janela de 24h sem novo gatilho do lead.
- Usar número pessoal do Flávio para automação.
