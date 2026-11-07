"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { defaultRangeExtractor, useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";

/** Only the presentation window changes; actions/totals still use the full list. */
export function VirtualList<T>({ items, getKey, renderItem, label, className, empty }: {
  items: readonly T[]; getKey: (item: T) => string; renderItem: (item: T) => ReactNode;
  label: string; className?: string; empty?: ReactNode;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const enabled = items.length >= 100;
  const focusedIndex = focusedKey === null ? -1 : items.findIndex(item => getKey(item) === focusedKey);
  const rangeExtractor = useCallback((range: Parameters<typeof defaultRangeExtractor>[0]) => {
    const indexes = defaultRangeExtractor(range);
    return focusedIndex < 0 || indexes.includes(focusedIndex) ? indexes : [...indexes, focusedIndex].sort((a, b) => a - b);
  }, [focusedIndex]);
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({ count: items.length, enabled, getScrollElement: () => viewport.current,
    getItemKey: index => getKey(items[index]), estimateSize: () => 116, overscan: 5, rangeExtractor });
  return <div ref={viewport} className={cn("min-h-0 flex-1 overflow-auto overscroll-contain p-3", className)} role="region" aria-label={label} tabIndex={0} onFocusCapture={event => {
    const item = (event.target as HTMLElement).closest<HTMLElement>("[data-list-key]");
    if (item) setFocusedKey(item.dataset.listKey || null);
  }}>
    {!items.length ? empty : <div role="list" style={enabled ? { height: virtualizer.getTotalSize(), position: "relative" } : undefined}>
      {(enabled ? virtualizer.getVirtualItems() : items.map((item, index) => ({ index, key: getKey(item), start: 0 }))).map(row => <div
        role="listitem" key={row.key} data-list-key={getKey(items[row.index])} data-index={row.index}
        aria-setsize={items.length} aria-posinset={row.index + 1}
        ref={enabled ? virtualizer.measureElement : undefined}
        style={{ paddingBottom: 8, ...(enabled ? { position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${row.start}px)` } : {}) }}
      >{renderItem(items[row.index])}</div>)}
    </div>}
  </div>;
}
