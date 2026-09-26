import "server-only";

// Resend via HTTP (sem SDK). Nunca lança: e-mail é efeito colateral e não pode
// derrubar webhook de pagamento nem reserva de horário.
type Message = { to: string[]; subject: string; html: string; text: string };
type SendResult = { ok: true; id: string } | { ok: false; error: string };

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendEmail(message: Message): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    return { ok: false, error: "RESEND_API_KEY / RESEND_FROM_EMAIL não configuradas." };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: from.includes("<") ? from : `Negócio Sólido <${from}>`,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    });
    const json = (await response.json().catch(() => null)) as
      | { id?: string; message?: string }
      | null;
    if (!response.ok || !json?.id) {
      return { ok: false, error: json?.message ?? `Resend respondeu ${response.status}.` };
    }
    return { ok: true, id: json.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "falha de rede" };
  }
}
