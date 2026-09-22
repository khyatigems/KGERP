import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedPage } from "@/components/ui/animated-page";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Communication Inbox",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

interface EmailRow {
  id: string;
  direction: string;
  recipient: string;
  subject: string;
  status: string;
  emailType: string | null;
  provider: string | null;
  customerId: string | null;
  customerName: string | null;
  orderId: string | null;
  invoiceNumber: string | null;
  bodyRef: string | null;
  createdAt: string;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  SENT: "default",
  DELIVERED: "default",
  OPENED: "default",
  QUEUED: "secondary",
  DRAFT: "secondary",
  FAILED: "destructive",
  BOUNCED: "destructive",
};

const STATUSES = ["SENT", "DELIVERED", "OPENED", "QUEUED", "FAILED", "BOUNCED", "DRAFT"];

function avatarInitials(value: string): string {
  const local = value.split("@")[0] || value;
  const parts = local.split(/[._\-+\s]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (local.slice(0, 2) || "?").toUpperCase();
}

function avatarColor(value: string): string {
  const palette = [
    "#181547",
    "#D03837",
    "#0f766e",
    "#b45309",
    "#7c3aed",
    "#0369a1",
    "#15803d",
    "#be185d",
  ];
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length];
}

export default async function CommunicationInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ direction?: string; status?: string; q?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user.role, PERMISSIONS.CUSTOMER_VIEW)) redirect("/");

  const sp = await searchParams;
  const direction = sp.direction || "";
  const status = sp.status || "";
  const q = (sp.q || "").trim();

  const conditions: string[] = [];
  const values: Array<string> = [];
  if (direction === "INBOUND" || direction === "OUTBOUND") {
    conditions.push(`e.direction = ?`);
    values.push(direction);
  }
  if (status && STATUSES.includes(status)) {
    conditions.push(`e.status = ?`);
    values.push(status);
  }
  if (q) {
    conditions.push(`(e.subject LIKE ? OR e.recipient LIKE ? OR c.name LIKE ? OR i."invoiceNumber" LIKE ?)`);
    values.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const rows = await prisma.$queryRawUnsafe<EmailRow[]>(
    `SELECT e.id, e.direction, e.recipient, e.subject, e.status, e."emailType",
            e.provider, e."customerId", e."orderId", e."bodyRef", e."createdAt",
            c.name AS "customerName", i."invoiceNumber" AS "invoiceNumber"
     FROM "EmailLog" e
     LEFT JOIN "Customer" c ON c.id = e."customerId"
     LEFT JOIN "Invoice" i ON i.id = e."orderId"
     ${where}
     ORDER BY e."createdAt" DESC
     LIMIT 200`,
    ...values
  ).catch(() => []);

  const buildHref = (overrides: Record<string, string>) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries({
      ...(direction ? { direction } : {}),
      ...(status ? { status } : {}),
      ...(q ? { q } : {}),
      ...overrides,
    })) {
      if (value) params.set(key, value);
    }
    const qs = params.toString();
    return qs ? `/communication?${qs}` : "/communication";
  };

  return (
    <AnimatedPage>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Communication Inbox</h1>
          <p className="text-sm text-muted-foreground">
            Inbound replies and outbound invoice/certificate emails. Inbound mail is pulled via the
            Zoho "Check Inbox Now" button on the Email Templates page.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg border p-1">
            {[
              { label: "All", value: "" },
              { label: "Inbound", value: "INBOUND" },
              { label: "Outbound", value: "OUTBOUND" },
            ].map((opt) => (
              <Link
                key={opt.value}
                href={buildHref({ direction: opt.value })}
                className={`rounded-md px-3 py-1.5 text-sm ${
                  direction === opt.value ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}
              >
                {opt.label}
              </Link>
            ))}
          </div>

          <form className="flex items-center gap-2" action="/communication" method="GET">
            {direction && <input type="hidden" name="direction" value={direction} />}
            {q && <input type="hidden" name="q" value={q} />}
            <select
              name="status"
              defaultValue={status}
              className="rounded-lg border bg-background px-3 py-2 text-sm"
            >
              <option value="">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button type="submit" className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">
              Filter
            </button>
          </form>

          <form className="flex items-center gap-2" action="/communication" method="GET">
            {direction && <input type="hidden" name="direction" value={direction} />}
            {status && <input type="hidden" name="status" value={status} />}
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search subject, recipient, customer, invoice…"
              className="rounded-lg border bg-background px-3 py-2 text-sm w-72"
            />
            <button type="submit" className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">
              Search
            </button>
          </form>
        </div>

        {rows.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No emails match the current filters.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => {
              const isInbound = row.direction === "INBOUND";
              const displayName = isInbound ? row.recipient : row.customerName || row.recipient;
              const displayKey = isInbound ? row.recipient : row.customerName || row.recipient;
              return (
              <Card key={row.id}>
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                      style={{ backgroundColor: avatarColor(displayKey) }}
                    >
                      {avatarInitials(displayName || "?")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={isInbound ? "default" : "secondary"}>
                          {isInbound ? "Inbound" : "Outbound"}
                        </Badge>
                        <Badge variant={STATUS_VARIANT[row.status] || "outline"}>{row.status}</Badge>
                        {row.emailType && <Badge variant="outline">{row.emailType}</Badge>}
                        <span className="text-xs text-muted-foreground">{row.provider}</span>
                      </div>
                      <div className="mt-2 font-medium">{row.subject || "(no subject)"}</div>
                      <div className="text-sm">
                        <span className="font-medium">{isInbound ? "From" : "To"}: {displayName || "-"}</span>
                        <span className="text-muted-foreground"> &lt;{row.recipient || "-"}&gt;</span>
                      </div>
                      {!isInbound && (
                        <div className="text-sm text-muted-foreground">
                          From: KhyatiGems
                        </div>
                      )}
                      {row.customerName && (
                        <div className="text-sm text-muted-foreground">
                          Customer:{" "}
                          <Link href={`/customers/${row.customerId}`} className="text-primary hover:underline">
                            {row.customerName}
                          </Link>
                        </div>
                      )}
                      {row.invoiceNumber && (
                        <div className="text-sm text-muted-foreground">
                          Invoice:{" "}
                          <Link href={`/invoices/${row.orderId}`} className="text-primary hover:underline">
                            {row.invoiceNumber}
                          </Link>
                        </div>
                      )}
                      {row.bodyRef && !row.bodyRef.startsWith("template:") && (
                        <div className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">
                          {row.bodyRef}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 text-xs text-muted-foreground">{formatDate(row.createdAt)}</div>
                  </div>
                </CardContent>
              </Card>
              );
            })}
          </div>
        )}
      </div>
    </AnimatedPage>
  );
}
