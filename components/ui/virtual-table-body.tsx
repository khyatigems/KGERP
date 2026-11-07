"use client";

import { cloneElement, Fragment, useCallback, useLayoutEffect, useRef, useState, type ComponentProps, type ReactElement, type RefObject } from "react";
import { defaultRangeExtractor, useVirtualizer } from "@tanstack/react-virtual";
import { TableBody, TableCell, TableRow } from "./table";

export const VIRTUAL_ROW_THRESHOLD = 100;

/** Native table layout, measured rows, stable IDs, and a retained keyboard-focus row. */
export function VirtualTableBody<T>({ items, getKey, scrollRef, columns, renderRow, empty, estimateSize = 88 }: {
  items: readonly T[];
  getKey: (item: T) => string;
  scrollRef: RefObject<HTMLDivElement | null>;
  columns: number;
  renderRow: (item: T, index: number) => ReactElement<ComponentProps<"tr">>;
  empty: ReactElement;
  estimateSize?: number;
}) {
  const body = useRef<HTMLTableSectionElement>(null);
  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const enabled = items.length >= VIRTUAL_ROW_THRESHOLD;
  const focusedIndex = focusedKey === null ? -1 : items.findIndex(item => getKey(item) === focusedKey);
  // Retain the row that owns keyboard focus or a portalled action menu.
  const rangeExtractor = useCallback((range: Parameters<typeof defaultRangeExtractor>[0]) => {
    const indexes = defaultRangeExtractor(range);
    return focusedIndex < 0 || indexes.includes(focusedIndex) ? indexes : [...indexes, focusedIndex].sort((a, b) => a - b);
  }, [focusedIndex]);
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: items.length, enabled, getScrollElement: () => scrollRef.current,
    estimateSize: () => estimateSize, overscan: 6,
    getItemKey: index => getKey(items[index]), rangeExtractor, scrollMargin: headerHeight,
  });
  useLayoutEffect(() => {
    const header = body.current?.previousElementSibling;
    if (!enabled || !header) return;
    const update = () => setHeaderHeight(header.getBoundingClientRect().height);
    update();
    const observer = new ResizeObserver(update); observer.observe(header);
    return () => observer.disconnect();
  }, [enabled]);
  const rows = enabled ? virtualizer.getVirtualItems() : [];
  const spacer = (height: number, key: string) => height > .5 ? <TableRow key={key} aria-hidden="true" style={{ height, border: 0, animation: "none" }}><TableCell colSpan={columns} style={{ height, padding: 0, border: 0 }} /></TableRow> : null;
  return <TableBody ref={body} data-virtualized={enabled || undefined} onFocusCapture={event => {
    const row = (event.target as HTMLElement).closest<HTMLTableRowElement>("tr[data-row-key]");
    if (row) setFocusedKey(row.dataset.rowKey || null);
  }}>
    {!items.length ? empty : !enabled ? items.map((item, index) => renderRow(item, index)) : rows.map((row, position) => <Fragment key={row.key}>
      {spacer(row.start - (position ? rows[position - 1].end : headerHeight), `before-${row.key}`)}
      {cloneElement(renderRow(items[row.index], row.index), {
        ref: virtualizer.measureElement,
        "data-index": row.index,
        "data-row-key": getKey(items[row.index]),
        "aria-rowindex": row.index + 2,
        style: { overflowAnchor: "none", animation: "none" },
      } as ComponentProps<"tr">)}
    </Fragment>)}
    {enabled && rows.length > 0 && spacer(virtualizer.getTotalSize() - (rows.at(-1)!.end - headerHeight), "after")}
  </TableBody>;
}
