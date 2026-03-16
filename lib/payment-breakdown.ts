type PaymentLike = {
  amount: number;
  method: string;
  date?: Date | string | null;
  reference?: string | null;
};

export type PaymentBreakdownRow = {
  method: string;
  amount: number;
  count: number;
};

export function getPaymentMethodLabel(method: string) {
  return method.replaceAll("_", " ");
}

export function aggregateInvoicePayments(payments: PaymentLike[]) {
  const rowsMap = new Map<string, PaymentBreakdownRow>();
  let totalReceived = 0;
  let totalRefunded = 0;

  for (const payment of payments || []) {
    const amount = Number(payment.amount || 0);
    const method = String(payment.method || "OTHER");
    const existing = rowsMap.get(method) || { method, amount: 0, count: 0 };
    existing.amount += amount;
    existing.count += 1;
    rowsMap.set(method, existing);

    if (amount >= 0) totalReceived += amount;
    else totalRefunded += Math.abs(amount);
  }

  const rows = Array.from(rowsMap.values()).sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
  const netReceived = totalReceived - totalRefunded;
  const primaryMethod = rows.length > 0 ? rows[0].method : undefined;

  return {
    rows,
    totalReceived,
    totalRefunded,
    netReceived,
    primaryMethod,
  };
}
