"use client";

import { useState, type FormEvent } from "react";
import { createDiagnosticoCheckout } from "./actions";

const inputClass =
  "w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-gold";

export default function CheckoutForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const result = await createDiagnosticoCheckout(new FormData(event.currentTarget));
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }
    window.location.assign(result.next);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <p className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="space-y-1">
        <label htmlFor="name" className="block text-sm text-foreground/80">Nome completo</label>
        <input id="name" name="name" required autoComplete="name" className={inputClass} />
      </div>

      <div className="space-y-1">
        <label htmlFor="email" className="block text-sm text-foreground/80">E-mail</label>
        <input id="email" name="email" type="email" required autoComplete="email" className={inputClass} />
      </div>

      <div className="grid grid-cols-[90px_1fr] gap-3">
        <div className="space-y-1">
          <label htmlFor="whatsappDdi" className="block text-sm text-foreground/80">DDI</label>
          <input
            id="whatsappDdi"
            name="whatsappDdi"
            type="text"
            inputMode="tel"
            required
            defaultValue="+55"
            placeholder="+55"
            className={inputClass}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="whatsapp" className="block text-sm text-foreground/80">WhatsApp</label>
          <input
            id="whatsapp"
            name="whatsapp"
            type="tel"
            required
            autoComplete="tel"
            placeholder="(11) 99999-0000"
            className={inputClass}
          />
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="cpfCnpj" className="block text-sm text-foreground/80">
          CPF ou CNPJ <span className="text-foreground/40">(para emissão da cobrança)</span>
        </label>
        <input id="cpfCnpj" name="cpfCnpj" inputMode="numeric" className={inputClass} />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm text-foreground/80">Forma de pagamento</legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="method" value="pix" defaultChecked /> PIX
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="method" value="cartao" /> Cartão de crédito (à vista)
        </label>
      </fieldset>

      <div className="hidden" aria-hidden="true">
        <label htmlFor="website">Não preencha</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded bg-gold px-4 py-2 text-sm font-medium text-black transition hover:bg-gold-light disabled:opacity-50"
      >
        {loading ? "Gerando cobrança..." : "Pagar R$ 97,00"}
      </button>
    </form>
  );
}
