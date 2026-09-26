import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { UUID_RE, slotDayKey, slotDayLabel, slotFull, slotTime } from "@/lib/agenda";
import { bookSlot } from "./actions";

export const metadata = {
  title: "Agendar diagnóstico — Negócio Sólido",
};

type Slot = { id: string; slot_datetime: string; duration_minutes: number };

const ERRORS: Record<string, string> = {
  indisponivel: "Esse horário acabou de ser reservado por outra pessoa. Escolha outro.",
  pagamento: "Ainda não identificamos a confirmação do seu pagamento. Aguarde alguns instantes e recarregue a página.",
  erro: "Não foi possível concluir o agendamento. Tente novamente.",
};

export default async function AgendarPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string; erro?: string }>;
}) {
  const { p: paymentId, erro } = await searchParams;
  if (!paymentId || !UUID_RE.test(paymentId)) notFound();

  const supabase = createAdminClient();

  const { data: payment } = await supabase
    .from("payments")
    .select("id, status")
    .eq("id", paymentId)
    .eq("purpose", "diagnostico_97")
    .maybeSingle();
  if (!payment) notFound();

  if (payment.status !== "pago") {
    return (
      <main className="mx-auto min-h-screen max-w-md px-4 py-12 text-center">
        <h1 className="text-2xl font-semibold text-gold">Aguardando pagamento</h1>
        <p className="mt-3 text-sm text-foreground/70">
          O agendamento é liberado assim que o pagamento do diagnóstico for confirmado.
        </p>
      </main>
    );
  }

  const { data: diagnostic } = await supabase
    .from("diagnostics")
    .select("id, status, scheduled_at")
    .eq("payment_id", paymentId)
    .maybeSingle();

  if (diagnostic?.status === "agendado" && diagnostic.scheduled_at) {
    return (
      <main className="mx-auto min-h-screen max-w-md px-4 py-12 text-center">
        <h1 className="text-2xl font-semibold text-gold">Diagnóstico agendado</h1>
        <p className="mt-3 text-sm text-foreground/70">Sua reunião está marcada para</p>
        <p className="mt-1 text-lg font-medium">{slotFull(diagnostic.scheduled_at as string)}</p>
        <p className="mt-1 text-xs text-foreground/40">Horário de Brasília</p>
      </main>
    );
  }

  const { data: slotData } = await supabase
    .from("availability_slots")
    .select("id, slot_datetime, duration_minutes")
    .eq("is_booked", false)
    .gte("slot_datetime", new Date().toISOString())
    .order("slot_datetime", { ascending: true })
    .limit(80);
  const slots = (slotData ?? []) as Slot[];

  const days = new Map<string, Slot[]>();
  for (const slot of slots) {
    const key = slotDayKey(slot.slot_datetime);
    days.set(key, [...(days.get(key) ?? []), slot]);
  }

  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 py-12">
      <h1 className="text-2xl font-semibold text-gold">Pagamento confirmado</h1>
      <p className="mt-2 mb-8 text-sm text-foreground/60">
        Escolha o dia e o horário da sua reunião de diagnóstico. Horários de Brasília.
      </p>

      {erro && ERRORS[erro] && (
        <p className="mb-6 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {ERRORS[erro]}
        </p>
      )}

      {slots.length === 0 ? (
        <p className="text-sm text-foreground/70">
          No momento não há horários disponíveis. Entraremos em contato pelo WhatsApp para combinar
          o melhor horário.
        </p>
      ) : (
        <div className="space-y-6">
          {[...days.entries()].map(([key, daySlots]) => (
            <section key={key}>
              <h2 className="mb-2 text-sm font-medium capitalize text-foreground/80">
                {slotDayLabel(daySlots[0].slot_datetime)}
              </h2>
              <div className="flex flex-wrap gap-2">
                {daySlots.map((slot) => (
                  <form key={slot.id} action={bookSlot}>
                    <input type="hidden" name="paymentId" value={paymentId} />
                    <input type="hidden" name="slotId" value={slot.id} />
                    <button
                      type="submit"
                      className="rounded border border-gold-dark/50 px-4 py-2 text-sm transition hover:bg-gold hover:text-black"
                    >
                      {slotTime(slot.slot_datetime)}
                    </button>
                  </form>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
