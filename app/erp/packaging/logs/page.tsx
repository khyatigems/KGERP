import { getVerificationLogs } from "@/app/erp/packaging/actions";
import { VerificationLogsTable } from "./logs-table";
import { WorkspaceHeader } from "@/components/layout/workspace-header";

export default async function LogsPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const page = parseInt(searchParams.page || "1");
  const { data, pagination } = await getVerificationLogs(page);

  return (
    <div className="space-y-6">
      <WorkspaceHeader eyebrow="KhyatiGems · Fulfillment"><h1 className="text-3xl font-bold tracking-tight">Verification Logs</h1></WorkspaceHeader>
      <VerificationLogsTable data={data} pagination={pagination} />
    </div>
  );
}
