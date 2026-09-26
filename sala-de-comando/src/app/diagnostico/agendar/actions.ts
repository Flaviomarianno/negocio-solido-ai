"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { UUID_RE } from "@/lib/agenda";
import { sendBookingEmails } from "@/lib/diagnostico-emails";

export async function bookSlot(formData: FormData) {
  const paymentId = formData.get("paymentId");
  const slotId = formData.get("slotId");

  if (typeof paymentId !== "string" || !UUID_RE.test(paymentId)) redirect("/diagnostico");
  const back = (erro?: string): never =>
    redirect(`/diagnostico/agendar?p=${paymentId}${erro ? `&erro=${erro}` : ""}`);
  if (typeof slotId !== "string" || !UUID_RE.test(slotId)) back("indisponivel");

  const supabase = createAdminClient();

  const { data: payment } = await supabase
    .from("payments")
    .select("status")
    .eq("id", paymentId)
    .eq("purpose", "diagnostico_97")
    .maybeSingle();
  if (!payment || payment.status !== "pago") back("pagamento");

  const { data: diagnostic } = await supabase
    .from("diagnostics")
    .select("id, status, lead_id")
    .eq("payment_id", paymentId)
    .maybeSingle();
  if (!diagnostic) back("pagamento");
  if (diagnostic!.status !== "pago") back(); // já agendado: a página mostra a reserva

  // Reserva atômica: só um cliente consegue virar is_booked=true neste horário.
  const { data: claimed, error: claimError } = await supabase
    .from("availability_slots")
    .update({ is_booked: true, diagnostic_id: diagnostic!.id })
    .eq("id", slotId as string)
    .eq("is_booked", false)
    .gt("slot_datetime", new Date().toISOString())
    .select("id, slot_datetime, duration_minutes")
    .maybeSingle();
  if (claimError) back("erro");
  if (!claimed) back("indisponivel");

  const { data: scheduled, error: scheduleError } = await supabase
    .from("diagnostics")
    .update({ scheduled_at: claimed!.slot_datetime, status: "agendado" })
    .eq("id", diagnostic!.id)
    .eq("status", "pago")
    .select("id")
    .maybeSingle();

  if (scheduleError || !scheduled) {
    await supabase
      .from("availability_slots")
      .update({ is_booked: false, diagnostic_id: null })
      .eq("id", claimed!.id);
    back("erro");
  }

  const { data: lead } = await supabase
    .from("leads")
    .select("full_name, email, phone, whatsapp")
    .eq("id", diagnostic!.lead_id)
    .maybeSingle();

  if (lead) {
    await sendBookingEmails({
      lead: {
        name: lead.full_name as string | null,
        email: lead.email as string | null,
        phone: lead.phone as string | null,
        whatsapp: lead.whatsapp as string | null,
      },
      startIso: claimed!.slot_datetime as string,
      durationMinutes: claimed!.duration_minutes as number,
    });
  }

  revalidatePath("/dashboard/agenda");
  back();
}
