"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Listing } from "@prisma/client";
import { Download } from "lucide-react";

interface ListingsTableProps {
  data: (Listing & { inventory: { sku: string; itemName: string } })[];
}

export function ListingsTable({ data }: ListingsTableProps) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [platformFilter, setPlatformFilter] = useState("ALL");

  const filteredData = data.filter(item => {
    const itemDate = new Date(item.listedDate);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    if (start) start.setHours(0,0,0,0);
    if (end) end.setHours(23,59,59,999);

    const dateMatch = (!start || itemDate >= start) && (!end || itemDate <= end);
    const platformMatch = platformFilter === "ALL" || !platformFilter || item.platform === platformFilter;

    return dateMatch && platformMatch;
  });

  const handleExport = () => {
    const exportData = filteredData.map(item => ({
        SKU: item.inventory.sku,
        Item: item.inventory.itemName,
        Platform: item.platform,
        "Listed Price": item.listedPrice,
        "Listed Date": formatDate(item.listedDate),
        Status: item.status,
        "Link/Ref": item.listingUrl || item.listingRef || ""
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Listings");
    XLSX.writeFile(wb, `listings_export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-end justify-between bg-card p-4 rounded-lg border">
            <div className="flex flex-wrap gap-4 items-end">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Start Date</label>
                    <Input 
                        type="date" 
                        value={startDate} 
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-[150px]"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">End Date</label>
                    <Input 
                        type="date" 
                        value={endDate} 
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-[150px]"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Platform</label>
                    <Select value={platformFilter} onValueChange={setPlatformFilter}>
                        <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="All Platforms" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Platforms</SelectItem>
                            <SelectItem value="eBay">eBay</SelectItem>
                            <SelectItem value="Etsy">Etsy</SelectItem>
                            <SelectItem value="Amazon">Amazon</SelectItem>
                            <SelectItem value="Website">Website</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                {(startDate || endDate || platformFilter !== "ALL") && (
                    <Button 
                        variant="ghost" 
                        onClick={() => {
                            setStartDate("");
                            setEndDate("");
                            setPlatformFilter("ALL");
                        }}
                    >
                        Reset
                    </Button>
                )}
            </div>
            <Button onClick={handleExport} variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Export Excel
            </Button>
        </div>

        <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Listed Price</TableHead>
              <TableHead>Listed Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Link / Ref</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No listings found matching your filters.
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((listing) => (
                <TableRow key={listing.id}>
                  <TableCell className="font-mono">
                    {listing.inventory.sku}
                  </TableCell>
                  <TableCell>{listing.inventory.itemName}</TableCell>
                  <TableCell>{listing.platform}</TableCell>
                  <TableCell>
                    {formatCurrency(listing.listedPrice)}
                  </TableCell>
                  <TableCell>
                    {formatDate(listing.listedDate)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        listing.status === "LISTED"
                          ? "default"
                          : listing.status === "SOLD"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {listing.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {listing.listingUrl ? (
                      <a
                        href={listing.listingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline"
                      >
                        Link
                      </a>
                    ) : (
                      listing.listingRef || "-"
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </div>
    </div>
  );
}
