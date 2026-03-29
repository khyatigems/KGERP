'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from "next/link";
import { CalendarDays, MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

type Event = {
  customerId: string;
  customerName: string;
  phone: string;
  eventType: "BIRTHDAY" | "ANNIVERSARY";
  eventDate: string;
  loyaltyPoints: number;
  lastPurchaseDate: string | null;
};

export default function CustomerEventsClientPage({
  initialEvents,
  initialRange,
}: {
  initialEvents: Event[];
  initialRange: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [currentRange, setCurrentRange] = useState(initialRange);

  const handleTabClick = (newRange: string) => {
    if (newRange === currentRange) return; // Prevent unnecessary navigation
    startTransition(() => {
      setCurrentRange(newRange);
      router.push(`/customers/events?range=${newRange}`);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customer Events</h1>
          <p className="text-sm text-muted-foreground">Birthdays and anniversaries with WhatsApp Web quick actions.</p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            startTransition(() => {
              router.push("/customers");
            });
          }}
          disabled={isPending}
          className={isPending ? "opacity-50 cursor-not-allowed" : ""}
        >
          Back to Customers
        </Button>
      </div>

      <div className="inline-flex rounded-md border bg-muted/20 p-1">
        {[
          { key: "today", label: "Today" },
          { key: "7", label: "Upcoming 7" },
          { key: "30", label: "Upcoming 30" },
          { key: "missed", label: "Missed" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => handleTabClick(t.key)}
            className={`px-3 py-1.5 text-sm rounded ${currentRange === t.key ? "bg-background border shadow-sm" : "text-muted-foreground"} ${isPending && currentRange !== t.key ? "opacity-50 cursor-not-allowed" : ""}`}
            disabled={isPending && currentRange !== t.key}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={`grid grid-cols-1 gap-3 transition-opacity duration-300 ${isPending ? "opacity-50" : "opacity-100"}`}>
        {initialEvents.map((e) => (
          <Card key={`${e.customerId}-${e.eventType}-${new Date(e.eventDate).toISOString()}`}>
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="font-semibold">{e.customerName}</div>
                  <Badge variant="outline">{e.eventType}</Badge>
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-3">
                  <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{formatDate(new Date(e.eventDate))}</span>
                  <span>Phone: {e.phone || "-"}</span>
                  <span>Loyalty: {e.loyaltyPoints.toFixed(2)} pts</span>
                  <span>Last Purchase: {e.lastPurchaseDate ? formatDate(e.lastPurchaseDate) : "-"}</span>
                </div>
              </div>
              <Button asChild>
                <a
                  href={`/api/customers/events/whatsapp-launch?customerId=${encodeURIComponent(e.customerId)}&eventType=${encodeURIComponent(e.eventType)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Send WhatsApp
                </a>
              </Button>
            </CardContent>
          </Card>
        ))}
        {initialEvents.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-sm text-muted-foreground text-center">
              No events found for selected range.
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}