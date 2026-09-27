import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function PurchasesLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
        {Array.from({ length: 7 }).map((_, i) => (
          <Card key={i} className={i < 4 ? "xl:col-span-3" : "xl:col-span-4"}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Skeleton className="h-12 w-full" />
      <div className="rounded-md border bg-card p-4">
        <div className="grid grid-cols-8 gap-4 pb-3 border-b">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-4" />
          ))}
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="grid grid-cols-8 gap-4 py-3 border-b last:border-0">
            {Array.from({ length: 8 }).map((_, j) => (
              <Skeleton key={j} className="h-4" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
