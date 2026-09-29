export const DIAGNOSTICO_PRICE = 97;

// Só PIX ou cartão à vista — boleto e Pix Automático são exclusivos da mentoria
// (CLAUDE.md seção 7; imposto no banco por payments_method_purpose_rule).
export const DIAGNOSTICO_METHODS = ["pix", "cartao"] as const;
export type DiagnosticoMethod = (typeof DIAGNOSTICO_METHODS)[number];

export function isDiagnosticoMethod(value: unknown): value is DiagnosticoMethod {
  return typeof value === "string" && (DIAGNOSTICO_METHODS as readonly string[]).includes(value);
}

export const DEFAULT_WHATSAPP_DDI = "+55";

// "+" seguido de 1 a 4 dígitos.
export function isValidDdi(raw: string): boolean {
  return /^\+\d{1,4}$/.test(raw.trim());
}

export type Whatsapp = { e164: string; ddi: string; national: string };

// Combina DDI + número num único WhatsApp em E.164. Para +55, exige DDD +
// número no padrão brasileiro (10 ou 11 dígitos); para outros DDIs, só
// dígitos, mínimo 8 — não temos regra de formato por país fora do Brasil.
export function buildWhatsapp(ddiRaw: string, numberRaw: string): Whatsapp | null {
  const ddi = ddiRaw.trim();
  if (!isValidDdi(ddi)) return null;

  const national = numberRaw.replace(/\D/g, "");
  if (ddi === "+55") {
    if (national.length !== 10 && national.length !== 11) return null;
  } else if (national.length < 8) {
    return null;
  }

  return { e164: `${ddi}${national}`, ddi, national };
}
