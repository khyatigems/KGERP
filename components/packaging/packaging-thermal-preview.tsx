"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { PackagingThermalBatch } from "@/lib/packaging-thermal-layout";

export function PackagingThermalPreview({ batch }: { batch: PackagingThermalBatch }) {
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(2);
  const visible = Math.min(index, batch.entries.length - 1);
  const entry = batch.entries[visible];
  if (!entry) return <p className="p-6 text-sm text-muted-foreground">No identities to preview.</p>;
  const { layout, label } = entry;
  return <div className="flex w-full min-h-0 flex-col overflow-auto p-4 gap-4">
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs"><span className="font-mono">{label.sku} / {layout.pageTitle} · {visible + 1} / {batch.entries.length}</span><div className="flex items-center gap-2"><Button size="sm" variant="outline" disabled={visible <= 0} onClick={() => setIndex(visible - 1)}>Previous</Button><Button size="sm" variant="outline" disabled={visible >= batch.entries.length - 1} onClick={() => setIndex(visible + 1)}>Next</Button><Button size="sm" variant="outline" onClick={() => setZoom(value => value === 4 ? 2 : value + 1)}>{zoom * 100}%</Button></div></div>
    <div className="overflow-auto rounded-xl border bg-muted/20 p-5"><div className="mx-auto w-fit bg-white shadow-md"><svg role="img" aria-label="Thermal packaging identity preview" viewBox={`0 0 50 ${layout.height}`} style={{ width: `${50 * 3.7795 * zoom}px`, height: `${layout.height * 3.7795 * zoom}px` }} xmlns="http://www.w3.org/2000/svg">
      <rect width="50" height={layout.height} fill="white" />
      {layout.elements.map((element, i) => {
        if (element.kind === "text") return <text data-field={element.field} key={i} x={element.x} y={element.y} fontFamily="Helvetica, Arial, sans-serif" fontSize={element.fontSize * 25.4 / 72} fontWeight={element.bold ? 700 : 400} dominantBaseline="text-before-edge" fill="black">{element.text}</text>;
        if (element.kind === "logo") return <image data-field={element.field} key={i} href={element.source} x={element.x} y={element.y} width={element.width} height={element.height} />;
        if (element.kind === "qr") { const step = element.width / (element.modules + 8); return <g data-field={element.field} key={i} fill="black" shapeRendering="crispEdges">{element.matrix.flatMap((row, r) => row.map((dark, c) => dark ? <rect key={`${r}-${c}`} x={element.x + (c + 4) * step} y={element.y + (r + 4) * step} width={step} height={step} /> : null))}</g>; }
        const step = element.width / (element.bits.length + 20);
        return <g data-field={element.field} key={i} fill="black" shapeRendering="crispEdges">{Array.from(element.bits).map((bit, c) => bit === "1" ? <rect key={c} x={element.x + (c + 10) * step} y={element.y} width={step} height={element.height} /> : null)}</g>;
      })}
    </svg></div></div>
    <div className="rounded-lg border bg-background p-3 text-xs space-y-2"><p className="font-medium">50 × {layout.height} mm · Text {layout.fontSize.toFixed(2)} pt · {layout.qrSize > 0 ? `QR ${layout.qrSize.toFixed(1)} mm` : ""}</p><p className={batch.fits ? "text-emerald-700 dark:text-emerald-300" : "text-destructive"}>{batch.fits ? "One label per package. All selected identities fit at readable sizes." : "Printing blocked: required content cannot fit at the readable minimum."}</p>{layout.warnings.map(warning => <p key={warning} className="text-amber-700 dark:text-amber-300">{warning}</p>)}<p className="text-muted-foreground">Print at actual size / 100%. Preview zoom does not change the label dimensions.</p></div>
    {!batch.fits && <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs space-y-2">{batch.entries.filter(value => !value.layout.fits).slice(0, 10).map(value => <div key={`${value.label.serial}-${value.layout.pageTitle}`}><strong>{value.label.sku}:</strong> {value.layout.errors.join(" ")}</div>)}<p>The sticker sheet remains available with your existing layout settings.</p></div>}
  </div>;
}
