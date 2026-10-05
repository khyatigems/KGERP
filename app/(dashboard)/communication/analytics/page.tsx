import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { getCommunicationAnalytics } from "@/lib/email/analytics";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { formatMarketplaceDateTime } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Communication Analytics & Health",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function Metric({ label, value, description }: { label: string; value: string | number; description?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
        {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
}

export default async function CommunicationAnalyticsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!(await checkUserPermission(session.user.id, PERMISSIONS.COMMUNICATION_VIEW))) redirect("/");

  const analytics = await getCommunicationAnalytics();
  const metric = analytics.metrics;
  const providerBadge = (configured: boolean, active: boolean) =>
    !configured ? "Not configured" : active ? "Active · configured" : "Configured";

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/communication" className="text-sm text-primary hover:underline">← Communication Center</Link>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Communication Analytics & Health</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Email performance for the last 30 days. WhatsApp figures represent manual handoffs, not delivery.
          </p>
        </div>
        <Badge
          variant={analytics.health.level === "HEALTHY" ? "default" : analytics.health.level === "CRITICAL" ? "destructive" : "secondary"}
          className="px-3 py-1"
        >
          {analytics.health.label}
        </Badge>
      </div>

      <section aria-label="Email delivery metrics" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Sent" value={metric.sent} description="Provider accepted" />
        <Metric label="Delivered" value={metric.delivered} description="Confirmed by provider events" />
        <Metric label="Opened" value={metric.opened} description="Provider-reported opens" />
        <Metric label="Bounced" value={metric.bounced} description="Provider-reported bounces" />
        <Metric label="Failed" value={metric.failed} />
        <Metric label="Queue size" value={metric.queueSize} description={`${metric.dueNow} ready for manual processing`} />
        <Metric label="Failure rate" value={metric.failureRate === null ? "—" : `${metric.failureRate}%`} />
        <Metric label="Retry rate" value={metric.retryRate === null ? "—" : `${metric.retryRate}%`} />
        <Metric label="Avg. delivery time" value={metric.averageDeliverySeconds === null ? "—" : `${metric.averageDeliverySeconds}s`} />
        <Metric label="Avg. response time" value={metric.averageResponseHours === null ? "—" : `${metric.averageResponseHours}h`} />
        <Metric label="Customers contacted" value={metric.customersContacted} />
        <Metric label="Customers responded" value={metric.customersResponded} />
        <Metric label="Awaiting response" value={metric.awaitingResponse} />
        <Metric label="Overdue follow-ups" value={metric.overdueFollowUps} />
        <Metric label="Due in 7 days" value={metric.upcomingFollowUps} />
        <Metric label="Inbound inbox" value={metric.queued} description="Email queue total is shown above" />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Email type performance</CardTitle></CardHeader>
          <CardContent>
            {analytics.byEmailType.length === 0 ? (
              <p className="text-sm text-muted-foreground">No outbound email activity in the last 30 days.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-left text-muted-foreground"><th className="py-2 pr-3">Type</th><th className="py-2 pr-3">Status</th><th className="py-2 text-right">Count</th></tr></thead>
                  <tbody>
                    {analytics.byEmailType.map((row, index) => (
                      <tr key={`${row.emailType}-${row.status}-${index}`} className="border-b last:border-0">
                        <td className="py-2 pr-3">{row.emailType}</td>
                        <td className="py-2 pr-3">{row.status}</td>
                        <td className="py-2 text-right tabular-nums">{row.count.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Provider health</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {analytics.providers.map((provider) => (
              <div key={provider.name} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
                <div>
                  <p className="font-medium capitalize">{provider.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {provider.name === "resend"
                      ? provider.webhookConfigured ? "Delivery webhook configured" : "Delivery tracking webhook not configured"
                      : "Status reflects configured credentials; connection is not probed here"}
                  </p>
                </div>
                <Badge variant={provider.configured ? provider.active ? "default" : "secondary" : "outline"}>
                  {providerBadge(provider.configured, provider.active)}
                </Badge>
              </div>
            ))}
            <div className="border-t pt-3 text-sm">
              <p className="font-medium">Manual inbox sync</p>
              <p className="mt-1 text-muted-foreground">
                {analytics.lastInboxSync
                  ? `Last run ${formatMarketplaceDateTime(analytics.lastInboxSync.createdAt)}${analytics.lastInboxSync.userName ? ` · ${analytics.lastInboxSync.userName}` : ""}`
                  : "No recorded inbox synchronization"}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Queue and inbox work is operator-triggered; this deployment does not depend on scheduled cron jobs.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
