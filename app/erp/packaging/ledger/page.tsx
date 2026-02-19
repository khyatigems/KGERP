import { getSerialHistory } from "@/app/erp/packaging/actions";
import { SerialLedgerTable } from "./ledger-table";

export default async function LedgerPage({
  searchParams,
}: {
  searchParams: { page?: string; search?: string };
}) {
  const page = parseInt(searchParams.page || "1");
  const search = searchParams.search || "";
  
  const { data, pagination } = await getSerialHistory(page, 20, search);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Serial Ledger</h1>
      <SerialLedgerTable data={data} pagination={pagination} />
    </div>
  );
}
