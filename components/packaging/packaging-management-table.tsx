"use client";

import { useState } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  SortingState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Search, ShoppingCart, Printer } from "lucide-react";
import { Inventory } from "@prisma/client";
import { addManyToPackagingCart, validatePackagingEligibility } from "@/app/erp/packaging/actions";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PackagingPrintDialog } from "./packaging-print-dialog";

interface InventoryWithRelations extends Inventory {
  colorCode?: { name: string } | null;
}

interface PackagingManagementTableProps {
  data: InventoryWithRelations[];
}

export function PackagingManagementTable({ data }: PackagingManagementTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [eligibilityOpen, setEligibilityOpen] = useState(false);
  const [eligibilityErrors, setEligibilityErrors] = useState<Array<{ id: string; sku: string; itemName: string; missing: string[] }>>([]);
  const [isBypassing] = useState(false);
  const [eligibilityMode, setEligibilityMode] = useState<"cart" | "print" | null>(null);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [printBypass, setPrintBypass] = useState(false);

  const columns: ColumnDef<InventoryWithRelations>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "sku",
      header: "SKU",
      cell: ({ row }) => <div className="font-mono">{row.getValue("sku")}</div>,
    },
    {
      accessorKey: "itemName",
      header: "Item Name",
    },
    {
      accessorKey: "gemType",
      header: "Type",
    },
    {
      accessorKey: "weightValue",
      header: "Weight",
      cell: ({ row }) => (
        <div>
          {row.original.weightValue} {row.original.weightUnit}
        </div>
      ),
    },
    {
      accessorKey: "stockLocation",
      header: "Location",
    },
    {
      accessorKey: "createdAt",
      header: "Added Date",
      cell: ({ row }) => {
        const date = new Date(row.original.createdAt);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return <div>{`${day}/${month}/${year}`}</div>;
      },
    },
  ];

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    getRowId: (row) => row.id,
    state: {
      sorting,
      globalFilter,
      rowSelection,
    },
    enableRowSelection: true,
  });

  const selectedIds: string[] = table.getFilteredSelectedRowModel().rows.map((row) => row.original.id);
  const selectedItems = table.getFilteredSelectedRowModel().rows.map((row) => row.original);

  const handleAddToCart = async () => {
    if (selectedIds.length === 0) return;
    try {
      const validation = await validatePackagingEligibility(selectedIds);
      if (!validation.success) {
        toast.error("Validation failed");
        return;
      }
      if (validation.errors.length > 0) {
        setEligibilityErrors(validation.errors);
        setEligibilityMode("cart");
        setEligibilityOpen(true);
      }
      if (validation.eligibleIds.length > 0) {
        const res = await addManyToPackagingCart(validation.eligibleIds, 1);
        if (res.success) {
          toast.success(`Added ${res.count} items to packaging cart`);
          setRowSelection({});
        } else {
          toast.error(res.message || "Failed to add to cart");
        }
      } else if (validation.errors.length > 0) {
        toast.error("No eligible items to add");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unexpected error";
      toast.error(msg);
    }
  };

  const handlePrintSelected = async () => {
    if (selectedIds.length === 0) return;
    try {
      const validation = await validatePackagingEligibility(selectedIds);
      if (!validation.success) {
        toast.error("Validation failed");
        return;
      }
      if (validation.errors.length > 0) {
        setEligibilityErrors(validation.errors);
        setEligibilityMode("print");
        setEligibilityOpen(true);
        return;
      }
      
      // If eligible, open print dialog directly
      setPrintBypass(false);
      setIsPrintDialogOpen(true);

    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unexpected error";
      toast.error(msg);
    }
  };

  const handleProceedAnyway = async () => {
    if (selectedIds.length === 0) return;
    setEligibilityOpen(false);
    setPrintBypass(true);
    setIsPrintDialogOpen(true);
  };

  const handleAddAnyway = async () => {
    if (selectedIds.length === 0) return;
    try {
      const res = await addManyToPackagingCart(selectedIds, 1);
      if (res.success) {
        toast.success(`Added ${res.count} items to packaging cart`);
        setEligibilityOpen(false);
        setRowSelection({});
      } else {
        toast.error(res.message || "Failed to add to cart");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unexpected error";
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 bg-background border rounded-lg">
        <div className="flex items-center gap-4 flex-1">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search SKU or name..."
            value={globalFilter ?? ""}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="max-w-sm"
          />
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            disabled={selectedIds.length === 0}
            onClick={handleAddToCart}
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            Add to Cart
          </Button>
          <Button disabled={selectedIds.length === 0} onClick={handlePrintSelected}>
            <Printer className="mr-2 h-4 w-4" />
            Print Selected ({selectedIds.length})
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>

      <Dialog open={eligibilityOpen} onOpenChange={setEligibilityOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Missing required fields</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {eligibilityErrors.length === 0 ? (
              <div className="text-sm text-muted-foreground">No errors</div>
            ) : (
              eligibilityErrors.map(err => (
                <div key={err.id} className="p-3 border rounded-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{err.itemName}</div>
                      <div className="text-xs text-muted-foreground">SKU: {err.sku}</div>
                    </div>
                    <Button variant="outline" asChild size="sm">
                      <Link href={`/inventory/${err.id}/edit`}>Edit</Link>
                    </Button>
                  </div>
                  <div className="mt-2 text-sm">
                    Missing: {err.missing.join(", ")}
                  </div>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            {eligibilityMode === "cart" && (
              <>
                <Button variant="outline" onClick={handleAddAnyway}>Add Anyway</Button>
                <Button variant="secondary" onClick={() => setEligibilityOpen(false)}>Close</Button>
              </>
            )}
            {eligibilityMode === "print" && (
              <>
                <Button onClick={handleProceedAnyway} disabled={isBypassing}>
                  {isBypassing ? "Proceeding..." : "Proceed Anyway"}
                </Button>
                <Button variant="secondary" onClick={() => setEligibilityOpen(false)}>Close</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PackagingPrintDialog
        open={isPrintDialogOpen}
        onOpenChange={setIsPrintDialogOpen}
        inventoryIds={selectedIds}
        previewItems={selectedItems}
        bypass={printBypass}
        onPrintComplete={() => setRowSelection({})}
      />
    </div>
  );
}
