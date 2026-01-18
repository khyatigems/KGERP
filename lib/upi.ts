export function buildUpiUri(params: {
  vpa: string;
  payeeName: string;
  amount: number;
  transactionNote?: string;
}) {
  const pa = encodeURIComponent(params.vpa);
  const pn = encodeURIComponent(params.payeeName);
  const am = params.amount.toFixed(2);
  const cu = "INR";
  const tn = params.transactionNote ? encodeURIComponent(params.transactionNote) : "";

  let uri = `upi://pay?pa=${pa}&pn=${pn}&am=${am}&cu=${cu}`;
  if (tn) {
    uri += `&tn=${tn}`;
  }
  
  return uri;
}
