import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MergeClient } from "@/components/masters/merge-client";

export const dynamic = "force-dynamic";

export default async function MergeCustomersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user.role, PERMISSIONS.USERS_MANAGE)) redirect("/");

  const customers = await prisma.customer.findMany({
    select: { id: true, name: true, phone: true, email: true, gstin: true },
    orderBy: { name: "asc" },
    take: 500,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Merge Customers</h1>
      </div>
      <Card>
        <CardHeader><CardTitle>Search & Merge</CardTitle></CardHeader>
        <CardContent>
          <MergeClient customers={customers} />
        </CardContent>
      </Card>
    </div>
  );
}
