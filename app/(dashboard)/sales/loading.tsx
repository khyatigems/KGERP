import { Skeleton, TableSkeleton } from "@/components/ui/skeleton";

export default function SalesLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-52" />
          <div className="hidden gap-2 lg:flex">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-36" />
          </div>
        </div>
        <Skeleton className="h-10 w-full max-w-[460px]" />
      </div>
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="rounded-md border bg-card">
          <div className="border-b p-4">
            <Skeleton className="h-6 w-56" />
          </div>
          <div className="p-4">
            <TableSkeleton rows={5} columns={8} />
          </div>
        </div>
      ))}
    </div>
  );
}
