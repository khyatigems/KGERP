"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageOff } from "lucide-react";

export function ListingImage({ urls, title }: { urls: string[]; title: string }) {
  const [failed, setFailed] = useState<string[]>([]);
  const src = urls.find((url) => !failed.includes(url));
  return src ? <a href={src} target="_blank" rel="noreferrer" aria-label={`View image: ${title}`}><Image key={src} src={src} alt={title} width={56} height={56} unoptimized loading="lazy" onError={() => setFailed((previous) => [...previous, src])} className="h-14 w-14 min-w-14 rounded border bg-white object-contain" /></a>
    : <div className="flex h-14 w-14 items-center justify-center rounded border bg-muted text-muted-foreground" title="No listing or ERP image available"><ImageOff className="h-5 w-5" aria-label="No image available" /></div>;
}
