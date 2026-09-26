import { createAdminClient } from "@/lib/supabase/admin";

type PricingPlan = {
  id: string;
  method: string;
  max_installments: number;
  discount_amount: number | string;
  total_price: number | string;
  is_active: boolean;
};

const METHOD_LABELS: Record<string, string> = {
  pix: "PIX",
  cartao: "Cartão",
  pix_automatico: "Pix Automático",
  boleto: "Boleto",
};

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default async function PrecosPage() {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("mentoria_pricing_plans")
    .select("id, method, max_installments, discount_amount, total_price, is_active")
    .eq("is_active", true)
    .order("discount_amount", { ascending: false })
    .order("max_installments", { ascending: true });

  if (error) {
    return (
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Preços da mentoria</h2>
        <p className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          Não foi possível carregar a tabela de preços ({error.message}). Confirme que a migration
          20260926000000_mentoria_pricing_plans.sql foi executada no Supabase.
        </p>
      </div>
    );
  }

  const plans = (data ?? []) as PricingPlan[];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Preços da mentoria</h2>
        <p className="text-sm text-foreground/50">
          Preço cheio {brl.format(25500)} · desconto conforme a forma de pagamento · somente leitura
        </p>
        <p className="mt-1 text-xs text-foreground/40">
          Pix Automático e Boleto valem só para a mentoria — nunca para o diagnóstico de R$ 97.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-wide text-foreground/50">
            <tr>
              <th className="px-4 py-3">Forma de pagamento</th>
              <th className="px-4 py-3">Parcelas</th>
              <th className="px-4 py-3">Valor da parcela</th>
              <th className="px-4 py-3">Desconto</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {plans.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-foreground/40">
                  Nenhum plano cadastrado.
                </td>
              </tr>
            )}
            {plans.map((plan) => {
              const total = Number(plan.total_price);
              const discount = Number(plan.discount_amount);
              return (
                <tr key={plan.id} className="hover:bg-white/[0.03]">
                  <td className="px-4 py-3">{METHOD_LABELS[plan.method] ?? plan.method}</td>
                  <td className="px-4 py-3 text-foreground/70">{plan.max_installments}x</td>
                  <td className="px-4 py-3 text-foreground/70">
                    {brl.format(total / plan.max_installments)}
                  </td>
                  <td className="px-4 py-3 text-foreground/70">
                    {discount > 0 ? `− ${brl.format(discount)}` : "—"}
                  </td>
                  <td className="px-4 py-3 font-medium text-gold">{brl.format(total)}</td>
                  <td className="px-4 py-3 text-foreground/70">
                    {plan.is_active ? "Ativo" : "Inativo"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
