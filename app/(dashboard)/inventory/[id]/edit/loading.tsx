import { FormSkeleton, Skeleton } from "@/components/ui/skeleton";

export default function EditInventoryLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-48" />
      <div className="rounded-xl border bg-card p-6">
        <FormSkeleton />
      </div>
    </div>
  );
}
