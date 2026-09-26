"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { isLeadStage } from "@/lib/leads";
import { inngest } from "@/inngest/client";

const VALID_CHANNELS = ["whatsapp", "instagram", "email"] as const;

export async function updateLeadStage(formData: FormData) {
  const leadId = formData.get("leadId");
  const stage = formData.get("stage");

  if (typeof leadId !== "string" || !leadId) {
    throw new Error("Lead inválido.");
  }
  if (typeof stage !== "string" || !isLeadStage(stage)) {
    throw new Error("Estágio inválido.");
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("leads")
    .update({ stage, updated_at: new Date().toISOString() })
    .eq("id", leadId);

  if (error) {
    throw new Error(`Falha ao atualizar estágio: ${error.message}`);
  }

  revalidatePath(`/dashboard/leads/${leadId}`);
  revalidatePath("/dashboard/leads");
}

export async function logInboundInteraction(formData: FormData) {
  const leadId = formData.get("leadId");
  const channel = formData.get("channel");
  const content = formData.get("content");

  if (typeof leadId !== "string" || !leadId) {
    throw new Error("Lead inválido.");
  }
  if (typeof channel !== "string" || !VALID_CHANNELS.includes(channel as typeof VALID_CHANNELS[number])) {
    throw new Error("Canal inválido.");
  }
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("Conteúdo é obrigatório.");
  }

  const supabase = createAdminClient();
  const { data: interaction, error } = await supabase
    .from("lead_interactions")
    .insert({
      lead_id: leadId,
      channel,
      direction: "inbound",
      message_type: "text",
      content: content.trim(),
    })
    .select("id")
    .single();

  if (error || !interaction) {
    throw new Error(`Falha ao registrar interação: ${error?.message}`);
  }

  await inngest.send({
    name: "leads/interaction.created",
    data: { leadId, interactionId: interaction.id as string, direction: "inbound" },
  });

  revalidatePath(`/dashboard/leads/${leadId}`);
}
