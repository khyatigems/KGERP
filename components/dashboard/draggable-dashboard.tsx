"use client";

import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import {
  GripVertical, LayoutDashboard, ArrowUpDown, X, Maximize2, Minimize2,
  MoreHorizontal, ChevronUp, ChevronDown, ArrowUp, ArrowDown, Settings2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LottieIcon } from "@/components/ui/lottie";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

type WidgetRenderer = (props: Record<string, unknown>) => React.ReactNode;

const widgetRegistry: Record<string, WidgetRenderer> = {
  header: (props) => <DashboardHeader {...props} />,
  health: (props) => <BusinessHealthCards data={props} />,
  "marketplace-activity": (props) => (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <div className="lg:col-span-7"><MarketplaceOverview {...props} /></div>
      <div className="lg:col-span-5"><ActivityFeed /></div>
    </div>
  ),
  "revenue-inventory": (props) => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <RevenueTrend data={props.revenueTrend || []} />
      <InventoryHealth />
    </div>
  ),
  "categories-workqueue": (props) => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {props.categories?.length > 0 && <TopSellingCategories data={props.categories} />}
      <WorkQueue {...props} />
    </div>
  ),
  "sync-gemtypes": (props) => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <MarketplaceSyncHealth />
      {props.gemTypes?.length > 0 && <TopSellingGemTypes data={props.gemTypes} />}
    </div>
  ),
  notes: () => <QuickNotes />,
  "matched-pairs": (props) => <MatchedPairsWidget size={props.size as string} />,
};

import { DashboardHeader } from "./dashboard-header";
import { BusinessHealthCards } from "./business-health-cards";
import { MarketplaceOverview } from "./marketplace-overview";
import { ActivityFeed } from "./activity-feed";
import { RevenueTrend } from "./revenue-trend";
import { InventoryHealth } from "./inventory-health";
import { MarketplaceSyncHealth } from "./marketplace-sync-health";
import { WorkQueue } from "./work-queue";
import { TopSellingCategories } from "./top-selling-categories";
import { TopSellingGemTypes } from "./top-selling-gem-types";
import { QuickNotes } from "./quick-notes";
import { MatchedPairsWidget } from "./matched-pairs-widget";

export interface DraggableWidgetConfig {
  id: string;
  title: string;
  disabled?: boolean;
  defaultOrder?: number;
  size?: "default" | "wide" | "full";
}

interface DashboardGridProps {
  widgets: DraggableWidgetConfig[];
  onReorder: (widgets: DraggableWidgetConfig[]) => void;
  onResize?: (widgetId: string, size: DraggableWidgetConfig["size"]) => void;
  editMode?: boolean;
  onToggleEditMode?: () => void;
  renderData: Record<string, Record<string, unknown>>;
}

interface DraggableWidgetProps {
  id: string;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
  size?: DraggableWidgetConfig["size"];
  onSizeChange?: (size: DraggableWidgetConfig["size"]) => void;
  isEditMode: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onMoveToTop?: () => void;
  onMoveToBottom?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}

function DraggableWidget({
  id, title, children, disabled = false, size = "default", onSizeChange,
  isEditMode, onMoveUp, onMoveDown, onMoveToTop, onMoveToBottom,
  isFirst = false, isLast = false,
}: DraggableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: disabled || !isEditMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const sizeClasses = {
    default: "lg:col-span-1",
    wide: "lg:col-span-2",
    full: "lg:col-span-2 xl:col-span-4",
  };

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, overflow: "visible" }}
      className={cn(
        "rounded-xl border bg-card p-4 transition-all duration-200",
        isEditMode
          ? "border-dashed border-primary/30 hover:border-primary/60 hover:shadow-md"
          : "border-border hover:shadow-lg hover:border-primary/30",
        isDragging && "shadow-xl ring-2 ring-primary/50 z-50 scale-[1.02]",
        disabled && "opacity-40 cursor-not-allowed",
        sizeClasses[size]
      )}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {isEditMode && (
            <button
              {...attributes}
              {...listeners}
              className={cn(
                "p-1.5 rounded-lg transition-colors shrink-0 cursor-grab active:cursor-grabbing",
                "hover:bg-primary/10 hover:text-primary",
                isDragging && "bg-primary/20 text-primary"
              )}
              aria-label="Drag to reorder"
            >
              <GripVertical className="h-4 w-4" />
            </button>
          )}
          <span className="text-sm font-medium text-foreground truncate">{title}</span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {isEditMode && (
            <div className="flex items-center gap-0.5 mr-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={isFirst}
                onClick={onMoveToTop}
                title="Move to top"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={isFirst}
                onClick={onMoveUp}
                title="Move up"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={isLast}
                onClick={onMoveDown}
                title="Move down"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={isLast}
                onClick={onMoveToBottom}
                title="Move to bottom"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {isDragging && (
            <div className="flex items-center gap-1 text-xs text-primary animate-pulse">
              <ArrowUpDown className="h-3 w-3" />
            </div>
          )}

          {!disabled && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Settings2 className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={() => onSizeChange?.("default")}
                  className={size === "default" ? "bg-primary/10" : ""}
                >
                  <span className="flex items-center gap-2">
                    <Minimize2 className="h-4 w-4" />
                    Default
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => onSizeChange?.("wide")}
                  className={size === "wide" ? "bg-primary/10" : ""}
                >
                  <span className="flex items-center gap-2">
                    <Maximize2 className="h-4 w-4" />
                    Wide
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => onSizeChange?.("full")}
                  className={size === "full" ? "bg-primary/10" : ""}
                >
                  <span className="flex items-center gap-2">
                    <Maximize2 className="h-4 w-4" />
                    Full Width
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <div className="min-h-[80px]">{children}</div>
    </div>
  );
}

export function DashboardGrid({
  widgets,
  onReorder,
  onResize,
  editMode = false,
  onToggleEditMode,
  renderData,
}: DashboardGridProps) {
  const [items, setItems] = useState<DraggableWidgetConfig[]>(widgets);
  const [isEditMode, setIsEditMode] = useState(editMode);
  const [hasChanges, setHasChanges] = useState(false);
  const originalLayoutRef = useRef<DraggableWidgetConfig[]>(widgets);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex(i => i.id === active.id);
      const newIndex = items.findIndex(i => i.id === over.id);
      const newItems = arrayMove(items, oldIndex, newIndex);
      setItems(newItems);
      setHasChanges(true);
    }
  }, [items]);

  const handleResize = useCallback((widgetId: string, size: DraggableWidgetConfig["size"]) => {
    setItems(prev => {
      const newItems = prev.map(w => w.id === widgetId ? { ...w, size } : w);
      setHasChanges(true);
      return newItems;
    });
  }, []);

  const moveWidget = useCallback((widgetId: string, direction: "up" | "down" | "top" | "bottom") => {
    setItems(prev => {
      const idx = prev.findIndex(w => w.id === widgetId);
      if (idx === -1) return prev;

      let newItems = [...prev];
      if (direction === "up" && idx > 0) {
        newItems = arrayMove(newItems, idx, idx - 1);
      } else if (direction === "down" && idx < newItems.length - 1) {
        newItems = arrayMove(newItems, idx, idx + 1);
      } else if (direction === "top") {
        const [item] = newItems.splice(idx, 1);
        newItems.unshift(item);
      } else if (direction === "bottom") {
        const [item] = newItems.splice(idx, 1);
        newItems.push(item);
      }
      setHasChanges(true);
      return newItems;
    });
  }, []);

  const handleSave = useCallback(() => {
    onReorder(items);
    originalLayoutRef.current = items;
    setHasChanges(false);
    setIsEditMode(false);
    onToggleEditMode?.();
  }, [items, onReorder, onToggleEditMode]);

  const handleCancel = useCallback(() => {
    setItems(originalLayoutRef.current);
    setHasChanges(false);
    setIsEditMode(false);
    onToggleEditMode?.();
  }, [onToggleEditMode]);

  const handleEnterEditMode = useCallback(() => {
    originalLayoutRef.current = [...items];
    setIsEditMode(true);
    onToggleEditMode?.();
  }, [items, onToggleEditMode]);

  useEffect(() => {
    setItems(widgets);
  }, [widgets]);

  useEffect(() => {
    setIsEditMode(editMode);
  }, [editMode]);

  const renderWidget = useMemo(() => (widget: DraggableWidgetConfig) => {
    const renderer = widgetRegistry[widget.id];
    if (!renderer) return null;
    const data = { ...(renderData[widget.id] || {}), size: widget.size || "default" };
    return renderer(data);
  }, [renderData]);

  const getOverlayContent = useCallback((activeItem: DraggableWidgetConfig | undefined) => {
    if (!activeItem) return null;
    return renderWidget(activeItem);
  }, [renderWidget]);

  return (
    <div className="space-y-4">
      {/* Edit mode bar */}
      {isEditMode && (
        <div className="sticky top-0 z-40 flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/20 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <LottieIcon src="dashboardBg" size={18} className="text-primary" />
            <span className="font-medium">Rearrange Dashboard</span>
            <span className="text-xs text-muted-foreground">
              — Use arrows or drag to reorder, settings icon to resize
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!hasChanges}>
              Save Layout
            </Button>
          </div>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          <div
            className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4"
            role="list"
            aria-label="Dashboard widgets"
            style={{ overflow: "visible" }}
          >
            {items.map((widget, index) => (
              <DraggableWidget
                key={widget.id}
                id={widget.id}
                title={widget.title}
                disabled={widget.disabled}
                size={widget.size || "default"}
                onSizeChange={(newSize) => handleResize(widget.id, newSize)}
                isEditMode={isEditMode}
                onMoveUp={() => moveWidget(widget.id, "up")}
                onMoveDown={() => moveWidget(widget.id, "down")}
                onMoveToTop={() => moveWidget(widget.id, "top")}
                onMoveToBottom={() => moveWidget(widget.id, "bottom")}
                isFirst={index === 0}
                isLast={index === items.length - 1}
              >
                {renderWidget(widget)}
              </DraggableWidget>
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {({ activatorEvent, active }) => {
            const activeId = active?.id;
            if (!activatorEvent || !activeId) return null;
            const activeItem = items.find(i => i.id === activeId);
            if (!activeItem) return null;
            return (
              <div className="rounded-xl border-2 border-primary/40 bg-card p-4 shadow-2xl opacity-90 rotate-[1deg]" style={{ width: 320 }}>
                <div className="flex items-center gap-2 mb-2">
                  <GripVertical className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">{activeItem.title}</span>
                </div>
                <div className="min-h-[80px]">{renderWidget(activeItem)}</div>
              </div>
            );
          }}
        </DragOverlay>
      </DndContext>

      {!isEditMode && (
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-center gap-2"
          onClick={handleEnterEditMode}
        >
          <LayoutDashboard className="h-4 w-4" />
          <span>Customize Dashboard</span>
        </Button>
      )}
    </div>
  );
}

export function useDashboardLayout(userId: string) {
  const [layout, setLayout] = useState<DraggableWidgetConfig[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const loadLayout = useCallback(() => {
    try {
      const stored = localStorage.getItem(`dashboard-layout-${userId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setLayout(parsed.map((w: any) => ({
            id: w.id,
            title: w.title,
            disabled: w.id === "header" ? false : w.disabled,
            defaultOrder: w.defaultOrder,
            size: w.size || "default",
          })));
        }
      }
    } catch (e) {
      console.error("Failed to load dashboard layout:", e);
    }
    setIsLoaded(true);
  }, [userId]);

  useEffect(() => {
    loadLayout();
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === `dashboard-layout-${userId}`) {
        loadLayout();
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [loadLayout, userId]);

  const saveLayout = useCallback((newLayout: DraggableWidgetConfig[]) => {
    if (!Array.isArray(newLayout)) {
      console.error("saveLayout received non-array:", newLayout);
      return;
    }
    setLayout(newLayout);
    try {
      const serializable = newLayout.map(w => ({
        id: w.id,
        title: w.title,
        disabled: w.disabled,
        defaultOrder: w.defaultOrder,
        size: w.size || "default",
      }));
      localStorage.setItem(`dashboard-layout-${userId}`, JSON.stringify(serializable));
    } catch (e) {
      console.error("Failed to save dashboard layout:", e);
    }
  }, [userId]);

  return { layout, saveLayout, isLoaded };
}
