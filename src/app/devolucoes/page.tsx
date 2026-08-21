import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PDVLayout } from "@/components/layout";
import { DevolucoesPageClient } from "./_components/devolucoes-page-client";

export default async function DevolucoesPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/");
  }

  return (
    <PDVLayout>
      <DevolucoesPageClient />
    </PDVLayout>
  );
}
