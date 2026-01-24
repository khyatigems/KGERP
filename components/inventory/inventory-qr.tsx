"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { QrCode, Copy, Mail } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { toast } from "sonner";

export function InventoryQrDialog({ itemId, itemName, sku }: { itemId: string, itemName: string, sku: string }) {
  const [qrUrl, setQrUrl] = useState("");
  const [shareUrl, setShareUrl] = useState("");

  useEffect(() => {
    // Points to the public preview page of the inventory item
    // This allows customers to scan the physical tag and see the item details
    if (typeof window !== "undefined") {
        const url = `${window.location.origin}/preview/${sku}`;
        setShareUrl(url);
        QRCode.toDataURL(url).then(setQrUrl);
    }
  }, [sku]);

  const handleCopy = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard");
    }
  };

  const professionalMessage = `Greetings from Khyati Gems,

I am pleased to share the details of this exquisite piece with you:

*${itemName}*
SKU: ${sku}

You can view the full specifications and high-resolution imagery here:
${shareUrl}

Please let us know if you require any further assistance.`;

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
          <DialogDescription className="sr-only">
            Scan this QR code to view inventory item details
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center p-4 space-y-4">
          {qrUrl && <Image src={qrUrl} alt="QR Code" width={192} height={192} className="w-48 h-48" />}
          
          <div className="space-y-1">
            <p className="font-bold text-lg">{sku}</p>
            <p className="text-sm text-muted-foreground">{itemName}</p>
          </div>

          <Button className="w-full transition-transform hover:scale-105 active:scale-95" onClick={() => window.print()}>
            Print Label
          </Button>

          {shareUrl && (
            <div className="grid grid-cols-3 gap-2 w-full pt-2">
                <Button variant="outline" size="sm" onClick={handleCopy} className="flex flex-col h-auto py-2 gap-1 hover:bg-muted/50">
                    <Copy className="w-4 h-4" /> 
                    <span className="text-xs">Copy Link</span>
                </Button>
                
                <Button variant="outline" size="sm" asChild className="flex flex-col h-auto py-2 gap-1 hover:bg-muted/50 text-[#25D366] hover:text-[#25D366]">
                    <Link href={`https://wa.me/?text=${encodeURIComponent(professionalMessage)}`} target="_blank">
                        <WhatsAppIcon className="w-4 h-4" /> 
                        <span className="text-xs">WhatsApp</span>
                    </Link>
                </Button>
                
                <Button variant="outline" size="sm" asChild className="flex flex-col h-auto py-2 gap-1 hover:bg-muted/50">
                    <Link href={`mailto:?subject=${encodeURIComponent(`Item Details: ${itemName}`)}&body=${encodeURIComponent(professionalMessage)}`}>
                        <Mail className="w-4 h-4" /> 
                        <span className="text-xs">Email</span>
                    </Link>
                </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
