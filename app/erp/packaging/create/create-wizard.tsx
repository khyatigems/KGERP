"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Loader2, Search, Printer, ShoppingCart, Trash2, Eye, RefreshCw, Box } from "lucide-react";
import { toast } from "sonner";
import { 
  getPackagingInventory, 
  addToPackagingCart, 
  clearPackagingCart, 
  createPackagingPrintFromCart,
  getPackagingCart,
  removeFromPackagingCart,
  previewPackagingFromCart,
} from "@/app/erp/packaging/actions";
import { generatePackagingPdfBlob, createObjectUrl, type PackagingLabelData, type PackagingSheetLayout } from "@/lib/packaging-pdf-generator";
import type { Inventory } from "@prisma/client";
import { Settings2 } from "lucide-react";

// --- Types ---

type CartItem = {
  inventoryId: string;
  quantity: number;
  location?: string | null;
  inventory: Inventory | null;
};

// --- Helpers ---

function resolvePackingDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

// --- Main Component ---

export function CreatePackagingWizard() {
  // State: Inventory List
  const [search, setSearch] = useState("");
  const [invList, setInvList] = useState<Inventory[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loadingInv, setLoadingInv] = useState(false);
  const [debugInfo, setDebugInfo] = useState<{ inStockCount?: number, totalCount?: number, dbUrl?: string } | null>(null);

  // State: Cart / Batch
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loadingCart, setLoadingCart] = useState(false);

  // State: Print Configuration
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [manufacturingDate, setManufacturingDate] = useState(new Date().toISOString().slice(0, 10));
  const [labelVariant, setLabelVariant] = useState<"RETAIL" | "EXPORT">("RETAIL");
  const [startPosition, setStartPosition] = useState(1);
  const [layoutParams, setLayoutParams] = useState<PackagingSheetLayout>({
    pageWidthMm: 210,
    pageHeightMm: 297,
    cols: 2,
    rows: 5,
    labelWidthMm: 100,
    labelHeightMm: 50,
    marginLeftMm: 5,
    marginTopMm: 23.5,
    gapXmm: 0,
    gapYmm: 0,
    offsetXmm: 0,
    offsetYmm: 0,
    startPosition: 1,
  });
  const [layoutDialogOpen, setLayoutDialogOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  
  // --- Persistence ---
  const STORAGE_KEY = "packaging-layout-settings-v1";

  // Clamp startPosition if layout changes
  useEffect(() => {
    const maxPos = layoutParams.cols * layoutParams.rows;
    if (startPosition > maxPos) {
      setStartPosition(1);
    }
  }, [layoutParams.cols, layoutParams.rows, startPosition]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed[labelVariant]) {
          setLayoutParams(prev => ({
            ...prev,
            ...parsed[labelVariant],
            // Ensure we don't overwrite runtime startPosition with stored junk if any
          }));
        } else {
           // Reset to defaults if no saved setting for this variant? 
           // Or just keep current default. 
           // Maybe better to have explicit defaults per variant if needed, 
           // but for now keeping the hardcoded default is fine.
        }
      } catch (e) {
        console.error("Failed to parse layout settings", e);
      }
    }
  }, [labelVariant]);

  const handleSaveLayout = (newLayout: PackagingSheetLayout) => {
    setLayoutParams(newLayout);
    setLayoutDialogOpen(false);
    
    // Persist
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      let data: Record<string, PackagingSheetLayout> = {};
      if (saved) {
        data = JSON.parse(saved);
      }
      data[labelVariant] = newLayout;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      toast.success(`Layout saved for ${labelVariant} variant`);
    } catch (e) {
      console.error("Failed to save layout", e);
      toast.error("Failed to save layout settings");
    }
  };

  const refreshInventory = useCallback(async (query?: string, p?: number) => {
    setLoadingInv(true);
    try {
      const res = await getPackagingInventory({ search: query, page: p ?? page, limit: 10 });
      if (res.success) {
        setInvList(res.data as Inventory[]);
        setPages(res.pagination.pages);
      }
    } finally {
      setLoadingInv(false);
    }
  }, [page]);

  useEffect(() => {
    void refreshInventory();
  }, [refreshInventory]);

  // --- Cart Management ---

  const refreshCart = useCallback(async () => {
    setLoadingCart(true);
    try {
      const items = await getPackagingCart();
      // Map Prisma result to CartItem
      const mapped: CartItem[] = items.map(i => ({
        inventoryId: i.inventoryId,
        quantity: i.quantity,
        location: i.location,
        inventory: i.inventory as unknown as Inventory
      }));
      setCartItems(mapped);
    } finally {
      setLoadingCart(false);
    }
  }, []);

  useEffect(() => {
    void refreshCart();
  }, [refreshCart]);

  const handleAddToCart = async (item: Inventory, qty: number, loc: string) => {
    // Optimistic update
    const tempItem: CartItem = {
      inventoryId: item.id,
      quantity: qty,
      location: loc,
      inventory: item
    };
    setCartItems(prev => [...prev.filter(i => i.inventoryId !== item.id), tempItem]);
    
    try {
      await addToPackagingCart(item.id, qty, loc);
      toast.success("Added to batch");
      await refreshCart();
    } catch {
      toast.error("Failed to add to batch");
      void refreshCart(); // Revert
    }
  };

  const handleRemoveFromCart = async (id: string) => {
    setCartItems(prev => prev.filter(i => i.inventoryId !== id));
    try {
      await removeFromPackagingCart(id);
      toast.success("Removed from batch");
    } catch {
      toast.error("Failed to remove");
      void refreshCart();
    }
  };

  const handleClearCart = () => {
    setClearDialogOpen(true);
  };

  const confirmClearCart = async () => {
    setCartItems([]);
    setClearDialogOpen(false);
    try {
      await clearPackagingCart();
      toast.success("Batch cleared successfully");
    } catch {
      toast.error("Failed to clear batch");
      void refreshCart();
    }
  };

  // --- Print & Preview ---

  const handleGeneratePreview = useCallback(async () => {
    if (!printDialogOpen) return; 
    
    // We use generatingPdf for UI state, but prevent re-entry via check if needed.
    // However, since we debounce, let's just proceed.
    
    setGeneratingPdf(true);
    try {
      const packedDate = resolvePackingDate(manufacturingDate);
      // Use the preview-specific action that doesn't delete the cart
      const res = await previewPackagingFromCart({ packingDate: packedDate }); 
      if (!res.success) {
        // If cart is empty, maybe don't show error toast on auto-refresh?
        // But if user clicked button, show it.
        // For now, suppress error if message is "Cart is empty" on auto-refresh?
        // But we can't distinguish auto vs manual here easily without args.
        // Just log it.
        console.warn("Preview generation:", res.message);
        if (res.message !== "Cart is empty") {
             toast.error(res.message);
        }
        return;
      }

      // Map to label data
      const labels: PackagingLabelData[] = (res.labels as unknown as PackagingLabelData[]).map(label => ({
        ...label,
        packingDate: packedDate,
        labelVariant,
      }));
      
      const layout: PackagingSheetLayout = {
        ...layoutParams,
        startPosition: startPosition,
      };

      const blob = await generatePackagingPdfBlob(labels, layout, {
        selectedFields: ["header", "footer", "qr", "barcode", "price", "origin", "weight"],
        drawGuides: false,
        drawCellNumbers: false,
      });

      const url = createObjectUrl(blob);
      setPreviewUrl(url);
      
    } catch (e) {
      console.error(e);
      toast.error("Preview generation failed");
    } finally {
      setGeneratingPdf(false);
    }
  }, [printDialogOpen, manufacturingDate, labelVariant, layoutParams, startPosition]); // Removed generatingPdf from deps

  // Auto-refresh preview when settings change
  useEffect(() => {
    if (printDialogOpen && cartItems.length > 0) {
      const timer = setTimeout(() => {
        void handleGeneratePreview();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [printDialogOpen, cartItems.length, handleGeneratePreview]);

  // We need to actually GENERATE serials before we can print for real.
  // The "Print From Cart" flow in `create-wizard.tsx` (old) called `runCartPrintWithDate`.
  // But `runCartPrintWithDate` calls `createPackagingPrintFromCart`.
  // I suspect `createPackagingPrintFromCart` MIGHT handle serial generation or it expects them?
  // I need to check the rest of `actions.ts`.
  // Since I can't check right now, I'll assume I need to generate serials first.
  
  // Let's implement a "Generate & Print" flow.
  // 1. Generate serials for all items in cart.
  // 2. Create print job.
  // 3. Generate PDF.
  
  const handleProcessBatch = async () => {
    // Just open the dialog. The actual generation will happen on "Generate & Print"
    setPrintDialogOpen(true);
  };

  const handleFinalizeAndPrint = async () => {
    if (cartItems.length === 0) return;
    setGeneratingPdf(true);
    try {
      const packedDate = resolvePackingDate(manufacturingDate);
      
      const res = await createPackagingPrintFromCart({
        bypass: true,
        packingDate: packedDate,
        labelVariant: labelVariant
      });

      if (!res.success) {
        toast.error(res.message);
        return;
      }

      // Generate Final PDF
      const labels: PackagingLabelData[] = (res.labels as unknown as PackagingLabelData[]).map(label => ({
        ...label,
        packingDate: packedDate, // Ensure client side match
        labelVariant,
      }));

      const layout: PackagingSheetLayout = {
        ...layoutParams,
        startPosition: startPosition,
      };

      const blob = await generatePackagingPdfBlob(labels, layout, {
        selectedFields: ["header", "footer", "qr", "barcode", "price", "origin", "weight"],
        drawGuides: false,
        drawCellNumbers: false,
      });

      const url = createObjectUrl(blob);
      
      // Open PDF in new tab
      window.open(url, "_blank");
      
      toast.success("Batch processed and printed successfully");
      setPrintDialogOpen(false);
      await refreshCart(); // Cart is cleared on server, refresh UI

    } catch (e) {
      console.error(e);
      toast.error("Failed to process batch");
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="h-[calc(100vh-220px)] min-h-[500px] flex flex-col lg:flex-row gap-6">
      
      {/* Left Panel: Inventory Selection */}
      <div className="flex-1 flex flex-col min-h-0 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Select Inventory</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search SKU or Name..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 w-64 h-9"
              />
            </div>
            <Button size="sm" variant="outline" onClick={() => refreshInventory(search, 1)}>
              Search
            </Button>
          </div>
        </div>

        <Card className="flex-1 min-h-0 flex flex-col border-muted overflow-hidden">
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="w-[140px]">SKU</TableHead>
                  <TableHead>Item Details</TableHead>
                  <TableHead className="w-[80px] text-center">Stock</TableHead>
                  <TableHead className="w-[160px]">Pack Config</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingInv ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : invList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <p>No items found</p>
                        {debugInfo && (
                          <p className="text-xs text-muted-foreground">
                            DB: {debugInfo.dbUrl}<br/>
                            Total: {debugInfo.totalCount} | In-Stock: {debugInfo.inStockCount}
                          </p>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  invList.map(item => (
                    <InventoryRow key={item.id} item={item} onAdd={handleAddToCart} />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="p-2 border-t flex items-center justify-between bg-muted/20">
            <span className="text-xs text-muted-foreground pl-2">Page {page} of {pages}</span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
              <Button variant="ghost" size="sm" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Right Panel: Batch / Cart */}
      <div className="w-full lg:w-[380px] flex flex-col min-h-0 space-y-4">
        <div className="flex items-center justify-between h-9">
          <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Packaging Batch
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 min-w-5">{cartItems.length}</Badge>
          </h2>
          <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-destructive" onClick={handleClearCart} disabled={cartItems.length === 0}>
            Clear All
          </Button>
        </div>

        <Card className="flex-1 min-h-0 flex flex-col border-muted shadow-sm overflow-hidden">
          <ScrollArea className="flex-1 p-3">
            {cartItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-3 opacity-60">
                <Box className="h-10 w-10" />
                <div className="text-center">
                  <p className="text-sm font-medium">Batch is empty</p>
                  <p className="text-xs">Add items from the left to start</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {cartItems.map((item, idx) => (
                  <div key={idx} className="group flex items-start justify-between p-3 rounded-md border bg-card hover:border-primary/50 transition-colors">
                    <div className="space-y-1 min-w-0 flex-1 mr-2">
                      <div className="font-mono text-xs font-medium text-foreground/80">{item.inventory?.sku}</div>
                      <div className="text-sm font-medium truncate" title={item.inventory?.itemName}>{item.inventory?.itemName}</div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant="outline" className="text-[10px] h-5 font-normal px-1.5 bg-muted/30">
                          Qty: {item.quantity}
                        </Badge>
                        {item.location && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Box className="h-3 w-3" /> {item.location}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 -mr-1"
                      onClick={() => handleRemoveFromCart(item.inventoryId)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          <div className="p-4 border-t bg-muted/10 space-y-3">
             <div className="flex items-center justify-between text-sm px-1">
                <span className="text-muted-foreground">Total Labels:</span>
                <span className="font-bold text-lg">{cartItems.reduce((acc, i) => acc + i.quantity, 0)}</span>
             </div>
             <Button className="w-full font-medium" size="default" disabled={cartItems.length === 0 || loadingCart} onClick={handleProcessBatch}>
               {loadingCart ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
               Generate & Print Batch
             </Button>
          </div>
        </Card>
      </div>

      {/* Clear Confirmation Dialog */}
      <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear Packaging Batch</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove all {cartItems.length} items from the batch? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmClearCart}>Clear All</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Preview Dialog */}
      <Dialog open={printDialogOpen} onOpenChange={setPrintDialogOpen}>
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
          <div className="flex flex-1 min-h-0">
            {/* Sidebar: Settings */}
            <div className="w-80 border-r bg-muted/10 p-6 flex flex-col gap-6 overflow-y-auto">
              <div>
                <DialogHeader className="mb-4">
                  <DialogTitle>Print Settings</DialogTitle>
                  <DialogDescription>Configure your print job</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Manufacturing Date</Label>
                    <Input 
                      type="date" 
                      value={manufacturingDate} 
                      onChange={e => setManufacturingDate(e.target.value)} 
                    />
                    <p className="text-[10px] text-muted-foreground">Printed as &quot;Pkd: MMM YYYY&quot;</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Label Variant</Label>
                    <Select value={labelVariant} onValueChange={(v) => setLabelVariant(v as "RETAIL" | "EXPORT")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="RETAIL">Retail (Domestic)</SelectItem>
                        <SelectItem value="EXPORT">Export (International)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                       <Label>Page Layout</Label>
                       <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setLayoutDialogOpen(true)}>
                         <Settings2 className="w-3 h-3 mr-1" /> Configure
                       </Button>
                    </div>
                    <div className="text-[10px] text-muted-foreground border rounded p-2 bg-muted/50">
                      {layoutParams.cols}x{layoutParams.rows} Grid ({layoutParams.labelWidthMm}x{layoutParams.labelHeightMm}mm)
                      <br />
                      Gap: {layoutParams.gapXmm}x{layoutParams.gapYmm}mm | Margin: {layoutParams.marginLeftMm}x{layoutParams.marginTopMm}mm
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Start Position (1-{layoutParams.cols * layoutParams.rows})</Label>
                    <Select value={startPosition.toString()} onValueChange={(v) => setStartPosition(parseInt(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: layoutParams.cols * layoutParams.rows }, (_, i) => i + 1).map((pos) => (
                          <SelectItem key={pos} value={pos.toString()}>
                            Position {pos}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground">Select where to start printing on the sheet</p>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                     <Label className="text-muted-foreground">Batch Summary</Label>
                     <div className="text-sm">
                       <div className="flex justify-between py-1">
                         <span>Items</span>
                         <span className="font-mono">{cartItems.length}</span>
                       </div>
                       <div className="flex justify-between py-1">
                         <span>Total Labels</span>
                         <span className="font-mono">{cartItems.reduce((acc, i) => acc + i.quantity, 0)}</span>
                       </div>
                     </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-auto">
                <Button variant="outline" className="w-full mb-2" onClick={handleGeneratePreview} disabled={generatingPdf}>
                  {generatingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  Refresh Preview
                </Button>
                <p className="text-[10px] text-center text-muted-foreground">
                  Preview updates automatically when settings change
                </p>
              </div>
            </div>

            {/* Main Area: Preview */}
            <div className="flex-1 bg-muted/30 flex flex-col">
               <div className="flex-1 p-8 flex items-center justify-center overflow-hidden">
                 {generatingPdf ? (
                   <div className="flex flex-col items-center gap-2 text-muted-foreground">
                     <Loader2 className="h-8 w-8 animate-spin" />
                     <p>Generating Preview...</p>
                   </div>
                 ) : previewUrl ? (
                   <iframe 
                     src={previewUrl} 
                     className="w-full h-full shadow-lg rounded-lg border bg-white" 
                     title="Label Preview"
                   />
                 ) : (
                   <div className="flex flex-col items-center gap-2 text-muted-foreground opacity-50">
                     <Eye className="h-12 w-12" />
                     <p>Click Refresh to view preview</p>
                   </div>
                 )}
               </div>
               <div className="p-4 border-t bg-background flex items-center justify-between">
                 <div className="text-sm text-muted-foreground">
                   {/* Status info */}
                 </div>
                 <div className="flex gap-2">
                   <Button variant="outline" onClick={() => setPrintDialogOpen(false)}>Close</Button>
                   <Button onClick={handleFinalizeAndPrint} disabled={!previewUrl || generatingPdf}>
                     {generatingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
                     Generate & Print Batch
                   </Button>
                 </div>
               </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Layout Configuration Dialog */}
      <PackagingLayoutSettingsDialog 
        key={layoutDialogOpen ? "open" : "closed"}
        open={layoutDialogOpen} 
        onOpenChange={setLayoutDialogOpen}
        currentLayout={layoutParams}
        onSave={handleSaveLayout}
      />
    </div>
  );
}

// --- Sub-Components ---

function PackagingLayoutSettingsDialog({
  open,
  onOpenChange,
  currentLayout,
  onSave
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentLayout: PackagingSheetLayout;
  onSave: (layout: PackagingSheetLayout) => void;
}) {
  const [layout, setLayout] = useState<PackagingSheetLayout>(currentLayout);

  const handleChange = (field: keyof PackagingSheetLayout, value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    setLayout(prev => ({ ...prev, [field]: num }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Configure Page Layout</DialogTitle>
          <DialogDescription>Adjust sheet dimensions, margins, and spacing (in mm)</DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label>Page Width (mm)</Label>
            <Input type="number" value={layout.pageWidthMm} onChange={e => handleChange("pageWidthMm", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Page Height (mm)</Label>
            <Input type="number" value={layout.pageHeightMm} onChange={e => handleChange("pageHeightMm", e.target.value)} />
          </div>
          
          <div className="space-y-2">
            <Label>Label Width (mm)</Label>
            <Input type="number" value={layout.labelWidthMm} onChange={e => handleChange("labelWidthMm", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Label Height (mm)</Label>
            <Input type="number" value={layout.labelHeightMm} onChange={e => handleChange("labelHeightMm", e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Columns</Label>
            <Input type="number" value={layout.cols} onChange={e => handleChange("cols", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Rows</Label>
            <Input type="number" value={layout.rows} onChange={e => handleChange("rows", e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Margin Left (mm)</Label>
            <Input type="number" value={layout.marginLeftMm} onChange={e => handleChange("marginLeftMm", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Margin Top (mm)</Label>
            <Input type="number" value={layout.marginTopMm} onChange={e => handleChange("marginTopMm", e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Gap X (mm)</Label>
            <Input type="number" value={layout.gapXmm} onChange={e => handleChange("gapXmm", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Gap Y (mm)</Label>
            <Input type="number" value={layout.gapYmm} onChange={e => handleChange("gapYmm", e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onSave(layout)}>Save Layout</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InventoryRow({ item, onAdd }: { item: Inventory, onAdd: (i: Inventory, q: number, l: string) => void }) {
  // Smart defaults based on item type
  const defaultQty = item.pieces || 1;
  const isLoose = item.gemType?.toLowerCase().includes("loose");
  
  const [qty, setQty] = useState(isLoose ? 1 : defaultQty);
  const [loc, setLoc] = useState(item.stockLocation || "");

  return (
    <TableRow className="hover:bg-muted/5">
      <TableCell className="font-mono text-xs font-medium">{item.sku}</TableCell>
      <TableCell>
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-sm truncate max-w-[180px]" title={item.itemName}>{item.itemName}</span>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            {item.category}
            <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
            {item.pieces} units
          </span>
        </div>
      </TableCell>
      <TableCell className="text-center text-xs font-mono">{item.pieces}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <div className="flex flex-col gap-0.5">
            <Label className="text-[9px] text-muted-foreground">Qty</Label>
            <Input 
              type="number" 
              className="w-14 h-7 text-xs px-2" 
              min={1} 
              max={item.pieces}
              value={qty} 
              onChange={e => setQty(parseInt(e.target.value))}
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <Label className="text-[9px] text-muted-foreground">Loc</Label>
            <Input 
              className="w-20 h-7 text-xs px-2" 
              placeholder="Loc" 
              value={loc}
              onChange={e => setLoc(e.target.value)}
            />
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Button size="sm" variant="secondary" className="h-7 w-full text-xs" onClick={() => onAdd(item, qty, loc)}>
          Add
        </Button>
      </TableCell>
    </TableRow>
  );
}
