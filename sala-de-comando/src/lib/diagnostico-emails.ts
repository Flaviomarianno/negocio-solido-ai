import "server-only";
import { escapeHtml, sendEmail } from "@/lib/email";
import { slotLong } from "@/lib/agenda";

type LeadContact = {
  name: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
};

function log(label: string, result: Awaited<ReturnType<typeof sendEmail>>) {
  if (result.ok) console.log(`[email] ${label}: enviado (${result.id})`);
  else console.error(`[email] ${label}: FALHOU — ${result.error}`);
}

// Sempre a partir de APP_URL — nunca um localhost fixo, porque o link vai
// dentro de um e-mail e precisa abrir em qualquer dispositivo.
export function agendarUrl(paymentId: string): string | null {
  const appUrl = process.env.APP_URL;
  if (!appUrl) return null;
  return `${appUrl.replace(/\/$/, "")}/diagnostico/agendar?p=${paymentId}`;
}

// Pagamento confirmado -> link para escolher o horário (é o caminho de quem
// pagou no cartão, que não volta sozinho do checkout do Asaas).
export async function sendPaymentConfirmedEmail(lead: LeadContact, paymentId: string) {
  if (!lead.email) return;
  const name = lead.name?.split(" ")[0] ?? "";
  const url = agendarUrl(paymentId);
  if (!url) {
    console.error("[email] pagamento confirmado -> lead: FALHOU — APP_URL não configurada.");
    return;
  }

  const result = await sendEmail({
    to: [lead.email],
    subject: "Pagamento confirmado — escolha o horário do seu diagnóstico",
    text: `Olá${name ? `, ${name}` : ""}! Recebemos o pagamento da sua reunião de diagnóstico estratégico.\n\nEscolha o melhor dia e horário aqui: ${url}\n\nNegócio Sólido`,
    html: `<p>Olá${name ? `, ${escapeHtml(name)}` : ""}!</p>
<p>Recebemos o pagamento da sua reunião de diagnóstico estratégico.</p>
<p><a href="${escapeHtml(url)}">Clique aqui para escolher o dia e o horário</a>.</p>
<p>Negócio Sólido</p>`,
  });
  log("pagamento confirmado -> lead", result);
}

export async function sendBookingEmails(input: {
  lead: LeadContact;
  startIso: string;
  durationMinutes: number;
}) {
  const { lead, startIso, durationMinutes } = input;
  const when = slotLong(startIso);
  const name = lead.name ?? "Lead sem nome";
  const first = lead.name?.split(" ")[0] ?? "";

  if (lead.email) {
    const result = await sendEmail({
      to: [lead.email],
      subject: `Diagnóstico agendado — ${when}`,
      text: `Olá${first ? `, ${first}` : ""}! Sua reunião de diagnóstico estratégico está agendada para ${when} (horário de Brasília), com duração de ${durationMinutes} minutos.\n\nNegócio Sólido`,
      html: `<p>Olá${first ? `, ${escapeHtml(first)}` : ""}!</p>
<p>Sua reunião de diagnóstico estratégico está agendada:</p>
<p><strong>${escapeHtml(when)}</strong> (horário de Brasília)<br>Duração: ${durationMinutes} minutos</p>
<p>Negócio Sólido</p>`,
    });
    log("agendamento -> lead", result);
  }

  const owner = process.env.DIAGNOSTICO_NOTIFY_EMAIL;
  if (owner) {
    const phone = lead.phone ?? "—";
    const whatsapp = lead.whatsapp ?? "—";
    const result = await sendEmail({
      to: [owner],
      subject: `Novo diagnóstico agendado — ${name} — ${when}`,
      text: `Diagnóstico agendado.\n\nQuando: ${when} (Brasília) · ${durationMinutes} min\nLead: ${name}\nTelefone: ${phone}\nWhatsApp: ${whatsapp}\nE-mail: ${lead.email ?? "—"}`,
      html: `<p><strong>Novo diagnóstico agendado</strong></p>
<p>Quando: ${escapeHtml(when)} (Brasília) · ${durationMinutes} min</p>
<p>Lead: ${escapeHtml(name)}<br>Telefone: ${escapeHtml(phone)}<br>WhatsApp: ${escapeHtml(whatsapp)}<br>E-mail: ${escapeHtml(lead.email ?? "—")}</p>`,
    });
    log("agendamento -> Flávio", result);
  }
}
