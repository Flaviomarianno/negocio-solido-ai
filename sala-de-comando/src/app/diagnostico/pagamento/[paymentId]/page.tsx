import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPixQrCode, type AsaasPixQrCode } from "@/lib/asaas";
import { UUID_RE } from "@/lib/agenda";
import StatusPoller from "./status-poller";

export default async function PagamentoPage({
  params,
}: {
  params: Promise<{ paymentId: string }>;
}) {
  const { paymentId } = await params;
  if (!UUID_RE.test(paymentId)) notFound();

  const supabase = createAdminClient();
  const { data: payment } = await supabase
    .from("payments")
    .select("id, purpose, method, status, asaas_charge_id")
    .eq("id", paymentId)
    .eq("purpose", "diagnostico_97")
    .single();

  if (!payment) notFound();

  // Confirmado: leva o lead direto para escolher o horário da reunião.
  if (payment.status === "pago") redirect(`/diagnostico/agendar?p=${paymentId}`);

  const pending = payment.status === "pendente";

  let qr: AsaasPixQrCode | null = null;
  let qrError: string | null = null;
  if (pending && payment.method === "pix" && payment.asaas_charge_id) {
    try {
      qr = await getPixQrCode(payment.asaas_charge_id as string);
    } catch {
      qrError = "Não foi possível carregar o QR Code. Atualize a página.";
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-md px-4 py-12 text-center">
      <StatusPoller active={pending} />

      {pending && (
        <>
          <h1 className="text-2xl font-semibold text-gold">Pague com PIX</h1>
          <p className="mt-2 text-sm text-foreground/60">
            Escaneie o QR Code ou use o código copia e cola. Esta página atualiza sozinha quando o
            pagamento for confirmado.
          </p>
          {qr && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:image/png;base64,${qr.encodedImage}`}
                alt="QR Code PIX"
                className="mx-auto mt-6 h-56 w-56 rounded bg-white p-2"
              />
              <textarea
                readOnly
                value={qr.payload}
                rows={4}
                className="mt-4 w-full rounded border border-white/10 bg-white/5 p-2 text-xs"
              />
            </>
          )}
          {qrError && <p className="mt-6 text-sm text-red-300">{qrError}</p>}
        </>
      )}

      {!pending && (
        <>
          <h1 className="text-2xl font-semibold">Cobrança indisponível</h1>
          <p className="mt-3 text-sm text-foreground/70">
            Esta cobrança não está mais ativa. Volte à página do diagnóstico para gerar uma nova.
          </p>
        </>
      )}
    </main>
  );
}
