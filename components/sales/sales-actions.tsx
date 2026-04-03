"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2, MoreHorizontal, ExternalLink, FileText, Printer, MessageCircle } from "lucide-react";
import { deleteSale, getInvoiceDataForThermal } from "@/app/(dashboard)/sales/actions";
import { generateThermalInvoicePDF } from "@/lib/thermal-invoice-generator";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export type WhatsappTemplate = {
  id: string;
  key: string;
  title: string;
  body: string;
};

interface SalesActionsProps {
  saleId: string;
  invoiceToken?: string | null;
  canDelete: boolean;
  allowConfigureInvoice?: boolean;
  invoiceNumber?: string;
  customerName?: string;
  customerPhone?: string;
  invoiceUrl?: string;
  messageTemplates?: WhatsappTemplate[];
}

const normalizePhone = (input?: string | null) => {
  const raw = String(input || "").replace(/[^\d+]/g, "");
  if (!raw) return "";
  if (raw.startsWith("+") && raw.length >= 11) return raw.replace(/^\+/, "");
  if (raw.length === 10) return `91${raw}`;
  return raw;
};

const substitutePlaceholders = (template: string, replacements: Record<string, string>) => {
  let output = template;
  for (const [key, value] of Object.entries(replacements)) {
    output = output.replaceAll(new RegExp(key, "gi"), value);
  }
  return output;
};

export function SalesActions({
  saleId,
  invoiceToken,
  canDelete,
  allowConfigureInvoice = true,
  invoiceNumber,
  customerName,
  customerPhone,
  invoiceUrl,
  messageTemplates = [],
}: SalesActionsProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    messageTemplates.length > 0 ? messageTemplates[0].id : null
  );
  const [isSending, setIsSending] = useState(false);
  const router = useRouter();

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    setDeleteOpen(true);
  };

  const handleThermalPrint = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
        const data = await getInvoiceDataForThermal(saleId);
        if (!data) {
            toast.error("Error", {
                description: "Failed to load invoice data. Ensure invoice is generated."
            });
            return;
        }
        await generateThermalInvoicePDF(data);
    } catch (error) {
        console.error(error);
        toast.error("Error", {
            description: "Failed to generate thermal invoice."
        });
    } finally {
        setIsGenerating(false);
    }
  };

  const friendlyName = (customerName || "Customer").trim();
  const normalizedPhone = useMemo(() => normalizePhone(customerPhone), [customerPhone]);

  const selectedTemplate = useMemo(() => {
    if (!selectedTemplateId) return null;
    return messageTemplates.find((template) => template.id === selectedTemplateId) || null;
  }, [selectedTemplateId, messageTemplates]);

  const whatsappMessage = useMemo(() => {
    const replacements: Record<string, string> = {
      "{name}": friendlyName || "Customer",
      "{invoice}": invoiceNumber || "",
      "{invoice_number}": invoiceNumber || "",
      "{link}": invoiceUrl || "",
      "{invoice_link}": invoiceUrl || "",
      "{date}": new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" }),
    };

    const templateBody = selectedTemplate?.body || "Thank you for your purchase with KhyatiGems™.";
    const substituted = substitutePlaceholders(templateBody, replacements);

    // If template already starts with "Dear", don't double-prefix
    const hasDearPrefix = substituted.trim().toLowerCase().startsWith("dear");
    const finalLines = hasDearPrefix ? [substituted] : [
      `Dear ${friendlyName || "Customer"},`,
      "",
      substituted,
    ];

    // Ensure invoice link is included if template doesn't already have it
    if (invoiceUrl && !substituted.includes(invoiceUrl)) {
      finalLines.push("", `Invoice: ${invoiceUrl}`);
    }

    // Add signature only if not already in template
    if (!substituted.toLowerCase().includes("khyatigems")) {
      finalLines.push("", "Warm regards,", "KhyatiGems™ Team");
    }

    return finalLines.join("\n");
  }, [friendlyName, selectedTemplate, invoiceNumber, invoiceUrl]);

  const handleOpenWhatsapp = () => {
    if (!invoiceUrl) {
      toast.error("Invoice link unavailable", {
        description: "Generate the invoice before sending via WhatsApp.",
      });
      return;
    }
    if (!normalizedPhone) {
      toast.error("Customer phone missing", {
        description: "Please ensure the customer has a valid phone number before sending WhatsApp messages.",
      });
      return;
    }
    setWhatsappOpen(true);
  };

  const sendWhatsappMessage = () => {
    if (!normalizedPhone) {
      toast.error("Phone number not available");
      return;
    }
    setIsSending(true);
    try {
      const url = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(whatsappMessage)}`;
      window.open(url, "_blank", "noopener,noreferrer");
      toast.success("WhatsApp opened in new tab");
      setWhatsappOpen(false);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            {isDeleting || isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {allowConfigureInvoice ? (
            <DropdownMenuItem asChild>
              <Link href={`/sales/${saleId}/create-invoice`}>
                <FileText className="mr-2 h-4 w-4" /> {invoiceToken ? "Configure Invoice" : "Create Invoice"}
              </Link>
            </DropdownMenuItem>
          ) : null}
          {invoiceToken && (
              <>
                  <DropdownMenuItem asChild>
                      <Link href={`/invoice/${invoiceToken}`} target="_blank">
                          <ExternalLink className="mr-2 h-4 w-4" /> View Invoice
                      </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleThermalPrint}>
                      <Printer className="mr-2 h-4 w-4" /> Print Thermal Invoice
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleOpenWhatsapp()}
                    disabled={!invoiceUrl}
                  >
                    <MessageCircle className="mr-2 h-4 w-4" /> Send via WhatsApp
                  </DropdownMenuItem>
              </>
          )}
          {canDelete && (
              <DropdownMenuItem onClick={handleDelete} className="text-red-600 focus:text-red-600">
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Sale
              </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sale</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this sale? This will revert the inventory item to IN_STOCK and may delete the linked invoice if no other items remain.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setIsDeleting(true);
                try {
                  const res = await deleteSale(saleId);
                  if (res && (res as unknown as { message?: string }).message) {
                    toast.error((res as { message: string }).message);
                  } else {
                    toast.success("Sale deleted successfully");
                    router.refresh();
                  }
                } catch (e) {
                  console.error(e);
                  toast.error("Failed to delete sale");
                } finally {
                  setIsDeleting(false);
                  setDeleteOpen(false);
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={whatsappOpen} onOpenChange={setWhatsappOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Send Invoice via WhatsApp</DialogTitle>
            <DialogDescription>
              Send the invoice to the customer via WhatsApp message.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="wa-template">Select Template</Label>
              {messageTemplates.length > 0 ? (
                <Select
                  value={selectedTemplateId ?? undefined}
                  onValueChange={(value) => setSelectedTemplateId(value)}
                >
                  <SelectTrigger id="wa-template">
                    <SelectValue placeholder="Choose a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {messageTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.title || template.key}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  No active WhatsApp templates found. Create one in Settings → Message Templates.
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="wa-preview">Message Preview</Label>
              <Textarea
                id="wa-preview"
                value={whatsappMessage}
                readOnly
                rows={10}
                className="resize-none"
              />
            </div>

            <div className="rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <p><span className="font-semibold">Recipient:</span> {customerName || "Customer"} ({customerPhone || "No phone"})</p>
              {invoiceNumber && <p><span className="font-semibold">Invoice:</span> {invoiceNumber}</p>}
              {invoiceUrl && <p className="truncate"><span className="font-semibold">Link:</span> {invoiceUrl}</p>}
            </div>
          </div>
          <DialogFooter className="flex justify-between gap-2">
            <Button variant="outline" onClick={() => setWhatsappOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={sendWhatsappMessage}
              disabled={!normalizedPhone || !invoiceUrl || isSending}
            >
              {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageCircle className="mr-2 h-4 w-4" />}
              Open WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
