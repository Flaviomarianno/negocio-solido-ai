import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type LeadInput = {
  fullName?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  instagramHandle?: string | null;
  email?: string | null;
  sourceChannel: string;
  sourceDetail?: string | null;
  // No webhook genérico o canal mais recente sobrescreve o anterior; no
  // checkout não, para preservar a origem real do lead.
  updateSource?: boolean;
};

export type LeadRecord = { id: string } & Record<string, unknown>;

async function findLeadId(column: string, value: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("leads")
    .select("id")
    .eq(column, value)
    .limit(1)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

export async function upsertLead(input: LeadInput): Promise<{ lead: LeadRecord; created: boolean }> {
  const supabase = createAdminClient();

  let existingId: string | null = null;
  if (input.phone) existingId = await findLeadId("phone", input.phone);
  if (!existingId && input.whatsapp) {
    existingId = (await findLeadId("phone", input.whatsapp)) ?? (await findLeadId("whatsapp", input.whatsapp));
  }
  if (!existingId && input.instagramHandle) {
    existingId = await findLeadId("instagram_handle", input.instagramHandle);
  }

  if (existingId) {
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.updateSource !== false) update.source_channel = input.sourceChannel;
    if (input.updateSource !== false && input.sourceDetail) update.source_detail = input.sourceDetail;
    if (input.fullName) update.full_name = input.fullName;
    if (input.phone) update.phone = input.phone;
    if (input.whatsapp) update.whatsapp = input.whatsapp;
    if (input.instagramHandle) update.instagram_handle = input.instagramHandle;
    if (input.email) update.email = input.email;

    const { data, error } = await supabase
      .from("leads")
      .update(update)
      .eq("id", existingId)
      .select()
      .single();
    if (error || !data) throw new Error(`Falha ao atualizar lead: ${error?.message}`);
    return { lead: data as LeadRecord, created: false };
  }

  const { data, error } = await supabase
    .from("leads")
    .insert({
      full_name: input.fullName ?? null,
      phone: input.phone ?? null,
      whatsapp: input.whatsapp ?? null,
      instagram_handle: input.instagramHandle ?? null,
      email: input.email ?? null,
      source_channel: input.sourceChannel,
      source_detail: input.sourceDetail ?? null,
    })
    .select()
    .single();
  if (error || !data) throw new Error(`Falha ao criar lead: ${error?.message}`);
  return { lead: data as LeadRecord, created: true };
}
