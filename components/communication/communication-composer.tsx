"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { decodeHtmlEntities, htmlToPlainText } from "@/lib/email/content";

interface ContactOption {
  id: string;
  name: string;
  email: string | null;
}

interface InvoiceOption {
  id: string;
  invoiceNumber: string;
  quotationId: string | null;
  orderNumber: string;
  purchaseDate: string;
}

interface TemplateOption {
  key: string;
  title: string;
  subject: string;
  htmlBody: string | null;
  plainTextBody: string | null;
}

interface StoredAttachment {
  fileName: string;
  mimeType: string;
  contentBase64: string;
  size: number;
}

interface ComposerInitial {
  to: string;
  cc: string;
  subject: string;
  body: string;
  customerId: string;
  orderId: string;
  attachInvoice: boolean;
  threadId: string;
  inReplyTo: string;
  references: string[];
  sourceId: string;
  mode: string;
}

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_TOTAL_BYTES = 3 * 1024 * 1024;

function renderVariables(value: string, variables: Record<string, string>) {
  return value.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key: string) => variables[key] ?? match);
}

export function CommunicationComposer({
  customers,
  invoices,
  templates,
  initial,
}: {
  customers: ContactOption[];
  invoices: InvoiceOption[];
  templates: TemplateOption[];
  initial: ComposerInitial;
}) {
  const router = useRouter();
  const idempotencyKeyRef = useRef<string | null>(null);
  const [to, setTo] = useState(initial.to);
  const [cc, setCc] = useState(initial.cc);
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState(initial.subject);
  const [body, setBody] = useState(initial.body);
  const [customerId, setCustomerId] = useState(initial.customerId);
  const [orderId, setOrderId] = useState(initial.orderId);
  const [attachInvoice, setAttachInvoice] = useState(initial.attachInvoice);
  const [templateKey, setTemplateKey] = useState("");
  const [scheduleValue, setScheduleValue] = useState("");
  const [attachments, setAttachments] = useState<StoredAttachment[]>([]);
  const [busy, setBusy] = useState(false);
  const customer = customers.find((item) => item.id === customerId);
  const invoice = invoices.find((item) => item.id === orderId);
  const variables: Record<string, string> = {
    customer_name: customer?.name || "",
    invoice_number: invoice?.invoiceNumber || "",
    purchase_date: invoice?.purchaseDate || "",
    order_number: invoice?.orderNumber || "",
    order_number_line: invoice?.orderNumber ? `Marketplace order reference: ${invoice.orderNumber}` : "",
    company_name: "KhyatiGems",
  };
  useEffect(() => {
    const template = templates.find((item) => item.key === templateKey);
    if (!template) return;
    const templateVariables = {
      customer_name: customer?.name || "",
      invoice_number: invoice?.invoiceNumber || "",
      purchase_date: invoice?.purchaseDate || "",
      order_number: invoice?.orderNumber || "",
      order_number_line: invoice?.orderNumber ? `Marketplace order reference: ${invoice.orderNumber}` : "",
      company_name: "KhyatiGems",
    };
    setSubject(renderVariables(decodeHtmlEntities(template.subject), templateVariables));
    const templateText = template.plainTextBody
      ? decodeHtmlEntities(template.plainTextBody)
      : htmlToPlainText(template.htmlBody || "");
    setBody(renderVariables(templateText, templateVariables));
  }, [templateKey, customer?.name, invoice?.invoiceNumber, invoice?.orderNumber, invoice?.purchaseDate, templates]);

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    let totalSize = attachments.reduce((sum, item) => sum + item.size, 0);
    const newAttachments: StoredAttachment[] = [];
    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_BYTES) {
        toast.error(`${file.name} exceeds the 2 MB per-file limit`);
        continue;
      }
      totalSize += file.size;
      if (totalSize > MAX_TOTAL_BYTES) {
        toast.error("Total attachment size cannot exceed 3 MB");
        break;
      }
      const contentBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result !== "string") {
            reject(new Error(`Unable to read ${file.name}`));
            return;
          }
          resolve(reader.result.split(",")[1] || "");
        };
        reader.onerror = () => reject(reader.error || new Error(`Unable to read ${file.name}`));
        reader.readAsDataURL(file);
      });
      newAttachments.push({
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        contentBase64,
        size: file.size,
      });
    }
    setAttachments((current) => [...current, ...newAttachments]);
  }

  function chooseTemplate(key: string) {
    setTemplateKey(key);
  }

  async function submit(action: "SEND" | "DRAFT" | "SCHEDULE") {
    if (action !== "DRAFT" && !to.trim()) {
      toast.error("Enter a recipient before sending or scheduling");
      return;
    }
    if (action === "SCHEDULE" && !scheduleValue) {
      toast.error("Choose a date and time to schedule this email");
      return;
    }
    setBusy(true);
    const toastId = toast.loading(
      action === "DRAFT" ? "Saving draft…" : action === "SCHEDULE" ? "Scheduling email…" : "Sending email…",
    );
    try {
      idempotencyKeyRef.current ||= globalThis.crypto.randomUUID();
      const response = await fetch("/api/email/communications/compose", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKeyRef.current,
        },
        body: JSON.stringify({
          action,
          to,
          cc: cc.split(/[;,]/).map((item) => item.trim()).filter(Boolean),
          bcc: bcc.split(/[;,]/).map((item) => item.trim()).filter(Boolean),
          subject,
          text: body ? renderVariables(body, variables) : undefined,
          templateKey: templateKey || undefined,
          variables,
          customerId: customerId || undefined,
          orderId: orderId || undefined,
          attachInvoice,
          attachments: attachments.map((attachment) => ({
            fileName: attachment.fileName,
            mimeType: attachment.mimeType,
            contentBase64: attachment.contentBase64,
          })),
          threadId: initial.threadId || undefined,
          inReplyTo: initial.inReplyTo || undefined,
          references: initial.references,
          scheduledAt: action === "SCHEDULE" ? new Date(scheduleValue).toISOString() : undefined,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        if (result.logId) {
          toast.error(result.error || "Email needs attention before another attempt", { id: toastId });
          router.push(`/communication/${result.logId}`);
          router.refresh();
          return;
        }
        throw new Error(result.error || "Email could not be saved");
      }
      toast.success(
        action === "DRAFT"
          ? "Draft saved"
          : action === "SCHEDULE"
            ? "Email scheduled"
            : result.status === "SENT"
              ? "Email sent"
              : "Email queued for processing",
        { id: toastId },
      );
      router.push(`/communication/${result.logId}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Email could not be saved", { id: toastId });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-2">
        <Link href={initial.sourceId ? `/communication/${initial.sourceId}` : "/communication"} className="text-sm text-primary hover:underline">
          ← {initial.sourceId ? "Back to communication" : "Communication Center"}
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">
          {initial.mode === "forward" ? "Forward Email" : initial.sourceId ? "Reply to Email" : "Compose Email"}
        </h1>
      </div>
      {initial.sourceId && (
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href={`/communication/compose?reply=${initial.sourceId}&mode=reply`} className="rounded border px-3 py-1.5">Reply</Link>
          <Link href={`/communication/compose?reply=${initial.sourceId}&mode=replyAll`} className="rounded border px-3 py-1.5">Reply All</Link>
          <Link href={`/communication/compose?reply=${initial.sourceId}&mode=forward`} className="rounded border px-3 py-1.5">Forward</Link>
        </div>
      )}

      <div className="space-y-4 rounded-xl border bg-card p-5">
        <label className="block space-y-1 text-sm">
          <span className="font-medium">To</span>
          <input value={to} onChange={(event) => setTo(event.target.value)} list="communication-contacts" type="email" multiple={false} className="w-full rounded-md border bg-background px-3 py-2" />
          <datalist id="communication-contacts">
            {customers.map((item) => item.email && <option key={item.id} value={item.email}>{item.name}</option>)}
          </datalist>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span className="font-medium">CC</span>
            <input value={cc} onChange={(event) => setCc(event.target.value)} placeholder="Separate addresses with commas" className="w-full rounded-md border bg-background px-3 py-2" />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">BCC</span>
            <input value={bcc} onChange={(event) => setBcc(event.target.value)} placeholder="Separate addresses with commas" className="w-full rounded-md border bg-background px-3 py-2" />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Customer</span>
            <select
              value={customerId}
              onChange={(event) => {
                const nextId = event.target.value;
                setCustomerId(nextId);
                const nextCustomer = customers.find((item) => item.id === nextId);
                if (nextCustomer?.email) setTo(nextCustomer.email);
              }}
              className="w-full rounded-md border bg-background px-3 py-2"
            >
              <option value="">No customer</option>
              {customers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Invoice</span>
            <select
              value={orderId}
              onChange={(event) => {
                const selectedInvoice = event.target.value;
                setOrderId(selectedInvoice);
                setAttachInvoice(Boolean(selectedInvoice));
              }}
              className="w-full rounded-md border bg-background px-3 py-2"
            >
              <option value="">No invoice</option>
              {invoices.map((item) => <option key={item.id} value={item.id}>#{item.invoiceNumber}</option>)}
            </select>
            <label className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                checked={attachInvoice}
                disabled={!orderId}
                onChange={(event) => setAttachInvoice(event.target.checked)}
              />
              <span>Generate and attach this invoice as a PDF</span>
            </label>
            <span className="block text-xs text-muted-foreground">
              When selected, the PDF is generated from the invoice record. A missing or oversized PDF stops the send instead of sending without it.
            </span>
          </label>
        </div>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Email Template</span>
          <select value={templateKey} onChange={(event) => chooseTemplate(event.target.value)} className="w-full rounded-md border bg-background px-3 py-2">
            <option value="">No template</option>
            {templates.map((item) => <option key={item.key} value={item.key}>{item.title}</option>)}
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Subject</span>
          <input value={subject} onChange={(event) => setSubject(event.target.value)} className="w-full rounded-md border bg-background px-3 py-2" />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Message</span>
          <textarea value={body} onChange={(event) => setBody(event.target.value)} rows={12} className="w-full rounded-md border bg-background px-3 py-2" />
        </label>
        <div className="space-y-2">
          <label className="block text-sm font-medium" htmlFor="communication-attachments">Manual attachments (2 MB each, 3 MB total)</label>
          <input
            id="communication-attachments"
            type="file"
            multiple
            onChange={(event) => {
              void addFiles(event.target.files).catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Could not read selected files"));
              event.currentTarget.value = "";
            }}
            className="block w-full text-sm"
          />
          {attachments.map((attachment, index) => (
            <div key={`${attachment.fileName}-${index}`} className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate">{attachment.fileName} · {(attachment.size / 1024).toFixed(0)} KB</span>
              <button type="button" onClick={() => setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="text-destructive transition-colors hover:text-destructive/80 active:scale-95">
                Remove
              </button>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4 border-t pt-4">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Schedule for</span>
            <input type="datetime-local" value={scheduleValue} onChange={(event) => setScheduleValue(event.target.value)} className="block rounded-md border bg-background px-3 py-2" />
            <span className="block text-xs text-muted-foreground">Scheduled emails send when an operator processes the due queue.</span>
          </label>
          <div className="flex flex-wrap gap-2">
            <p className="w-full text-xs text-muted-foreground">Generated invoice PDFs may be up to 20 MB; total message attachments are limited to 20 MB.</p>
            <button type="button" disabled={busy} onClick={() => void submit("DRAFT")} className="rounded-md border px-4 py-2 text-sm transition-all hover:-translate-y-0.5 hover:bg-muted active:scale-95 disabled:opacity-50">
              {busy && <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />}Save Draft
            </button>
            {scheduleValue && <button type="button" disabled={busy} onClick={() => void submit("SCHEDULE")} className="rounded-md border px-4 py-2 text-sm transition-all hover:-translate-y-0.5 hover:bg-muted active:scale-95 disabled:opacity-50">
              {busy && <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />}Schedule
            </button>}
            <button type="button" disabled={busy} onClick={() => void submit("SEND")} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground transition-all hover:-translate-y-0.5 hover:brightness-110 active:scale-95 disabled:opacity-50">
              {busy && <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />}Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
