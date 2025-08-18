import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PDVLayout } from "@/components/layout";
import { ProdutosPageClient } from "./_components/produtos-page-client";

export default async function ProdutosPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/");
  }

  return (
    <PDVLayout>
      <ProdutosPageClient />
    </PDVLayout>
  );
}
