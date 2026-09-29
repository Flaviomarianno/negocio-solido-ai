"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { upsertLead } from "@/lib/leads-upsert";
import {
  AsaasError,
  createCardCharge,
  createCustomer,
  createPixCharge,
} from "@/lib/asaas";
import {
  DIAGNOSTICO_PRICE,
  isDiagnosticoMethod,
  isValidDdi,
  buildWhatsapp,
} from "@/lib/diagnostico";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const RATE_LIMIT_SCOPE = "diagnostico_checkout";
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MINUTES = 10;

export type CheckoutResult =
  | { ok: true; next: string }
  | { ok: false; error: string };

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function tomorrowIso() {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
}

export async function createDiagnosticoCheckout(formData: FormData): Promise<CheckoutResult> {
  // Honeypot: bots preenchem, pessoas não veem este campo.
  if (text(formData, "website")) {
    return { ok: false, error: "Não foi possível processar o pedido." };
  }

  const ip = await getClientIp();
  if (!ip) {
    return { ok: false, error: "Não foi possível identificar sua conexão. Tente novamente." };
  }
  const allowed = await checkRateLimit(RATE_LIMIT_SCOPE, ip, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MINUTES);
  if (!allowed) {
    return { ok: false, error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." };
  }

  const name = text(formData, "name");
  const email = text(formData, "email");
  const whatsappDdi = text(formData, "whatsappDdi");
  const whatsappNumber = text(formData, "whatsapp");
  const cpfCnpj = text(formData, "cpfCnpj").replace(/\D/g, "");
  const method = formData.get("method");

  if (name.length < 2 || name.length > 120) return { ok: false, error: "Informe seu nome." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 160) {
    return { ok: false, error: "Informe um e-mail válido." };
  }
  if (!isValidDdi(whatsappDdi)) return { ok: false, error: "Informe um DDI válido (ex.: +55)." };
  const whatsapp = buildWhatsapp(whatsappDdi, whatsappNumber);
  if (!whatsapp) return { ok: false, error: "Informe um WhatsApp válido com DDD." };
  if (cpfCnpj && cpfCnpj.length !== 11 && cpfCnpj.length !== 14) {
    return { ok: false, error: "CPF ou CNPJ inválido." };
  }
  if (!isDiagnosticoMethod(method)) {
    return { ok: false, error: "Escolha PIX ou cartão." };
  }

  const supabase = createAdminClient();

  let leadId: string;
  try {
    const { lead } = await upsertLead({
      fullName: name,
      phone: whatsapp.e164,
      whatsapp: whatsapp.e164,
      email,
      sourceChannel: "pagina_diagnostico",
      updateSource: false,
    });
    leadId = lead.id;
  } catch {
    return { ok: false, error: "Erro ao registrar seus dados. Tente novamente." };
  }

  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .insert({
      lead_id: leadId,
      purpose: "diagnostico_97",
      method,
      is_exception: false,
      total_contracted: DIAGNOSTICO_PRICE,
      installments: 1,
    })
    .select("id")
    .single();

  if (paymentError || !payment) {
    return { ok: false, error: "Erro ao iniciar o pagamento. Tente novamente." };
  }
  const paymentId = payment.id as string;

  try {
    const { data: previous } = await supabase
      .from("payments")
      .select("asaas_customer_id")
      .eq("lead_id", leadId)
      .not("asaas_customer_id", "is", null)
      .limit(1)
      .maybeSingle();

    const customerId =
      (previous?.asaas_customer_id as string | undefined) ??
      (
        await createCustomer({
          name,
          email,
          mobilePhone: whatsapp.national,
          cpfCnpj: cpfCnpj || undefined,
          externalReference: leadId,
        })
      ).id;

    const charge = {
      customer: customerId,
      value: DIAGNOSTICO_PRICE,
      dueDate: tomorrowIso(),
      description: "Reunião de diagnóstico estratégico — Negócio Sólido",
      externalReference: paymentId,
    };
    const asaasPayment = method === "pix" ? await createPixCharge(charge) : await createCardCharge(charge);

    await supabase
      .from("payments")
      .update({
        asaas_customer_id: customerId,
        asaas_charge_id: asaasPayment.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", paymentId);

    if (method === "cartao") {
      if (!asaasPayment.invoiceUrl) {
        throw new AsaasError("Asaas não devolveu o link de pagamento do cartão.");
      }
      return { ok: true, next: asaasPayment.invoiceUrl };
    }
    return { ok: true, next: `/diagnostico/pagamento/${paymentId}` };
  } catch (err) {
    await supabase
      .from("payments")
      .update({ status: "cancelado", updated_at: new Date().toISOString() })
      .eq("id", paymentId);

    const detail = err instanceof AsaasError ? err.message : "erro inesperado";
    console.error("[diagnostico] falha ao criar cobrança:", detail);
    return { ok: false, error: `Não foi possível gerar a cobrança (${detail}).` };
  }
}
