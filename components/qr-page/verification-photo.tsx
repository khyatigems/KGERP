"use client";

import { useState } from "react";
import Image from "next/image";
import { Gem, ZoomIn } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export function VerificationPhoto({ source, name, eager = false }: { source: string | null; name: string; eager?: boolean }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const [zoomOpen, setZoomOpen] = useState(false);
  return source && failedSource !== source ? <><button type="button" className="kgv-photo-button" onClick={() => setZoomOpen(true)} aria-label={`Enlarge photograph of ${name}`}><Image src={source} alt={name} width={900} height={900} unoptimized loading={eager ? "eager" : "lazy"} fetchPriority={eager ? "high" : "auto"} className="kgv-product-image" onError={() => setFailedSource(source)} /><span className="kgv-photo-zoom"><ZoomIn size={16} aria-hidden="true" />Enlarge image</span></button><Dialog open={zoomOpen} onOpenChange={setZoomOpen}><DialogContent className="kgv-photo-dialog"><DialogTitle>{name}</DialogTitle><Image src={source} alt={name} width={900} height={900} unoptimized /></DialogContent></Dialog></> : <div className="kgv-no-image"><Gem size={88} strokeWidth={.7} aria-hidden="true" /><span>Every detail matters.</span><p>A product photograph is not available for this record.</p></div>;
}
