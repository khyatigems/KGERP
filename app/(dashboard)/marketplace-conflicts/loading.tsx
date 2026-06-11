import { Skeleton, TableSkeleton } from "@/components/ui/skeleton";

export default function MarketplaceConflictsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-9 w-40" />
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="flex flex-col gap-1">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-9 w-60" />
        </div>
        <Skeleton className="h-9 w-20" />
      </div>
      <div className="rounded-md border bg-card p-4">
        <TableSkeleton rows={8} columns={8} />
      </div>
    </div>
  );
}
