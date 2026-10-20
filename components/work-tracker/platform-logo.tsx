import Image from "next/image";
import { Diamond } from "lucide-react";
import { platformNames } from "./types";

export function PlatformLogo({ platform, compact = false }: { platform: string; compact?: boolean }) {
  return <span className={`inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white p-2 shadow-sm ${compact ? "h-9 w-14" : "h-12 w-20"}`}>
    {platform === "ERP" ? <Diamond aria-label="KhyatiGems ERP" className="h-6 w-6 text-violet-600" /> : <Image src={`/marketplaces/${platform.toLowerCase()}.svg`} width={compact ? 42 : 64} height={compact ? 22 : 32} alt={platformNames[platform] || platform} className="max-h-full w-full object-contain" unoptimized />}
  </span>;
}
