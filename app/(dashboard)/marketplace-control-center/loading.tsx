import { Skeleton, TableSkeleton } from "@/components/ui/skeleton";

export default function MarketplaceControlCenterLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-72" />
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="flex flex-col gap-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="flex flex-col gap-1">
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="flex flex-col gap-1">
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-9 w-36" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-36" />
        ))}
      </div>
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-36" />
        <Skeleton className="h-10 w-36" />
        <Skeleton className="h-10 w-40" />
      </div>
    </div>
  );
}
