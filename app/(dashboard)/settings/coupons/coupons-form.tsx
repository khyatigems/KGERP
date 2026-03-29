"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createCoupon, toggleCoupon, type CouponRow } from "./actions";

export function CouponsForm({ initial }: { initial: CouponRow[] }) {
  const [rows, setRows] = useState<CouponRow[]>(initial);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    code: "",
    type: "PERCENT" as "PERCENT" | "FLAT",
    value: 0,
    maxDiscount: 0,
    minInvoiceAmount: 0,
    validFrom: "",
    validTo: "",
    usageLimitTotal: 0,
    usageLimitPerCustomer: 0,
    applicableScope: "all",
  });

  const submit = () => {
    startTransition(async () => {
      const res = await createCoupon(form);
      if (!res?.success) {
        toast.error(res?.message || "Failed to create coupon");
        return;
      }
      toast.success("Coupon created");
      window.location.reload();
    });
  };

  const toggle = (id: string, next: boolean) => {
    startTransition(async () => {
      const res = await toggleCoupon(id, next);
      if (!res?.success) {
        toast.error(res?.message || "Failed");
        return;
      }
      setRows((p) => p.map((r) => (r.id === id ? { ...r, isActive: next ? 1 : 0 } : r)));
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-5 space-y-4">
        <h3 className="text-base font-semibold">Create Coupon</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input placeholder="Code" value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))} />
          <Input placeholder="Type: PERCENT/FLAT" value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value === "FLAT" ? "FLAT" : "PERCENT" }))} />
          <Input type="number" step="0.01" placeholder="Value" value={form.value} onChange={(e) => setForm((p) => ({ ...p, value: Number(e.target.value || 0) }))} />
          <Input type="number" step="0.01" placeholder="Max Discount" value={form.maxDiscount} onChange={(e) => setForm((p) => ({ ...p, maxDiscount: Number(e.target.value || 0) }))} />
          <Input type="number" step="0.01" placeholder="Min Invoice Amount" value={form.minInvoiceAmount} onChange={(e) => setForm((p) => ({ ...p, minInvoiceAmount: Number(e.target.value || 0) }))} />
          <Input type="date" value={form.validFrom} onChange={(e) => setForm((p) => ({ ...p, validFrom: e.target.value }))} />
          <Input type="date" value={form.validTo} onChange={(e) => setForm((p) => ({ ...p, validTo: e.target.value }))} />
          <Input type="number" step="1" placeholder="Usage Limit Total" value={form.usageLimitTotal} onChange={(e) => setForm((p) => ({ ...p, usageLimitTotal: Number(e.target.value || 0) }))} />
          <Input type="number" step="1" placeholder="Usage Limit Per Customer" value={form.usageLimitPerCustomer} onChange={(e) => setForm((p) => ({ ...p, usageLimitPerCustomer: Number(e.target.value || 0) }))} />
          <Input placeholder="Scope (all/category/tier)" value={form.applicableScope} onChange={(e) => setForm((p) => ({ ...p, applicableScope: e.target.value || "all" }))} />
        </div>
        <Button onClick={submit} disabled={isPending}>Create Coupon</Button>
      </div>

      <div className="rounded-lg border p-5 space-y-3">
        <h3 className="text-base font-semibold">Coupons</h3>
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-md border p-3">
              <div className="text-sm">
                <div className="font-medium">{r.code} • {r.type} • {r.value}</div>
                <div className="text-muted-foreground">
                  Scope: {r.applicableScope} • Active: {r.isActive ? "Yes" : "No"}
                </div>
              </div>
              <Button variant="outline" onClick={() => toggle(r.id, !r.isActive)} disabled={isPending}>
                {r.isActive ? "Disable" : "Activate"}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

