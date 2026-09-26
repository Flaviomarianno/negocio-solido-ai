export const DIAGNOSTICO_PRICE = 97;

// Só PIX ou cartão à vista — boleto e Pix Automático são exclusivos da mentoria
// (CLAUDE.md seção 7; imposto no banco por payments_method_purpose_rule).
export const DIAGNOSTICO_METHODS = ["pix", "cartao"] as const;
export type DiagnosticoMethod = (typeof DIAGNOSTICO_METHODS)[number];

export function isDiagnosticoMethod(value: unknown): value is DiagnosticoMethod {
  return typeof value === "string" && (DIAGNOSTICO_METHODS as readonly string[]).includes(value);
}

// Normaliza para E.164 assumindo Brasil quando vier só DDD + número.
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) return `+55${digits}`;
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) return `+${digits}`;
  return null;
}

// DDD + número, sem código do país (formato que o Asaas espera em mobilePhone).
export function toAsaasMobile(e164: string): string {
  return e164.replace(/^\+55/, "");
}
