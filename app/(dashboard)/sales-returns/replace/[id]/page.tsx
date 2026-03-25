import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function SalesReturnReplacementPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user.role, PERMISSIONS.SALES_CREATE)) redirect("/");

  const { id } = await params;
  const invs = await prisma.inventory.findMany({
    where: { status: "IN_STOCK" },
    select: { id: true, sku: true, itemName: true, sellingPrice: true },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Replacement Dispatch</h1>
      </div>
      <Card>
        <CardHeader><CardTitle>Select Items</CardTitle></CardHeader>
        <CardContent>
          <ReplacementClient salesReturnId={id} items={invs} />
        </CardContent>
      </Card>
    </div>
  );
}

function ReplacementClient({ salesReturnId, items }: { salesReturnId: string; items: Array<{ id: string; sku: string; itemName: string; sellingPrice: number | null }> }) {
  const selected: Set<string> = new Set();
  const toggle = (id: string) => {
    const btn = document.getElementById(`sel-${id}`);
    if (!btn) return;
    if (selected.has(id)) {
      selected.delete(id);
      btn.dataset.sel = "0";
      btn.textContent = "Select";
      btn.className = "px-3 py-1 rounded border";
    } else {
      selected.add(id);
      btn.dataset.sel = "1";
      btn.textContent = "Selected";
      btn.className = "px-3 py-1 rounded border bg-muted";
    }
  };
  const submit = async () => {
    const arr = Array.from(selected).map(id => ({ inventoryId: id }));
    const res = await fetch(`/api/sales-returns/${salesReturnId}/replacement`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: arr }),
    });
    const data = await res.json();
    alert(res.ok ? `Memo created: ${data.memoId}` : (data?.error || "Failed"));
  };
  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(it => (
              <TableRow key={it.id}>
                <TableCell className="font-medium">{it.sku}</TableCell>
                <TableCell>{it.itemName}</TableCell>
                <TableCell className="text-right">{(it.sellingPrice || 0).toLocaleString("en-IN")}</TableCell>
                <TableCell className="text-right">
                  <button id={`sel-${it.id}`} data-sel="0" onClick={() => toggle(it.id)} className="px-3 py-1 rounded border">Select</button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end">
        <Button onClick={submit}>Create Memo</Button>
      </div>
    </div>
  );
}
