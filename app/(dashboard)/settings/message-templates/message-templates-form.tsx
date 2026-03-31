"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createMessageTemplate, toggleMessageTemplate, type MessageTemplateRow } from "./actions";
import { Edit2, Save, X } from "lucide-react";

type EditingTemplate = {
  id: string;
  key: string;
  title: string;
  body: string;
  channel: string;
};

export function MessageTemplatesForm({ initial }: { initial: MessageTemplateRow[] }) {
  const [rows, setRows] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState<EditingTemplate | null>(null);
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

  const startEdit = (template: MessageTemplateRow) => {
    setEditing({
      id: template.id,
      key: template.key,
      title: template.title,
      body: template.body,
      channel: template.channel,
    });
  };

  const cancelEdit = () => {
    setEditing(null);
  };

  const saveEdit = () => {
    if (!editing) return;
    startTransition(async () => {
      try {
        const res = await fetch("/api/message-templates", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editing),
        });
        const data = await res.json();
        if (!data.success) {
          toast.error(data.message || "Failed to update");
          return;
        }
        toast.success("Template updated");
        setRows((p) => p.map((r) => (r.id === editing.id ? { ...r, ...editing } : r)));
        setEditing(null);
      } catch (e) {
        toast.error("Failed to update");
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Create Message Template</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Select value={form.key} onValueChange={(v) => setForm((p) => ({ ...p, key: v }))}>
            <SelectTrigger><SelectValue placeholder="Template Key" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="birthday_wish">Birthday Wish</SelectItem>
              <SelectItem value="anniversary_wish">Anniversary Wish</SelectItem>
              <SelectItem value="general_wish">General Wish</SelectItem>
              <SelectItem value="sales_invoice">Sales Invoice</SelectItem>
              <SelectItem value="loyalty_reminder">Loyalty Reminder</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
          <Select value={form.channel} onValueChange={(v) => setForm((p) => ({ ...p, channel: v }))}>
            <SelectTrigger><SelectValue placeholder="Channel" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="WHATSAPP_WEB">WhatsApp Web</SelectItem>
            </SelectContent>
          </Select>
          <div />
          <Textarea
            className="md:col-span-2 min-h-[130px]"
            placeholder="Message body with placeholders like {name}, {invoice}, {invoice_link}"
            value={form.body}
            onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
          />
        </div>
        <div className="text-xs text-muted-foreground">Supported placeholders: {"{name}"}, {"{invoice}"}, {"{invoice_link}"}, {"{link}"}, {"{points}"}, {"{coupon}"}</div>
        <Button onClick={submit} disabled={isPending}>Create Template</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Templates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
        {rows.map((r) => (
          <div key={r.id} className="rounded-md border p-3 flex items-start justify-between gap-3">
            {editing && editing.id === r.id ? (
              <div className="flex-1 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Select value={editing.key} onValueChange={(v) => setEditing((p) => p ? { ...p, key: v } : null)}>
                    <SelectTrigger><SelectValue placeholder="Template Key" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="birthday_wish">Birthday Wish</SelectItem>
                      <SelectItem value="anniversary_wish">Anniversary Wish</SelectItem>
                      <SelectItem value="general_wish">General Wish</SelectItem>
                      <SelectItem value="sales_invoice">Sales Invoice</SelectItem>
                      <SelectItem value="loyalty_reminder">Loyalty Reminder</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input placeholder="Title" value={editing.title} onChange={(e) => setEditing((p) => p ? { ...p, title: e.target.value } : null)} />
                  <Select value={editing.channel} onValueChange={(v) => setEditing((p) => p ? { ...p, channel: v } : null)}>
                    <SelectTrigger><SelectValue placeholder="Channel" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WHATSAPP_WEB">WhatsApp Web</SelectItem>
                    </SelectContent>
                  </Select>
                  <div />
                </div>
                <Textarea
                  className="min-h-[130px]"
                  placeholder="Message body with placeholders"
                  value={editing.body}
                  onChange={(e) => setEditing((p) => p ? { ...p, body: e.target.value } : null)}
                />
                <div className="flex gap-2">
                  <Button onClick={saveEdit} disabled={isPending} size="sm">
                    <Save className="w-3 h-3 mr-1" /> Save
                  </Button>
                  <Button variant="outline" onClick={cancelEdit} size="sm">
                    <X className="w-3 h-3 mr-1" /> Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-1 text-sm flex-1">
                  <div className="font-medium">{r.title} <span className="text-muted-foreground">({r.key})</span></div>
                  <div className="text-muted-foreground">{r.channel} • {r.isActive ? "Active" : "Inactive"}</div>
                  <div className="whitespace-pre-wrap">{r.body}</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => toggle(r.id, !r.isActive)} disabled={isPending}>
                    {r.isActive ? "Disable" : "Activate"}
                  </Button>
                  <Button variant="outline" onClick={() => startEdit(r)} disabled={isPending}>
                    <Edit2 className="w-3 h-3" />
                  </Button>
                </div>
              </>
            )}
          </div>
        ))}
        </CardContent>
      </Card>
    </div>
  );
}
