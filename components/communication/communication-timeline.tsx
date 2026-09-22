"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

interface CommunicationEntry {
  id: string;
  direction: string;
  channel: string;
  recipient: string | null;
  subject: string | null;
  status: string | null;
  timestamp: string;
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

export function CommunicationTimeline({
  customerId,
  orderId,
}: {
  customerId?: string;
  orderId?: string;
}) {
  const [entries, setEntries] = useState<CommunicationEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams();
    if (customerId) params.set("customerId", customerId);
    if (orderId) params.set("orderId", orderId);
    const qs = params.toString();
    if (!qs) {
      setLoading(false);
      return;
    }

    fetch(`/api/email/communication?${qs}`)
      .then((r) => r.json())
      .then((data) => {
        if (active) setEntries(data.entries || []);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [customerId, orderId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Communication Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No communication sent yet.</p>
        ) : (
          <div className="space-y-4">
            {entries.map((e) => (
              <div key={e.id} className="flex items-start justify-between gap-4 border-b pb-3 last:border-0 last:pb-0">
                <div className="min-w-0">
                  <div className="font-medium">{e.subject || "(no subject)"}</div>
                  <div className="text-sm text-muted-foreground">To: {e.recipient || "-"}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {e.channel} · {e.direction === "INBOUND" ? "Inbound" : "Outbound"}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <Badge variant={STATUS_VARIANT[e.status || "DRAFT"] || "outline"}>{e.status || "DRAFT"}</Badge>
                  <div className="text-xs text-muted-foreground mt-1">{formatDate(e.timestamp)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
