"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/erp-feedback";
import { useErpConfirmation } from "@/components/providers/erp-confirmation-provider";

export function MergeClient({ customers }: { customers: Array<{ id: string; name: string; phone: string | null; email: string | null; gstin: string | null }> }) {
  const [sourceId, setSourceId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const confirm = useErpConfirmation();

  const filtered = customers.filter(c =>
    !q ||
    c.name.toLowerCase().includes(q.toLowerCase()) ||
    (c.phone || "").includes(q) ||
    (c.email || "").toLowerCase().includes(q.toLowerCase()) ||
    (c.gstin || "").toLowerCase().includes(q.toLowerCase())
  ).slice(0, 100);

  const submit = async () => {
    if (!sourceId || !targetId || sourceId === targetId || busy) return;
    const source = customers.find((customer) => customer.id === sourceId);
    const target = customers.find((customer) => customer.id === targetId);
    if (!(await confirm({
      title: "Merge customer records?",
      description: `${source?.name || "The source customer"} and their related records will be merged into ${target?.name || "the target customer"}. This change cannot be undone.`,
      confirmLabel: "Merge customers",
      destructive: true,
    }))) return;
    setBusy(true);
    try {
      const res = await fetch("/api/customers/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId, targetId }),
      });
      if (!res.ok) throw new Error("Customer merge failed. Check the selected records and try again.");
      toast.success("Customer records merged");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Customer merge failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Input placeholder="Search name/mobile/GSTIN" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="text-sm font-medium mb-2">Source (to be merged)</div>
          <div className="rounded-md border max-h-[300px] overflow-auto">
            {filtered.map(c => (
              <button key={c.id} onClick={() => setSourceId(c.id)} className={`w-full text-left px-3 py-2 hover:bg-muted ${c.id === sourceId ? "bg-muted" : ""}`}>
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-muted-foreground">{c.phone || "-"} • {c.email || "-"} • {c.gstin || "-"}</div>
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-sm font-medium mb-2">Target (will survive)</div>
          <div className="rounded-md border max-h-[300px] overflow-auto">
            {filtered.map(c => (
              <button key={c.id} onClick={() => setTargetId(c.id)} className={`w-full text-left px-3 py-2 hover:bg-muted ${c.id === targetId ? "bg-muted" : ""}`}>
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-muted-foreground">{c.phone || "-"} • {c.email || "-"} • {c.gstin || "-"}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end">
        <Button onClick={submit} disabled={!sourceId || !targetId || sourceId === targetId || busy}>{busy ? "Merging…" : "Merge"}</Button>
      </div>
    </div>
  );
}

