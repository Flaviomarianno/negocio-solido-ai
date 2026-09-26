import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "./logout-button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-gold">Sala de Comando</h1>
          <p className="text-xs text-foreground/50">{user.email}</p>
        </div>
        <LogoutButton />
      </header>
      <nav className="flex gap-4 border-b border-white/10 px-6 py-2 text-sm">
        <Link href="/dashboard" className="text-foreground/70 hover:text-gold">
          Agentes
        </Link>
        <Link href="/dashboard/leads" className="text-foreground/70 hover:text-gold">
          Leads
        </Link>
        <Link href="/dashboard/approvals" className="text-foreground/70 hover:text-gold">
          Aprovações
        </Link>
        <Link href="/dashboard/precos" className="text-foreground/70 hover:text-gold">
          Preços
        </Link>
        <Link href="/dashboard/agenda" className="text-foreground/70 hover:text-gold">
          Agenda
        </Link>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  );
}
