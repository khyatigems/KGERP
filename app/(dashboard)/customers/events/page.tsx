import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import CustomerEventsClientPage from "./customer-events-client-page";
import { CalendarDays, MessageCircle } from "lucide-react";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { ensureBillfreePhase1Schema, prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Customer Events | KhyatiGems™ ERP",
};

export const dynamic = "force-dynamic";

type Row = {
  customerId: string;
  name: string;
  phone: string | null;
  whatsappNumber: string | null;
  dateOfBirth: string | null;
  anniversaryDate: string | null;
  loyaltyPoints: number;
  lastPurchaseDate: string | null;
};

function nextEventDate(month: number, day: number, now: Date) {
  const y = now.getFullYear();
  const d = new Date(y, month - 1, day);
  if (d < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
    d.setFullYear(y + 1);
  }
  return d;
}

export default async function CustomerEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user.role, PERMISSIONS.CUSTOMER_VIEW)) redirect("/");
  await ensureBillfreePhase1Schema();

  const sp = await searchParams;
  const range = sp.range === "7" || sp.range === "30" || sp.range === "missed" ? sp.range : "today";
  const days = range === "today" ? 0 : range === "7" ? 7 : range === "30" ? 30 : -1;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + (days >= 0 ? days : 0));

  const baseRows = await prisma.$queryRawUnsafe<Row[]>(
    `SELECT
       c.id as customerId,
       c.name as name,
       c.phone as phone,
       c.whatsappNumber as whatsappNumber,
       e.dateOfBirth as dateOfBirth,
       e.anniversaryDate as anniversaryDate,
       COALESCE(l.points, 0) as loyaltyPoints,
       s.lastPurchaseDate as lastPurchaseDate
     FROM "Customer" c
     LEFT JOIN "CustomerProfileExtra" e ON e.customerId = c.id
     LEFT JOIN (
       SELECT customerId, COALESCE(SUM(points),0) as points FROM "LoyaltyLedger" GROUP BY customerId
     ) l ON l.customerId = c.id
     LEFT JOIN (
       SELECT customerId, MAX(saleDate) as lastPurchaseDate
       FROM "Sale"
       WHERE customerId IS NOT NULL AND platform != 'REPLACEMENT'
       GROUP BY customerId
     ) s ON s.customerId = c.id
     WHERE e.dateOfBirth IS NOT NULL OR e.anniversaryDate IS NOT NULL
     ORDER BY c.name ASC`
  ).catch(() => []);

  const events = baseRows.flatMap((r) => {
    const out: Array<{
      customerId: string;
      customerName: string;
      phone: string;
      eventType: "BIRTHDAY" | "ANNIVERSARY";
      eventDate: Date;
      loyaltyPoints: number;
      lastPurchaseDate: string | null;
    }> = [];
    if (r.dateOfBirth) {
      const d = new Date(r.dateOfBirth);
      const nd = nextEventDate(d.getMonth() + 1, d.getDate(), now);
      out.push({
        customerId: r.customerId,
        customerName: r.name,
        phone: r.whatsappNumber || r.phone || "",
        eventType: "BIRTHDAY",
        eventDate: nd,
        loyaltyPoints: Number(r.loyaltyPoints || 0),
        lastPurchaseDate: r.lastPurchaseDate,
      });
    }
    if (r.anniversaryDate) {
      const d = new Date(r.anniversaryDate);
      const nd = nextEventDate(d.getMonth() + 1, d.getDate(), now);
      out.push({
        customerId: r.customerId,
        customerName: r.name,
        phone: r.whatsappNumber || r.phone || "",
        eventType: "ANNIVERSARY",
        eventDate: nd,
        loyaltyPoints: Number(r.loyaltyPoints || 0),
        lastPurchaseDate: r.lastPurchaseDate,
      });
    }
    return out;
  });

  const filtered = events
    .filter((e) => {
      const d = new Date(e.eventDate.getFullYear(), e.eventDate.getMonth(), e.eventDate.getDate());
      if (range === "missed") return d < todayStart;
      return d >= todayStart && d <= todayEnd;
    })
    .sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime());

  return (
    <CustomerEventsClientPage
      initialEvents={filtered.map((e) => ({
        ...e,
        eventDate: e.eventDate.toISOString(),
      }))}
      initialRange={range}
    />
  );
}
