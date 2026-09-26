import "server-only";

const BASE_URLS = {
  sandbox: "https://api-sandbox.asaas.com/v3",
  production: "https://api.asaas.com/v3",
} as const;

export class AsaasError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "AsaasError";
    this.status = status;
  }
}

export type AsaasCustomer = { id: string };

export type AsaasPayment = {
  id: string;
  status: string;
  billingType: string;
  value: number;
  dueDate: string;
  invoiceUrl?: string;
  externalReference?: string | null;
};

export type AsaasPixQrCode = {
  encodedImage: string;
  payload: string;
  expirationDate?: string;
};

function getConfig() {
  const apiKey = process.env.ASAAS_API_KEY;
  if (!apiKey) {
    throw new AsaasError("ASAAS_API_KEY não configurada no .env.local.");
  }
  const env = process.env.ASAAS_ENV === "production" ? "production" : "sandbox";
  return { apiKey, baseUrl: BASE_URLS[env] };
}

async function request<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const { apiKey, baseUrl } = getConfig();

  const response = await fetch(`${baseUrl}${path}`, {
    method: init.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      access_token: apiKey,
      "User-Agent": "negocio-solido-ai/sala-de-comando",
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });

  const text = await response.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!response.ok) {
    const errors = (json as { errors?: { description?: string }[] } | null)?.errors;
    const description = errors?.map((e) => e.description).filter(Boolean).join("; ");
    throw new AsaasError(description || `Asaas respondeu ${response.status}.`, response.status);
  }

  return json as T;
}

export function createCustomer(input: {
  name: string;
  email: string;
  mobilePhone?: string;
  cpfCnpj?: string;
  externalReference?: string;
}) {
  return request<AsaasCustomer>("/customers", { method: "POST", body: input });
}

type ChargeInput = {
  customer: string;
  value: number;
  dueDate: string;
  description: string;
  externalReference: string;
};

export function createPixCharge(input: ChargeInput) {
  return request<AsaasPayment>("/payments", {
    method: "POST",
    body: { ...input, billingType: "PIX" },
  });
}

// Cartão à vista: sem dados de cartão no nosso servidor. O Asaas devolve a
// invoiceUrl, página hospedada onde o cliente digita o cartão.
export function createCardCharge(input: ChargeInput) {
  return request<AsaasPayment>("/payments", {
    method: "POST",
    body: { ...input, billingType: "CREDIT_CARD" },
  });
}

export function getPayment(id: string) {
  return request<AsaasPayment>(`/payments/${encodeURIComponent(id)}`);
}

export function getPixQrCode(id: string) {
  return request<AsaasPixQrCode>(`/payments/${encodeURIComponent(id)}/pixQrCode`);
}
