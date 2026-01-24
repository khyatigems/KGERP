import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { LabelsManagementTable } from "@/components/labels/labels-management-table";
import { LabelCartSheet } from "@/components/labels/label-cart-sheet";
import { LabelHistory } from "@/components/labels/label-history";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const metadata: Metadata = {
  title: "Label Management | KhyatiGems™",
};

import { getCart, getLabelJobs } from "./actions";

export default async function LabelsPage() {
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
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <LabelCartSheet initialItems={cartItems} />
      </div>
      
      <Tabs defaultValue="manage" className="w-full">
        <TabsList>
          <TabsTrigger value="manage">Manage Labels</TabsTrigger>
          <TabsTrigger value="history">Print History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="manage" className="mt-4">
            <LabelsManagementTable data={inventory} />
        </TabsContent>
        
        <TabsContent value="history" className="mt-4">
            <LabelHistory initialJobs={labelJobs} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
