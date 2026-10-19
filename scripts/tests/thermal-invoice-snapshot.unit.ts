import assert from "node:assert/strict";
import { invoicePrintHash, readThermalInvoiceSnapshot, saveThermalInvoiceSnapshot } from "../../lib/documents/thermal-invoice-snapshot";
import type { InvoiceData } from "../../lib/invoice-generator";

async function run() {
    const rows: Array<{ snapshot: string | null }> = [];
    const store = {
        findMany: async () => rows,
        count: async () => rows.length,
        create: async (args: { data: { snapshot: string } }) => { rows.push({ snapshot: args.data.snapshot }); },
    };
    const data = { invoiceNumber: "TEST-001", date: new Date("2026-10-19T12:00:00Z"), total: 123, thermalSourceRevision: "revision-1", company: { name: "Original company name" } } as InvoiceData;
    data.thermalSourceHash = invoicePrintHash(data);
    await saveThermalInvoiceSnapshot("invoice-1", data, store);
    await saveThermalInvoiceSnapshot("invoice-1", { ...data, total: 999 }, store);
    assert.equal(rows.length, 1, "Reprinting must not rewrite an issued snapshot");
    const saved = await readThermalInvoiceSnapshot("invoice-1", "revision-1", store);
    assert.equal(saved?.total, 123);
    assert(saved?.date instanceof Date);
    assert.equal(saved?.company.name, "Original company name");
    assert.equal(await readThermalInvoiceSnapshot("invoice-1", "new-revision", store), null, "Explicit invoice revisions must not load the previous revision");
    assert.notEqual(invoicePrintHash({ ...data, total: 124 }), data.thermalSourceHash);
    assert.equal(invoicePrintHash({ ...data, thermalSourceHash: "metadata-only" }), data.thermalSourceHash);
    rows.unshift({ snapshot: "invalid JSON" });
    assert.equal((await readThermalInvoiceSnapshot("invoice-1", "revision-1", store))?.total, 123);
    console.log("thermal-invoice-snapshot.unit.ts passed");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
