"use client";
import { KHYRA } from "@/lib/khyra/identity";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ThinkingClip } from "./thinking-clip";
type Card = { id: string; title: string; count: number; detail: string; priority: string; href: string; updatedAt: string; affected: string[] };
export function AttentionCards({ onOpen, motionEnabled = true, onLoadingChange }: { onOpen: () => void; motionEnabled?: boolean; onLoadingChange?: (loading: boolean) => void }) {
  const [data, setData] = useState<{ cards: Card[]; unavailable: string[] } | null>(null);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    onLoadingChange?.(true);
    fetch("/api/companion/attention", { cache: "no-store", signal: controller.signal }).then(async response => { if (!response.ok) throw new Error(); const next = await response.json(); if (!controller.signal.aborted) setData(next); }).catch(() => { if (!controller.signal.aborted) setError(true); }).finally(() => { if (!controller.signal.aborted) { setLoading(false); onLoadingChange?.(false); } });
    return () => { controller.abort(); onLoadingChange?.(false); };
  }, [revision, onLoadingChange]);
  return <section aria-label="Verified business attention" className="space-y-2"><div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Business attention</h3><Button size="sm" variant="ghost" disabled={loading} onClick={() => { setError(false); setLoading(true); setRevision(value => value + 1); }}>Refresh</Button></div><p className="text-xs text-muted-foreground">{KHYRA.reviewIntro}</p>{loading && <div className="facet-thinking-review" role="status"><ThinkingClip active motionEnabled={motionEnabled} /><p className="text-xs text-muted-foreground">{KHYRA.checking}</p></div>}{error ? <p role="alert" className="text-xs">{KHYRA.checkUnavailable}</p> : data ? <>{data.cards.map(card => <article key={card.id} className="rounded-xl border bg-primary/5 p-3"><div className="flex items-start justify-between gap-2"><h4 className="text-xs font-semibold">{card.title}</h4><span className="text-lg font-semibold tabular-nums">{card.count}</span></div><p className="mt-1 text-xs text-muted-foreground">{card.detail}</p><p className="mt-1 text-[11px] text-muted-foreground">{card.affected.join(" · ")}</p><p className="mt-2 text-[10px] text-muted-foreground">{card.priority} · snapshot {new Date(card.updatedAt).toLocaleTimeString()}</p><Link onClick={onOpen} href={card.href} className="mt-1 inline-flex min-h-10 items-center text-xs font-medium text-primary underline">Review affected records</Link></article>)}{!data.cards.length && <p className="text-xs text-muted-foreground">{KHYRA.noSources}</p>}{data.unavailable.length > 0 && <p className="text-xs text-muted-foreground">Unavailable sources: {data.unavailable.join(", ")}. Counts have not been estimated.</p>}</> : null}</section>;
}
