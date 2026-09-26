import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sala de Comando — Negócio Sólido AI",
  description: "Painel de operação do motor H.E.R.D.E.I.R.O.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
