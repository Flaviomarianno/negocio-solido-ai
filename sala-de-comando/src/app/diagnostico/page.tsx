import CheckoutForm from "./checkout-form";

export const metadata = {
  title: "Diagnóstico estratégico — Negócio Sólido",
};

export default function DiagnosticoPage() {
  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 py-12">
      <h1 className="text-2xl font-semibold text-gold">Reunião de diagnóstico estratégico</h1>
      <p className="mt-2 mb-8 text-sm text-foreground/60">
        Investimento: R$ 97,00. Preencha seus dados e escolha PIX ou cartão para pagar a reunião.
      </p>
      <CheckoutForm />
    </main>
  );
}
