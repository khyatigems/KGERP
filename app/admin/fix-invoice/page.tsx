"use client";

import { useState } from "react";

export default function FixInvoicePage() {
  const [invoiceNumber, setInvoiceNumber] = useState("INV-2026-0026");
  const [totalAmount, setTotalAmount] = useState("1000");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch("/api/admin/fix-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceNumber,
          totalAmount: parseFloat(totalAmount)
        })
      });
      
      const data = await response.json();
      setResult({ success: response.ok, data });
    } catch (error) {
      setResult({ success: false, error: String(error) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Fix Invoice Total</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Invoice Number</label>
          <input
            type="text"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Total Amount (₹)</label>
          <input
            type="number"
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Fixing..." : "Fix Invoice"}
        </button>
      </form>
      
      {result && (
        <div className={`mt-4 p-4 rounded ${result.success ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
          {result.success ? (
            <>
              <p className="font-semibold">✓ Success!</p>
              <p>Invoice: {result.data.invoice.invoiceNumber}</p>
              <p>New Total: ₹{result.data.invoice.totalAmount}</p>
            </>
          ) : (
            <>
              <p className="font-semibold">✗ Error</p>
              <p>{result.data?.error || result.error}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
