"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { LayoutGrid, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InventoryTable } from "./inventory-table";
import { InventoryCardList } from "./inventory-card-list";

type ViewMode = "table" | "cards";
const STORAGE_KEY = "inventory:view";

const InventoryViewContext = createContext<{ view: ViewMode; changeView: (next: ViewMode) => void }>({ view: "table", changeView: () => {} });

export function InventoryViewProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<ViewMode>("table");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      // Hydrate the persisted view once on mount; external-storage read.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored === "cards" || stored === "table") setView(stored);
    } catch {}
  }, []);

  const changeView = (next: ViewMode) => {
    setView(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
  };

  return <InventoryViewContext.Provider value={{ view, changeView }}>{children}</InventoryViewContext.Provider>;
}

export function InventoryViewToggle() {
  const { view, changeView } = useContext(InventoryViewContext);
  return (
        <div className="flex items-center gap-1 rounded-md border p-1">
          <Button
            variant={view === "table" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => changeView("table")}
            title="Table view"
            aria-pressed={view === "table"}
          >
            <Table2 className="mr-1 h-4 w-4" /> Table
          </Button>
          <Button
            variant={view === "cards" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => changeView("cards")}
            title="Card view"
            aria-pressed={view === "cards"}
          >
            <LayoutGrid className="mr-1 h-4 w-4" /> Cards
          </Button>
        </div>
  );
}

interface InventoryViewProps {
  data: any[];
  vendors: any[];
  categories: any[];
  gemstones: any[];
  colors: any[];
  rashis: any[];
  certificates: any[];
  collections: any[];
  cuts?: any[];
  origins?: string[];
  canManageAttentionVisibility: boolean;
}

/**
 * Renders either the table or the card grid (never both) so the inventory
 * list mounts a single tree instead of two full copies of every row.
 */
export function InventoryView({
  data,
  vendors,
  categories,
  gemstones,
  colors,
  rashis,
  certificates,
  collections,
  cuts = [],
  origins = [],
  canManageAttentionVisibility,
}: InventoryViewProps) {
  const { view } = useContext(InventoryViewContext);

  return (
    <div>
      {view === "table" && (
        <InventoryTable
          data={data}
          vendors={vendors}
          categories={categories}
          gemstones={gemstones}
          colors={colors}
          rashis={rashis}
          certificates={certificates}
          collections={collections}
          cuts={cuts}
          origins={origins}
          canManageAttentionVisibility={canManageAttentionVisibility}
        />
      )}

      {view === "cards" && (
        <InventoryCardList data={data} canManageAttentionVisibility={canManageAttentionVisibility} />
      )}
    </div>
  );
}
