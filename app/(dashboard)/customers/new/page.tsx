import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { AnimatedPage } from "@/components/ui/animated-page";
import { CustomerForm } from "@/components/customers/customer-form";
import { WorkspaceHeader } from "@/components/layout/workspace-header";

export const metadata: Metadata = {
  title: "New Customer | KhyatiGems™",
};

export default async function NewCustomerPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!await checkUserPermission(session.user.id, PERMISSIONS.CUSTOMER_MANAGE)) redirect("/");

  return (
    <AnimatedPage><div className="space-y-6">
      <WorkspaceHeader eyebrow="KhyatiGems · Administration"><div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Add Customer</h1>
      </div></WorkspaceHeader>
      <div className="rounded-xl border bg-card text-card-foreground shadow">
        <div className="p-6">
          <CustomerForm />
        </div>
      </div>
    </div></AnimatedPage>
  );
}

