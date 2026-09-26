import { NextRequest, NextResponse } from "next/server";
import { upsertLead } from "@/lib/leads-upsert";

type WebhookPayload = {
  nome?: unknown;
  telefone?: unknown;
  instagram?: unknown;
  source_channel?: unknown;
  source_detail?: unknown;
};

function readString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function POST(request: NextRequest) {
  // Se LEADS_WEBHOOK_SECRET não estiver configurada, o endpoint aceita
  // qualquer chamada — só faça isso em .env.local de desenvolvimento.
  // Configure a variável antes de expor esta rota publicamente (Vercel).
  const expectedSecret = process.env.LEADS_WEBHOOK_SECRET;
  if (expectedSecret) {
    const providedSecret = request.headers.get("x-webhook-secret");
    if (providedSecret !== expectedSecret) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }
  }

  let payload: WebhookPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const sourceChannel = readString(payload.source_channel);
  if (!sourceChannel) {
    return NextResponse.json({ error: "source_channel é obrigatório." }, { status: 400 });
  }

  try {
    const { lead, created } = await upsertLead({
      fullName: readString(payload.nome),
      phone: readString(payload.telefone),
      instagramHandle: readString(payload.instagram),
      sourceChannel,
      sourceDetail: readString(payload.source_detail),
    });
    return NextResponse.json({ lead, created }, { status: created ? 201 : 200 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro desconhecido." },
      { status: 500 },
    );
  }
}
