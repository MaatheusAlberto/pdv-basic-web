import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PDVLayout } from "@/components/layout";
import { CaixaClient } from "./_components/caixa-client";

export default async function CaixaPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/");
  }

  return (
    <PDVLayout>
      <CaixaClient />
    </PDVLayout>
  );
}
