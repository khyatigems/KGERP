import { VoucherReport } from "@/components/accounting/voucher-report";

export default function AccountingReportsPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Accounting Reports</h1>
          <p className="text-muted-foreground">View vouchers, ledgers, and financial activity</p>
        </div>
      </div>
      
      <VoucherReport />
    </div>
  );
}
