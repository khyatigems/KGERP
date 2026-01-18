"use client";

import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { QrCode } from "lucide-react";

export function InventoryQrDialog({ itemId, itemName, sku }: { itemId: string, itemName: string, sku: string }) {
  const [qrUrl, setQrUrl] = useState("");

  useEffect(() => {
    // Points to the edit/view page of the inventory item
    const url = `${window.location.origin}/inventory/${itemId}/edit`;
    QRCode.toDataURL(url).then(setQrUrl);
  }, [itemId]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="View QR Code">
          <QrCode className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader>
          <DialogTitle>Inventory QR Code</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center p-4">
          {qrUrl && <img src={qrUrl} alt="QR Code" className="w-48 h-48" />}
          <p className="mt-4 font-bold">{sku}</p>
          <p className="text-sm text-gray-500">{itemName}</p>
          <Button className="mt-4" onClick={() => window.print()}>
            Print Label
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
