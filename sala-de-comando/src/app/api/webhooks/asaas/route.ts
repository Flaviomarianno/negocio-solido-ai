import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPaymentConfirmedEmail } from "@/lib/diagnostico-emails";

type AsaasWebhookBody = {
  event?: string;
  payment?: { id?: string; externalReference?: string | null };
};

const PAID_EVENTS = new Set(["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"]);
const OVERDUE_EVENTS = new Set(["PAYMENT_OVERDUE"]);
const CANCELED_EVENTS = new Set(["PAYMENT_DELETED", "PAYMENT_REFUNDED", "PAYMENT_CHARGEBACK_REQUESTED"]);

// Etapas em que subir para diagnostico_pago é um avanço; nunca retrocede lead
// que já está adiante no funil.
const STAGES_BEFORE_PAID = ["novo", "em_qualificacao", "qualificado", "diagnostico_agendado"];

function tokenMatches(provided: string | null, expected: string) {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  // Origem: o Asaas envia o authToken configurado no webhook no header
  // "asaas-access-token". Sem token configurado, recusamos tudo.
  const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!expectedToken) {
    return NextResponse.json({ error: "Webhook não configurado." }, { status: 503 });
  }
  if (!tokenMatches(request.headers.get("asaas-access-token"), expectedToken)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  let body: AsaasWebhookBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const event = body.event ?? "";
  const asaasChargeId = body.payment?.id;
  if (!asaasChargeId) {
    return NextResponse.json({ ignored: true, reason: "sem payment.id" });
  }

  const supabase = createAdminClient();
  const { data: payment } = await supabase
    .from("payments")
    .select("id, lead_id, purpose, status")
    .eq("asaas_charge_id", asaasChargeId)
    .maybeSingle();

  // Cobrança que não é nossa (ou ainda não vinculada): 200 para o Asaas não
  // ficar reenviando e pausar a fila.
  if (!payment) {
    return NextResponse.json({ ignored: true, reason: "cobrança desconhecida" });
  }

  const now = new Date().toISOString();

  if (PAID_EVENTS.has(event)) {
    if (payment.status !== "pago") {
      await supabase.from("payments").update({ status: "pago", updated_at: now }).eq("id", payment.id);
    }

    if (payment.purpose === "diagnostico_97") {
      const { data: existing } = await supabase
        .from("diagnostics")
        .select("id")
        .eq("payment_id", payment.id)
        .maybeSingle();

      let diagnosticId = existing?.id as string | undefined;
      if (!diagnosticId) {
        const { data: created, error } = await supabase
          .from("diagnostics")
          .insert({ lead_id: payment.lead_id, payment_id: payment.id, status: "pago" })
          .select("id")
          .single();
        if (error || !created) {
          // 500 faz o Asaas reenviar; a criação é idempotente.
          return NextResponse.json({ error: `Falha ao criar diagnóstico: ${error?.message}` }, { status: 500 });
        }
        diagnosticId = created.id as string;
        await supabase.from("payments").update({ diagnostic_id: diagnosticId }).eq("id", payment.id);

        // Só na primeira confirmação (reenvios do Asaas não reenviam o e-mail).
        const { data: lead } = await supabase
          .from("leads")
          .select("full_name, email, phone, whatsapp")
          .eq("id", payment.lead_id)
          .maybeSingle();
        if (lead) {
          await sendPaymentConfirmedEmail(
            {
              name: lead.full_name as string | null,
              email: lead.email as string | null,
              phone: lead.phone as string | null,
              whatsapp: lead.whatsapp as string | null,
            },
            payment.id as string,
          );
        }
      }

      await supabase
        .from("leads")
        .update({ stage: "diagnostico_pago", updated_at: now })
        .eq("id", payment.lead_id)
        .in("stage", STAGES_BEFORE_PAID);
    }

    return NextResponse.json({ ok: true, status: "pago" });
  }

  // Overdue/cancelamento só valem para cobrança ainda pendente.
  if (payment.status === "pendente") {
    if (OVERDUE_EVENTS.has(event)) {
      await supabase.from("payments").update({ status: "atrasado", updated_at: now }).eq("id", payment.id);
      return NextResponse.json({ ok: true, status: "atrasado" });
    }
    if (CANCELED_EVENTS.has(event)) {
      await supabase.from("payments").update({ status: "cancelado", updated_at: now }).eq("id", payment.id);
      return NextResponse.json({ ok: true, status: "cancelado" });
    }
  }

  return NextResponse.json({ ignored: true, reason: `evento ${event} sem ação` });
}
