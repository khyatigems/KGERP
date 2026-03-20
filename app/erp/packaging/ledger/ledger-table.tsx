"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Search, Printer, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { PackagingPrintDialog } from "@/components/packaging/packaging-print-dialog";
import { getPublicLabelData } from "../actions";
import { PackagingLabelData } from "@/lib/packaging-pdf-generator";

type SerialItem = {
  id: string;
  serialNumber: string;
  sku: string;
  status: string;
  inventoryLocation: string | null;
  packedAt: string | Date;
};

export function SerialLedgerTable({ 
  data, 
  pagination 
}: { 
  data: SerialItem[]; 
  pagination: { page: number; pages: number } 
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [printLabelData, setPrintLabelData] = useState<PackagingLabelData[]>([]);
  const [reprintingId, setReprintingId] = useState<string | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`?page=1&search=${encodeURIComponent(search)}`);
  };

  const handlePageChange = (newPage: number) => {
    router.push(`?page=${newPage}&search=${encodeURIComponent(search)}`);
  };

  const handleReprint = async (serial: string, id: string) => {
    try {
      setReprintingId(id);
      const res = await getPublicLabelData(serial);
      if (!res.success || !res.data) {
        toast.error(res.message || "Failed to load label data");
        return;
      }
      setPrintLabelData([res.data as unknown as PackagingLabelData]);
      setPrintDialogOpen(true);
    } catch (error) {
      toast.error("An error occurred while fetching label data");
      console.error(error);
    } finally {
      setReprintingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          placeholder="Search by Serial or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Button type="submit" variant="secondary">
          <Search className="h-4 w-4 mr-2" />
          Search
        </Button>
      </form>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Serial Number</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Packed At</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                  No serials found.
                </TableCell>
              </TableRow>
            ) : (
              data.map((serial) => (
                <TableRow key={serial.id}>
                  <TableCell className="font-mono font-medium">{serial.serialNumber}</TableCell>
                  <TableCell>{serial.sku}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                        serial.status === "ACTIVE" ? "bg-green-50 text-green-700 border-green-200" :
                        serial.status === "REPRINTED" ? "bg-blue-50 text-blue-700 border-blue-200" :
                        serial.status === "CANCELLED" ? "bg-red-50 text-red-700 border-red-200" :
                        "bg-gray-100"
                    }>
                      {serial.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{serial.inventoryLocation}</TableCell>
                  <TableCell>{format(new Date(serial.packedAt), "MMM d, yyyy")}</TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleReprint(serial.serialNumber, serial.id)}
                      disabled={reprintingId === serial.id}
                    >
                      {reprintingId === serial.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Printer className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(pagination.page - 1)}
          disabled={pagination.page <= 1}
        >
          Previous
        </Button>
        <div className="text-sm text-muted-foreground">
          Page {pagination.page} of {pagination.pages}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(pagination.page + 1)}
          disabled={pagination.page >= pagination.pages}
        >
          Next
        </Button>
      </div>

      <PackagingPrintDialog
        open={printDialogOpen}
        onOpenChange={setPrintDialogOpen}
        labels={printLabelData}
      />
    </div>
  );
}
