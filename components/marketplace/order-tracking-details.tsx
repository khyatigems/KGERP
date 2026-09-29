"use client";

import { Info, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function OrderTrackingDetails({
  carrier,
  trackingCode,
  shipmentStatus,
}: {
  carrier: string | null;
  trackingCode: string | null;
  shipmentStatus: string | null;
}) {
  const status = shipmentStatus || (trackingCode ? "Shipped" : "Not shipped");
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Show tracking details">
          <Info className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-3">
        <div className="flex items-center gap-2 font-medium"><Truck className="h-4 w-4 text-primary" />Shipment details</div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Carrier</dt><dd>{carrier || "Not provided"}</dd>
          <dt className="text-muted-foreground">Tracking no.</dt><dd className="break-all font-mono text-xs">{trackingCode || "Not provided"}</dd>
          <dt className="text-muted-foreground">Shipment status</dt><dd>{status}</dd>
        </dl>
      </PopoverContent>
    </Popover>
  );
}
