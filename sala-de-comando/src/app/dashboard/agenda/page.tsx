import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { slotFull } from "@/lib/agenda";
import { createSlot, deleteSlot } from "./actions";

type SlotRow = {
  id: string;
  slot_datetime: string;
  duration_minutes: number;
  is_booked: boolean;
  diagnostics: {
    leads: { id: string; full_name: string | null; phone: string | null } | null;
  } | null;
};

const ERRORS: Record<string, string> = {
  data: "Data e hora inválidas.",
  passado: "Escolha um horário no futuro.",
  duracao: "A duração deve ficar entre 15 e 480 minutos.",
  duplicado: "Já existe um horário cadastrado nesse instante.",
  banco: "Não foi possível salvar. Tente novamente.",
};

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const supabase = createAdminClient();

  // Mostra desde ontem para não sumir o que acabou de acontecer.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("availability_slots")
    .select("id, slot_datetime, duration_minutes, is_booked, diagnostics(leads(id, full_name, phone))")
    .gte("slot_datetime", since)
    .order("slot_datetime", { ascending: true });

  const slots = (data ?? []) as unknown as SlotRow[];
  const free = slots.filter((slot) => !slot.is_booked).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Agenda de diagnósticos</h2>
        <p className="text-sm text-foreground/50">
          {slots.length} horários cadastrados · {free} livres · horários em Brasília
        </p>
      </div>

      {erro && ERRORS[erro] && (
        <p className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {ERRORS[erro]}
        </p>
      )}
      {error && (
        <p className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          Não foi possível carregar a agenda ({error.message}). Confirme que a migration
          20260926000400_availability_slots.sql foi executada.
        </p>
      )}

      <form
        action={createSlot}
        className="flex flex-wrap items-end gap-4 rounded-lg border border-white/10 bg-white/5 p-4"
      >
        <div>
          <label className="mb-1 block text-xs text-foreground/50">Data e hora</label>
          <input
            type="datetime-local"
            name="when"
            required
            className="rounded border border-white/10 bg-black/40 px-3 py-1.5 text-sm outline-none focus:border-gold"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-foreground/50">Duração (min)</label>
          <input
            type="number"
            name="duration"
            defaultValue={60}
            min={15}
            max={480}
            step={5}
            required
            className="w-24 rounded border border-white/10 bg-black/40 px-3 py-1.5 text-sm outline-none focus:border-gold"
          />
        </div>
        <button
          type="submit"
          className="rounded bg-gold px-4 py-1.5 text-sm font-medium text-black transition hover:bg-gold-light"
        >
          Adicionar horário
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-wide text-foreground/50">
            <tr>
              <th className="px-4 py-3">Data e hora</th>
              <th className="px-4 py-3">Duração</th>
              <th className="px-4 py-3">Situação</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {slots.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-foreground/40">
                  Nenhum horário cadastrado.
                </td>
              </tr>
            )}
            {slots.map((slot) => {
              const lead = slot.diagnostics?.leads;
              return (
                <tr key={slot.id} className="hover:bg-white/[0.03]">
                  <td className="px-4 py-3">{slotFull(slot.slot_datetime)}</td>
                  <td className="px-4 py-3 text-foreground/70">{slot.duration_minutes} min</td>
                  <td className="px-4 py-3">
                    {slot.is_booked ? (
                      <span className="text-yellow-300">
                        Reservado
                        {lead && (
                          <>
                            {" · "}
                            <Link href={`/dashboard/leads/${lead.id}`} className="hover:text-gold">
                              {lead.full_name || "Lead sem nome"}
                            </Link>
                            {lead.phone ? ` · ${lead.phone}` : ""}
                          </>
                        )}
                      </span>
                    ) : (
                      <span className="text-green-300">Livre</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!slot.is_booked && (
                      <form action={deleteSlot}>
                        <input type="hidden" name="slotId" value={slot.id} />
                        <button
                          type="submit"
                          className="rounded border border-red-500/40 px-3 py-1 text-xs text-red-300 transition hover:bg-red-500/10"
                        >
                          Remover
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
