import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedPage } from "@/components/ui/animated-page";
import { MergeClient } from "@/components/masters/merge-client";
import { WorkspaceHeader } from "@/components/layout/workspace-header";

export const dynamic = "force-dynamic";

export default async function MergeCustomersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!(await checkUserPermission(session.user.id, PERMISSIONS.USERS_MANAGE)) && !(await checkUserPermission(session.user.id, PERMISSIONS.CUSTOMERS_MERGE))) redirect("/");

  const customers = await prisma.customer.findMany({
    select: { id: true, name: true, phone: true, email: true, gstin: true },
    orderBy: { name: "asc" },
    take: 500,
  });

  return (
    <AnimatedPage><div className="space-y-6">
      <WorkspaceHeader eyebrow="KhyatiGems · Inventory & catalog"><div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Merge Customers</h1>
      </div></WorkspaceHeader>
      <Card>
        <CardHeader><CardTitle>Search & Merge</CardTitle></CardHeader>
        <CardContent>
          <MergeClient customers={customers} />
        </CardContent>
      </Card>
    </div></AnimatedPage>
  );
}
