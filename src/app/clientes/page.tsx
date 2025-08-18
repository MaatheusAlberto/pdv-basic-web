import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PDVLayout } from "@/components/layout";
import { ClientesPageClient } from "./_components/clientes-page-client";

export default async function ClientesPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/");
  }

  return (
    <PDVLayout>
      <ClientesPageClient />
    </PDVLayout>
  );
}
