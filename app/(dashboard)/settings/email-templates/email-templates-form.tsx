"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  updateEmailTemplateAction,
  toggleEmailTemplateAction,
} from "./actions";
import { ZohoConnection } from "@/components/email/zoho-connection";

export interface EmailTemplateViewModel {
  id: string;
  key: string;
  title: string;
  subject: string;
  htmlBody: string | null;
  plainTextBody: string | null;
  isActive: number;
  channel: string;
}

const VARIABLES = [
  "customer_name",
  "order_number",
  "invoice_number",
  "certificate_number",
  "gemstone_name",
  "carat_weight",
  "company_name",
];

export function EmailTemplatesForm({
  templates,
  zohoStatus,
}: {
  templates: EmailTemplateViewModel[];
  zohoStatus?: { configured: boolean; connected: boolean };
}) {
  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-6">
      {zohoStatus && (
        <ZohoConnection configured={zohoStatus.configured} connected={zohoStatus.connected} />
      )}
      <div>
        <h1 className="text-2xl font-bold">Email Templates</h1>
        <p className="text-sm text-muted-foreground">
          Templates used for customer emails (invoice, certificate). Use{" "}
          <code className="rounded bg-muted px-1">{"{{variable}}"}</code> placeholders.
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
          {VARIABLES.map((v) => (
            <code key={v} className="rounded bg-muted px-1.5 py-0.5">
              {"{{" + v + "}}"}
            </code>
          ))}
        </div>
      </div>

      {templates.map((template) => (
        <EmailTemplateCard key={template.id} template={template} />
      ))}

      {templates.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No email templates found. They are seeded automatically on first use.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function EmailTemplateCard({ template }: { template: EmailTemplateViewModel }) {
  const [subject, setSubject] = useState(template.subject ?? "");
  const [htmlBody, setHtmlBody] = useState(template.htmlBody ?? "");
  const [plainTextBody, setPlainTextBody] = useState(template.plainTextBody ?? "");
  const [active, setActive] = useState(template.isActive === 1);
  const [isPending, startTransition] = useTransition();

  const save = () => {
    startTransition(async () => {
      const result = await updateEmailTemplateAction({
        id: template.id,
        subject,
        htmlBody,
        plainTextBody,
      });
      if (result.success) toast.success("Template saved");
      else toast.error(result.message ?? "Failed to save");
    });
  };

  const toggle = (checked: boolean) => {
    setActive(checked);
    startTransition(async () => {
      await toggleEmailTemplateAction(template.id, checked);
      toast.success(checked ? "Template activated" : "Template deactivated");
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{template.title}</CardTitle>
            <CardDescription className="font-mono text-xs">{template.key}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{active ? "Active" : "Inactive"}</span>
            <Switch checked={active} onCheckedChange={toggle} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium">Subject</label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">Plain text body</label>
          <Textarea
            value={plainTextBody}
            onChange={(e) => setPlainTextBody(e.target.value)}
            rows={4}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">HTML body</label>
          <Textarea
            value={htmlBody}
            onChange={(e) => setHtmlBody(e.target.value)}
            rows={5}
          />
        </div>
        <div className="flex justify-end">
          <Button onClick={save} disabled={isPending}>
            {isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
