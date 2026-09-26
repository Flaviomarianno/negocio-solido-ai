"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateAgentRunStatus } from "@/lib/agents/engine";

export async function approveInteraction(formData: FormData) {
  const interactionId = formData.get("interactionId");
  if (typeof interactionId !== "string" || !interactionId) {
    throw new Error("Interação inválida.");
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("lead_interactions")
    .update({ approved_by: "flavio", approved_at: new Date().toISOString() })
    .eq("id", interactionId);

  if (error) {
    throw new Error(`Falha ao aprovar: ${error.message}`);
  }

  await updateAgentRunStatus(interactionId, "success");
  revalidatePath("/dashboard/approvals");
}

export async function rejectInteraction(formData: FormData) {
  const interactionId = formData.get("interactionId");
  if (typeof interactionId !== "string" || !interactionId) {
    throw new Error("Interação inválida.");
  }

  await updateAgentRunStatus(interactionId, "rejected");

  const supabase = createAdminClient();
  const { error } = await supabase.from("lead_interactions").delete().eq("id", interactionId);

  if (error) {
    throw new Error(`Falha ao rejeitar: ${error.message}`);
  }

  revalidatePath("/dashboard/approvals");
}
