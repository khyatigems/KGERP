import { auth } from "@/lib/auth";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { LabelsManagementTable } from "@/components/labels/labels-management-table";
import { LabelWorkspaceHeader } from "@/components/labels/label-workspace-header";
import { LabelHistory } from "@/components/labels/label-history";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimatedPage } from "@/components/ui/animated-page";
import { ArrowRight, History, Layers3 } from "lucide-react";

export const metadata: Metadata = {
  title: "Label Management | KhyatiGems™",
};

import { getCart, getLabelJobs } from "./actions";

export default async function LabelsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!(await checkUserPermission(session.user.id, PERMISSIONS.LABELS_VIEW)) && !(await checkUserPermission(session.user.id, PERMISSIONS.INVENTORY_VIEW))) redirect("/");
  const [inventory, cartItems, labelJobs] = await Promise.all([
    prisma.inventory.findMany({
      where: {
        status: "IN_STOCK",
      },
      orderBy: { createdAt: "desc" },
      include: {
          colorCode: { select: { name: true } }
      }
    }),
    getCart(),
    getLabelJobs()
  ]);

  return (
    <AnimatedPage>
    <div className="mx-auto max-w-[1600px] space-y-6 pb-6">
      <LabelWorkspaceHeader availableProducts={inventory.length} recentJobs={labelJobs.length} cartItems={cartItems} />
      
      <Tabs defaultValue="manage" className="w-full">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList className="h-11 rounded-xl border bg-card p-1">
            <TabsTrigger value="manage" className="gap-2 rounded-lg px-4"><Layers3 className="size-4" />Inventory</TabsTrigger>
            <TabsTrigger value="history" className="gap-2 rounded-lg px-4"><History className="size-4" />Print history</TabsTrigger>
          </TabsList>
          <p className="hidden items-center gap-2 text-xs text-muted-foreground md:flex">Select products<ArrowRight className="size-3" />Review layout<ArrowRight className="size-3" />Print labels</p>
        </div>
        
        <TabsContent value="manage" className="mt-5">
            <LabelsManagementTable data={inventory} />
        </TabsContent>
        
        <TabsContent value="history" className="mt-4">
            <LabelHistory initialJobs={labelJobs} />
        </TabsContent>
      </Tabs>
    </div>
    </AnimatedPage>
  );
}
