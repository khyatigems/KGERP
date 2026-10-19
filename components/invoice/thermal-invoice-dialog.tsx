"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Printer, Loader2, ExternalLink } from "lucide-react";
import type { InvoiceData } from "@/lib/invoice-generator";
import { createThermalInvoicePDF, DEFAULT_THERMAL_INVOICE_OPTIONS, type ThermalInvoiceOptions, type ThermalInvoiceLayout } from "@/lib/thermal-invoice-generator";
import { getInvoiceDataForThermal, recordThermalInvoiceOutput } from "@/app/(dashboard)/sales/actions";
import { toast } from "sonner";

export function ThermalInvoicePrintButton({ saleId }: { saleId: string }) {
    const [data, setData] = useState<InvoiceData | null>(null);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const load = async () => {
        setLoading(true);
        try {
            const invoice = await getInvoiceDataForThermal(saleId);
            if (!invoice) throw new Error("An active invoice is required before thermal printing.");
            setData(invoice); setOpen(true);
        } catch (reason) { toast.error(reason instanceof Error ? reason.message : "Unable to load invoice"); }
        finally { setLoading(false); }
    };
    return <><Button variant="outline" size="sm" disabled={loading} onClick={load}>{loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Printer className="mr-2 size-4" />}Thermal invoice</Button>{data && <ThermalInvoiceDialog data={data} saleId={saleId} open={open} onOpenChange={setOpen} />}</>;
}

export function ThermalInvoiceDialog({ data, saleId, open, onOpenChange }: { data: InvoiceData; saleId: string; open: boolean; onOpenChange: (value: boolean) => void }) {
    const [options, setOptions] = useState<ThermalInvoiceOptions>(DEFAULT_THERMAL_INVOICE_OPTIONS);
    const [outputBusy, setOutputBusy] = useState(false);
    const renderKey = JSON.stringify({ data, options });
    const [prepared, setPrepared] = useState<{ key: string; result?: { url: string; fileName: string; layout: ThermalInvoiceLayout }; error?: string } | null>(null);
    const result = prepared?.key === renderKey ? prepared.result : undefined;
    const error = prepared?.key === renderKey ? prepared.error : undefined;
    const busy = prepared?.key !== renderKey;
    useEffect(() => {
        if (!open) return;
        let active = true;
        let createdUrl: string | undefined;
        createThermalInvoicePDF(data, options).then(value => {
            if (!active) return;
            createdUrl = URL.createObjectURL(value.blob);
            setPrepared({ key: renderKey, result: { url: createdUrl, fileName: value.fileName, layout: value.layout } });
        }).catch(reason => { if (active) setPrepared({ key: renderKey, error: reason instanceof Error ? reason.message : "Unable to prepare invoice preview" }); });
        return () => { active = false; if (createdUrl) URL.revokeObjectURL(createdUrl); };
    }, [data, options, open, renderKey]);
    const record = (action: "PRINT" | "DOWNLOAD") => recordThermalInvoiceOutput(saleId, action, options, data.thermalSourceHash || "");
    const print = async (autoPrint = true) => {
        if (!result) return;
        const windowRef = window.open("about:blank", "_blank");
        if (!windowRef) { toast.error("Allow popups to open the thermal PDF print window."); return; }
        setOutputBusy(true);
        try {
            await record("PRINT");
            if (autoPrint) windowRef.addEventListener("load", () => { try { windowRef.print(); } catch { /* Browser PDF viewer provides its own print control. */ } }, { once: true });
            windowRef.location.href = result.url;
        } catch (reason) { windowRef.close(); toast.error(reason instanceof Error ? reason.message : "Unable to save the issued invoice snapshot"); }
        finally { setOutputBusy(false); }
    };
    const download = async () => {
        if (!result) return;
        setOutputBusy(true);
        try { await record("DOWNLOAD"); const link = document.createElement("a"); link.href = result.url; link.download = result.fileName; link.click(); }
        catch (reason) { toast.error(reason instanceof Error ? reason.message : "Unable to save the issued invoice snapshot"); }
        finally { setOutputBusy(false); }
    };
    return <Dialog open={open} onOpenChange={value => { if (!outputBusy) onOpenChange(value); }}><DialogContent className="sm:max-w-6xl h-[92vh] flex flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b p-6 pr-12"><DialogTitle>Thermal invoice studio</DialogTitle><DialogDescription>{data.invoiceNumber} · {data.customer.name} · Preview and reprint the existing invoice.</DialogDescription></DialogHeader>
        <div className="grid min-h-0 flex-1 md:grid-cols-[300px_1fr] overflow-auto md:overflow-hidden">
            <fieldset disabled={outputBusy} className="min-w-0 space-y-6 border-r p-5 md:overflow-auto">
                <div className="space-y-2"><Label>Paper width</Label><Select value={String(options.paperWidth)} onValueChange={value => setOptions(previous => ({ ...previous, paperWidth: Number(value) as ThermalInvoiceOptions["paperWidth"] }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="50">50 mm · Exeo label roll</SelectItem><SelectItem value="80">80 mm · Receipt roll</SelectItem><SelectItem value="100">100 mm · Wide thermal</SelectItem></SelectContent></Select><p className="text-xs text-muted-foreground">Match your loaded paper. Wider profiles need a printer and continuous roll that support that width.</p></div>
                <div className="space-y-2"><Label>Document profile</Label><Select value={options.profile} onValueChange={profile => setOptions(previous => ({ ...previous, profile: profile as ThermalInvoiceOptions["profile"] }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="compact">Compact receipt</SelectItem><SelectItem value="detailed">Detailed invoice</SelectItem></SelectContent></Select><p className="text-xs text-muted-foreground">Domestic or export details follow the saved invoice. This control changes presentation.</p></div>
                <div className="space-y-4"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Include on receipt</p>{([
                    ["showLogo", "Company logo"], ["showQr", "Invoice download QR"], ["showCertification", "Saved certification details"], ["showFinancials", "Prices and payment summary"],
                ] as const).map(([key, title]) => <div className="flex items-center gap-3" key={key}><Checkbox id={`thermal-${key}`} checked={options[key]} onCheckedChange={checked => setOptions(previous => ({ ...previous, [key]: Boolean(checked) }))} /><Label htmlFor={`thermal-${key}`}>{title}</Label></div>)}</div>
                {!options.showFinancials && <p className="rounded-lg border bg-muted p-3 text-xs">Prices are hidden for packing verification. Use a receipt with prices for customer billing.</p>}
                <div className="rounded-lg border p-3 text-xs text-muted-foreground space-y-2"><p className="font-medium text-foreground">Print setup</p><p>Use continuous receipt stock, actual size / 100%, and zero driver scaling. A long invoice cannot print on a single 50 × 25 mm die-cut label.</p><p>QR codes keep a four-module white border and at least three printer dots per module.</p></div>
            </fieldset>
            <div className="min-h-0 overflow-auto bg-muted/40 p-5 space-y-4">
                <div className="flex justify-between text-xs text-muted-foreground"><span>Measured PDF preview</span><span>{result ? `${result.layout.width} × ${result.layout.height} mm` : "Preparing…"}</span></div>
                {busy && <div className="flex items-center justify-center gap-2 p-10"><Loader2 className="size-4 animate-spin" />Preparing receipt</div>}
                {error && <div role="alert" className="rounded-lg border border-destructive/40 bg-background p-5 text-sm text-destructive">{error}</div>}
                {result?.layout.warnings.map(warning => <div key={warning} role="status" className="rounded-lg border border-amber-400/40 bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200 p-3 text-sm">{warning}</div>)}
                {result && <div className="overflow-auto"><div className="mx-auto w-fit bg-white shadow-md border"><ReceiptPreview layout={result.layout} /></div></div>}
            </div>
        </div>
        <div className="border-t p-4 flex flex-wrap justify-between items-center gap-3"><p className="text-xs text-muted-foreground">Issued data is saved before output. Reprints keep the same invoice number.</p><div className="flex flex-wrap gap-2"><Button variant="outline" disabled={!result || busy || outputBusy} onClick={() => print(false)}><ExternalLink className="mr-2 size-4" />Open PDF</Button><Button variant="outline" disabled={!result || busy || outputBusy} onClick={download}><Download className="mr-2 size-4" />Download</Button><Button disabled={!result || busy || outputBusy} onClick={() => print()}>{outputBusy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Printer className="mr-2 size-4" />}Print / reprint</Button></div></div>
    </DialogContent></Dialog>;
}

function ReceiptPreview({ layout }: { layout: ThermalInvoiceLayout }) {
    return <svg role="img" aria-label="Thermal invoice preview" viewBox={`0 0 ${layout.width} ${layout.height}`} style={{ width: `${layout.width * 4.5}px`, height: `${layout.height * 4.5}px` }} xmlns="http://www.w3.org/2000/svg">
        <rect width={layout.width} height={layout.height} fill="white" />
        {layout.elements.map((element, index) => {
            if (element.kind === "text") return <text key={index} x={element.x} y={element.y} dominantBaseline="text-before-edge" textAnchor={element.align === "center" ? "middle" : element.align === "right" ? "end" : "start"} fontFamily="Helvetica, Arial, sans-serif" fontSize={element.size * 25.4 / 72} fontWeight={element.bold ? 700 : 400} fill="black">{element.text}</text>;
            if (element.kind === "rule") return <line key={index} x1={element.x} x2={element.x + element.width} y1={element.y} y2={element.y} stroke="black" strokeWidth={0.15} />;
            if (element.kind === "logo") return <image key={index} href={element.source} x={element.x} y={element.y} width={element.width} height={element.height} />;
            const step = element.width / (element.modules + 8);
            return <g key={index} fill="black" shapeRendering="crispEdges">{element.matrix.flatMap((row, r) => row.map((dark, c) => dark ? <rect key={`${r}-${c}`} x={element.x + (c + 4) * step} y={element.y + (r + 4) * step} width={step} height={step} /> : null))}</g>;
        })}
    </svg>;
}
