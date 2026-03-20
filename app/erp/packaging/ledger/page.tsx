import { getSerialHistory } from "@/app/erp/packaging/actions";
import { SerialLedgerTable } from "./ledger-table";

export default async function LedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const sp = await searchParams;
  const page = parseInt(sp.page || "1", 10);
  const search = sp.search || "";
  
  const { data, pagination } = await getSerialHistory(page, 20, search);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Serial Ledger</h1>
      <SerialLedgerTable data={data} pagination={pagination} />
    </div>
  );
}
