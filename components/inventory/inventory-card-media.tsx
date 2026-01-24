"use client";

import Image from "next/image";
import { resolveMediaUrl } from "@/lib/media";

interface InventoryCardMediaProps {
  item: {
    itemName: string;
    media: { mediaUrl?: string }[];
  };
  className?: string;
  width?: number;
  height?: number;
}

export function InventoryCardMedia({ item, className, width = 80, height = 80 }: InventoryCardMediaProps) {
  // Use .replace to support SVG placeholder if resolveMediaUrl returns .png and we use .svg
  // But wait, I created .svg. I should update resolveMediaUrl to use .svg OR create a route/copy a file.
  // The plan said /placeholder.png. I will check if I can just write the SVG content to a file named .png? No that's invalid.
  // I will update resolveMediaUrl to return /placeholder.svg for now as I created an svg.
  
  // Wait, I should stick to the plan. The plan says /placeholder.png.
  // I'll update the lib/media.ts to use /placeholder.svg if I can't easily get a PNG.
  // Or I can use a data URL for the PNG in the file creation? No, too large.
  // I will use /placeholder.svg in lib/media.ts.

  const src = resolveMediaUrl(item.media);

  return (
    <div className={`relative overflow-hidden rounded-md border bg-muted ${className}`} style={{ width: className ? undefined : width, height: className ? undefined : height }}>
      <Image
        src={src}
        alt={item.itemName || "Inventory item"}
        fill
        sizes={`${width}px`}
        className="object-cover"
        priority={false}
      />
    </div>
  );
}
