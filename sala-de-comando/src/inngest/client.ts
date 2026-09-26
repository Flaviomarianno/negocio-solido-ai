import { Inngest } from "inngest";

export type LeadInteractionCreatedData = {
  leadId: string;
  interactionId: string;
  direction: "inbound" | "outbound";
};

export const inngest = new Inngest({ id: "negocio-solido-ai" });
