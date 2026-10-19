"use client";

import { useState } from "react";
import Image from "next/image";
import { Gem } from "lucide-react";

export function VerificationPhoto({ source, name, eager = false }: { source: string | null; name: string; eager?: boolean }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  return source && failedSource !== source ? <Image src={source} alt={name} width={900} height={900} unoptimized loading={eager ? "eager" : "lazy"} fetchPriority={eager ? "high" : "auto"} className="kgv-product-image" onError={() => setFailedSource(source)} /> : <div className="kgv-no-image"><Gem size={88} strokeWidth={.7} aria-hidden="true" /><span>Every detail matters.</span><p>A product photograph is not available for this record.</p></div>;
}
