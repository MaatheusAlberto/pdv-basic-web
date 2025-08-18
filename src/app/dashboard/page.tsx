import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PDVLayout } from "@/components/layout";
import { DashboardClient } from "./_components/dashboard-client";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/");
  }

  return (
    <PDVLayout>
      <DashboardClient />
    </PDVLayout>
  );
}
