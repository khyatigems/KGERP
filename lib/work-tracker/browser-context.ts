"use client";
import { useEffect } from "react";
import type { activities, platforms } from "./core";

export type WorkContext = { platform: typeof platforms[number]; activityType: typeof activities[number]; inventoryId?: string | null; marketplaceShopId?: string | null; listingRecordId?: string | null; label?: string };
const eventName = "khyati:work-context";
let active: { owner: string; context: WorkContext } | null = null;
export const currentWorkContext = () => active?.context || null;
export const workContextEvent = eventName;
export function useWorkContext(context: WorkContext | null) {
  const key = JSON.stringify(context);
  useEffect(() => {
    const owner = crypto.randomUUID();
    active = context ? { owner, context } : null;
    window.dispatchEvent(new Event(eventName));
    return () => { if (active?.owner === owner) { active = null; window.dispatchEvent(new Event(eventName)); } };
    // A stable serialized context prevents resetting intervals on each keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
export function routeWorkContext(path: string): WorkContext {
  const url = new URL(path, "https://erp.local");
  const selected = url.searchParams.get("marketplace")?.toUpperCase();
  const activityType = path.includes("orders") || path.startsWith("/sales") ? "ORDERS" : path.includes("sync") || path.includes("conflict") ? "SYNCHRONIZATION" : path.startsWith("/inventory") ? "INVENTORY" : path.includes("listing") || path.includes("draft") ? "LISTING_PREPARATION" : path.includes("communication") ? "CUSTOMER_SERVICE" : "OTHER";
  const platform = selected === "EBAY" || selected === "ETSY" || selected === "AMAZON" ? selected : "ERP";
  return { platform, activityType, marketplaceShopId: platform === "ERP" ? null : url.searchParams.get("shop") || null, label: "ERP workspace" };
}
