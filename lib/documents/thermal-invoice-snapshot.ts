import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { InvoiceData } from "@/lib/invoice-generator";

const SNAPSHOT_REASON = "Issued thermal document snapshot (v1)";
interface ThermalSnapshot { kind: "THERMAL_DOCUMENT_V1"; sourceRevision: string; hash: string; data: InvoiceData; }
interface SnapshotStore {
    findMany: (args: { where: { invoiceId: string; reason: string }; orderBy: { createdAt: "desc" } }) => Promise<Array<{ snapshot: string | null }>>;
    count: (args: { where: { invoiceId: string } }) => Promise<number>;
    create: (args: { data: { invoiceId: string; versionNumber: number; reason: string; snapshot: string } }) => Promise<unknown>;
}

export function invoicePrintHash(data: InvoiceData): string {
    const content = { ...data };
    delete content.thermalSourceHash;
    delete content.thermalSourceRevision;
    return createHash("sha256").update(JSON.stringify(content)).digest("hex");
}

export async function readThermalInvoiceSnapshot(invoiceId: string, sourceRevision: string, store: SnapshotStore = prisma.invoiceVersion): Promise<InvoiceData | null> {
    const snapshots = await store.findMany({ where: { invoiceId, reason: SNAPSHOT_REASON }, orderBy: { createdAt: "desc" } });
    for (const row of snapshots) {
        try {
            const parsed = JSON.parse(row.snapshot || "null") as ThermalSnapshot | null;
            if (parsed?.kind !== "THERMAL_DOCUMENT_V1" || parsed.sourceRevision !== sourceRevision || !parsed.data?.invoiceNumber) continue;
            return { ...parsed.data, date: new Date(parsed.data.date), paidAt: parsed.data.paidAt ? new Date(parsed.data.paidAt) : undefined,
                thermalSourceRevision: sourceRevision, thermalSourceHash: parsed.hash };
        } catch { /* Unrelated or malformed history cannot replace invoice data. */ }
    }
    return null;
}

/** Append an immutable rendered-data snapshot to existing invoice history. No invoice number is created. */
export async function saveThermalInvoiceSnapshot(invoiceId: string, data: InvoiceData, store: SnapshotStore = prisma.invoiceVersion) {
    if (!data.thermalSourceRevision || !data.thermalSourceHash) throw new Error("Refresh the invoice preview before printing.");
    if (await readThermalInvoiceSnapshot(invoiceId, data.thermalSourceRevision, store)) return;
    const count = await store.count({ where: { invoiceId } });
    const snapshot: ThermalSnapshot = { kind: "THERMAL_DOCUMENT_V1", sourceRevision: data.thermalSourceRevision, hash: data.thermalSourceHash, data };
    await store.create({ data: { invoiceId, versionNumber: count + 1, reason: SNAPSHOT_REASON, snapshot: JSON.stringify(snapshot) } });
}
