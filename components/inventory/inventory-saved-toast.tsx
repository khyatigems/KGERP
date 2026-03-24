"use client";

import { useEffect } from "react";
import { toast } from "sonner";

type SavedPayload = {
  sku?: string;
  itemName?: string;
};

export function InventorySavedToast() {
  useEffect(() => {
    try {
      const raw = localStorage.getItem("inventory-last-saved");
      if (!raw) return;
      localStorage.removeItem("inventory-last-saved");
      const parsed = JSON.parse(raw) as SavedPayload;
      const sku = (parsed?.sku || "").trim();
      const itemName = (parsed?.itemName || "").trim();
      if (sku) {
        toast.success(itemName ? `Saved: ${sku} (${itemName})` : `Saved: ${sku}`);
      } else {
        toast.success("Inventory saved successfully");
      }
    } catch {
    }
  }, []);

  return null;
}

