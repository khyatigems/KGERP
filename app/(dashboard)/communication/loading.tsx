import { Card, CardContent } from "@/components/ui/card";

export default function CommunicationCenterLoading() {
  return (
    <div className="space-y-6 p-6" aria-label="Loading Communication Center">
      <div className="space-y-2">
        <div className="h-8 w-72 animate-pulse rounded bg-muted" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded bg-muted" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
        {Array.from({ length: 7 }, (_, index) => (
          <Card key={index}>
            <CardContent className="space-y-3 p-4">
              <div className="h-4 w-28 animate-pulse rounded bg-muted" />
              <div className="h-7 w-16 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="space-y-4 p-4">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="h-12 animate-pulse rounded bg-muted" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
