"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createMessageTemplate, toggleMessageTemplate, type MessageTemplateRow } from "./actions";

export function MessageTemplatesForm({ initial }: { initial: MessageTemplateRow[] }) {
  const [rows, setRows] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    key: "",
    title: "",
    body: "",
    channel: "WHATSAPP_WEB",
  });

  const submit = () => {
    startTransition(async () => {
      const res = await createMessageTemplate(form);
      if (!res?.success) {
        toast.error(res?.message || "Failed");
        return;
      }
      toast.success("Template created");
      window.location.reload();
    });
  };

  const toggle = (id: string, next: boolean) => {
    startTransition(async () => {
      const res = await toggleMessageTemplate(id, next);
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
        <h3 className="text-base font-semibold">Create Message Template</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input placeholder="Template key (birthday_wish)" value={form.key} onChange={(e) => setForm((p) => ({ ...p, key: e.target.value }))} />
          <Input placeholder="Title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
          <Input placeholder="Channel" value={form.channel} onChange={(e) => setForm((p) => ({ ...p, channel: e.target.value }))} />
          <div />
          <Textarea
            className="md:col-span-2 min-h-[130px]"
            placeholder="Message body with placeholders like {name}, {coupon}, {points}"
            value={form.body}
            onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
          />
        </div>
        <Button onClick={submit} disabled={isPending}>Create Template</Button>
      </div>

      <div className="rounded-lg border p-5 space-y-3">
        <h3 className="text-base font-semibold">Templates</h3>
        {rows.map((r) => (
          <div key={r.id} className="rounded-md border p-3 flex items-start justify-between gap-3">
            <div className="space-y-1 text-sm">
              <div className="font-medium">{r.title} <span className="text-muted-foreground">({r.key})</span></div>
              <div className="text-muted-foreground">{r.channel} • {r.isActive ? "Active" : "Inactive"}</div>
              <div className="whitespace-pre-wrap">{r.body}</div>
            </div>
            <Button variant="outline" onClick={() => toggle(r.id, !r.isActive)} disabled={isPending}>
              {r.isActive ? "Disable" : "Activate"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

