import Image from "next/image";
import { cn } from "@/lib/utils";

export function MarketplaceLogo({ platform, className }: { platform: string; className?: string }) {
  const ebay = platform === "EBAY";
  return <span className={cn("relative block h-7 w-16 shrink-0", className)}><Image src={ebay ? "/ebay-logo.svg" : "/etsy-logo.svg"} alt={ebay ? "eBay" : "Etsy"} fill sizes="96px" className="object-contain"/></span>;
}
