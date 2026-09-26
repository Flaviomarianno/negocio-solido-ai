"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { UUID_RE, localToIso } from "@/lib/agenda";

export async function createSlot(formData: FormData) {
  const when = formData.get("when");
  const duration = Number(formData.get("duration"));

  const iso = typeof when === "string" ? localToIso(when) : null;
  if (!iso) redirect("/dashboard/agenda?erro=data");
  if (new Date(iso).getTime() <= Date.now()) redirect("/dashboard/agenda?erro=passado");
  if (!Number.isInteger(duration) || duration < 15 || duration > 480) {
    redirect("/dashboard/agenda?erro=duracao");
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("availability_slots")
    .insert({ slot_datetime: iso, duration_minutes: duration });

  if (error) {
    redirect(`/dashboard/agenda?erro=${error.code === "23505" ? "duplicado" : "banco"}`);
  }

  revalidatePath("/dashboard/agenda");
  redirect("/dashboard/agenda");
}

export async function deleteSlot(formData: FormData) {
  const slotId = formData.get("slotId");
  if (typeof slotId !== "string" || !UUID_RE.test(slotId)) {
    redirect("/dashboard/agenda?erro=banco");
  }

  // Só remove horário ainda não reservado.
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("availability_slots")
    .delete()
    .eq("id", slotId)
    .eq("is_booked", false);

  if (error) redirect("/dashboard/agenda?erro=banco");

  revalidatePath("/dashboard/agenda");
  redirect("/dashboard/agenda");
}
