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
import { LabelPrintDialog } from "@/components/inventory/label-print-dialog";
import { addManyToCart } from "@/app/(dashboard)/labels/actions";
import { LabelItem } from "@/lib/label-generator";
import { toast } from "sonner";
import { Search, ShoppingCart } from "lucide-react";
import { Inventory } from "@prisma/client";

interface InventoryWithRelations extends Inventory {
  colorCode?: { name: string } | null;
}

interface LabelsManagementTableProps {
  data: InventoryWithRelations[];
}

export function LabelsManagementTable({ data }: LabelsManagementTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState("");

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

  const selectedItems: LabelItem[] = table.getFilteredSelectedRowModel().rows.map((row) => ({
    id: row.original.id,
    sku: row.original.sku,
    itemName: row.original.itemName,
    gemType: row.original.gemType || "",
    color: row.original.colorCode?.name || "",
    weightValue: row.original.weightValue || 0,
    weightUnit: row.original.weightUnit || "",
    weightRatti: row.original.weightRatti,
    sellingPrice: row.original.flatSellingPrice || row.original.sellingRatePerCarat || 0,
    sellingRatePerCarat: row.original.sellingRatePerCarat,
  }));

  const handleAddToCart = async () => {
    const selectedIds = selectedItems.map(item => item.id);
    if (selectedIds.length === 0) return;
    
    try {
    const res = await addManyToCart(selectedIds) as { success: boolean; message?: string; count?: number };
    if (res.success) {
            toast.success(`Added ${res.count} items to cart`);
            setRowSelection({});
        } else {
            console.error("Add to cart error response:", res);
            toast.error(typeof res.message === 'string' ? res.message : "Failed to add to cart");
        }
    } catch (e: unknown) {
        console.error("Add to cart exception:", e);
        const msg = e instanceof Error ? e.message : "An unexpected error occurred";
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
                disabled={selectedItems.length === 0}
                onClick={handleAddToCart}
            >
                <ShoppingCart className="mr-2 h-4 w-4" />
                Add to Cart
            </Button>
            <LabelPrintDialog 
                items={selectedItems}
                trigger={
                  <Button disabled={selectedItems.length === 0}>
                    Print Selected ({selectedItems.length})
                  </Button>
                }
            />
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
    </div>
  );
}
