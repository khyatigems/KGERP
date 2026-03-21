import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const csvEscape = (value: unknown) => {
  const s = value === null || value === undefined ? "" : String(value);
  const needs = /[",\r\n]/.test(s);
  const safe = s.replace(/"/g, '""');
  return needs ? `"${safe}"` : safe;
};

const parseOS = (ua: string) => {
  if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
  if (ua.includes("Android")) return "Android";
  if (ua.includes("Windows")) return "Windows";
  if (ua.includes("Macintosh")) return "macOS";
  if (ua.includes("Linux")) return "Linux";
  return "Unknown OS";
};

const parseBrowser = (ua: string) => {
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("SamsungBrowser")) return "Samsung";
  if (ua.includes("Opera") || ua.includes("OPR")) return "Opera";
  if (ua.includes("Edge")) return "Edge";
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Safari")) return "Safari";
  return "Unknown Browser";
};

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, PERMISSIONS.REPORTS_VIEW)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  const q = (sp.get("q") || "").trim();
  const from = sp.get("from") || "";
  const to = sp.get("to") || "";
  const sort = (sp.get("sort") || "createdAt_desc").trim();

  const startAt = from ? new Date(`${from}T00:00:00.000Z`) : undefined;
  const endAt = to ? new Date(`${to}T23:59:59.999Z`) : undefined;

  const where: Prisma.ActivityLogWhereInput = q
    ? {
        entityType: { in: ["SKU_VIEW", "INVOICE_VIEW"] },
        ...(startAt || endAt ? { createdAt: { gte: startAt, lte: endAt } } : {}),
        OR: [
          { entityIdentifier: { contains: q } },
          { ipAddress: { contains: q } },
          { userAgent: { contains: q } },
          { details: { contains: q } },
        ],
      }
    : {
        entityType: { in: ["SKU_VIEW", "INVOICE_VIEW"] },
        ...(startAt || endAt ? { createdAt: { gte: startAt, lte: endAt } } : {}),
      };

  const orderBy = sort === "createdAt_asc" ? { createdAt: "asc" as const } : { createdAt: "desc" as const };

  const logs = await prisma.activityLog.findMany({
    where,
    orderBy,
    take: 10000,
  });

  const skuIds = logs.filter(l => l.entityType === "SKU_VIEW" && l.entityId).map(l => l.entityId as string);
  const invoiceIds = logs.filter(l => l.entityType === "INVOICE_VIEW" && l.entityId).map(l => l.entityId as string);

  const [items, invoices] = await Promise.all([
    prisma.inventory.findMany({ where: { id: { in: skuIds } }, select: { id: true, itemName: true } }),
    prisma.invoice.findMany({
      where: { id: { in: invoiceIds } },
      select: { id: true, quotation: { select: { customer: { select: { name: true } } } } },
    }),
  ]);

  const entityNameMap = new Map<string, string>();
  items.forEach(item => entityNameMap.set(item.id, item.itemName));
  invoices.forEach(inv => entityNameMap.set(inv.id, inv.quotation?.customer?.name || "Unknown Customer"));

  const header = [
    "Time",
    "Source",
    "Entity Type",
    "Entity Identifier",
    "Name",
    "User Type",
    "IP Address",
    "OS",
    "Browser",
    "User Agent",
  ].join(",");

  const rows = logs.map((log) => {
    let details: Record<string, unknown> = {};
    try {
      details = log.details ? JSON.parse(log.details) : {};
    } catch {}
    const isStaff = Boolean((details as { isStaff?: unknown }).isStaff) || Boolean(log.userId);
    const ua = log.userAgent || "";
    const os = (details as { os?: unknown }).os ? String((details as { os: unknown }).os) : parseOS(ua);
    const browser = (details as { browser?: unknown }).browser ? String((details as { browser: unknown }).browser) : parseBrowser(ua);
    const name = log.entityId ? entityNameMap.get(log.entityId) : "";
    const source = log.actionType === "QR_SCAN" ? "QR_SCAN" : "DIRECT";

    return [
      csvEscape(log.createdAt.toISOString()),
      csvEscape(source),
      csvEscape(log.entityType),
      csvEscape(log.entityIdentifier || ""),
      csvEscape(name || ""),
      csvEscape(isStaff ? "STAFF" : "PUBLIC"),
      csvEscape(log.ipAddress || ""),
      csvEscape(os),
      csvEscape(browser),
      csvEscape(ua),
    ].join(",");
  });

  const csv = [header, ...rows].join("\r\n");
  const filename = `qr-scans-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename=\"${filename}\"`,
    },
  });
}
