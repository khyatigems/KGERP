"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { formatCurrency } from "@/lib/utils";
import { DateRangePickerWithPresets } from "@/components/ui/date-range-picker-with-presets";
import { generateExcel, generatePDF } from "@/lib/report-generator";
import { Loader2, Filter, FileText, Download, Search, Calendar, X, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { VendorAnalytics, AnalyticsData } from "./vendor-analytics";
import { cn } from "@/lib/utils";

interface VendorReportClientProps {
  vendors: { id: string; name: string }[];
  overviewData: AnalyticsData;
  reportData: any | null;
}

export function VendorReportClient({ vendors, overviewData, reportData }: VendorReportClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parse initial vendors from URL
  const initialVendorIds = searchParams.get("vendorId") 
    ? searchParams.get("vendorId") === "all" 
        ? vendors.map(v => v.id) 
        : searchParams.get("vendorId")!.split(",")
    : [];

  const [selectedVendors, setSelectedVendors] = useState<string[]>(initialVendorIds);
  const [reportType, setReportType] = useState<string>(searchParams.get("type") || "inventory");
  const [date, setDate] = useState<DateRange | undefined>({
    from: searchParams.get("from") ? new Date(searchParams.get("from")!) : undefined,
    to: searchParams.get("to") ? new Date(searchParams.get("to")!) : undefined,
  });
  const [isExporting, setIsExporting] = useState(false);
  const [isVendorOpen, setIsVendorOpen] = useState(false);

  // Sync state with URL params on mount/change
  useEffect(() => {
    const vendorParam = searchParams.get("vendorId");
    if (vendorParam === "all") {
        setSelectedVendors(vendors.map(v => v.id));
    } else if (vendorParam) {
        setSelectedVendors(vendorParam.split(","));
    } else {
        setSelectedVendors([]);
    }
    
    // Also sync report type if changed externally
    const typeParam = searchParams.get("type");
    if (typeParam) {
        setReportType(typeParam);
    }
  }, [searchParams, vendors]);

  const toggleVendor = (vendorId: string) => {
    setSelectedVendors(prev => 
      prev.includes(vendorId) 
        ? prev.filter(id => id !== vendorId)
        : [...prev, vendorId]
    );
  };

  const toggleAllVendors = () => {
    if (selectedVendors.length === vendors.length) {
        setSelectedVendors([]);
    } else {
        setSelectedVendors(vendors.map(v => v.id));
    }
  };

  const handleTabChange = (value: string) => {
    setReportType(value);
    const params = new URLSearchParams(searchParams.toString());
    params.set("type", value);
    router.push(`/reports/vendor?${params.toString()}`);
  };

  const applyFilters = () => {
    const params = new URLSearchParams();
    
    if (selectedVendors.length > 0) {
        if (selectedVendors.length === vendors.length) {
            params.set("vendorId", "all");
        } else {
            params.set("vendorId", selectedVendors.join(","));
        }
    }

    params.set("type", reportType);
    if (date?.from) params.set("from", date.from.toISOString());
    if (date?.to) params.set("to", date.to.toISOString());
    
    router.push(`/reports/vendor?${params.toString()}`);
  };

  const handleExport = async (format: 'pdf' | 'excel' | 'both') => {
    if (!reportData) return;
    setIsExporting(true);

    let summaryMetrics = [];
    if (reportType === 'inventory') {
      summaryMetrics = [
        { label: 'Total Items', value: reportData.summary.totalItems },
        { label: 'Total Carats', value: reportData.summary.totalCarats.toFixed(2) },
        { label: 'Total Value', value: formatCurrency(reportData.summary.totalValue) }
      ];
    } else {
      summaryMetrics = [
        { label: 'Total Invoices', value: reportData.summary.totalCount },
        { label: 'Total Amount', value: formatCurrency(reportData.summary.totalAmount) }
      ];
    }

    const options = {
      reportType: reportType as 'inventory' | 'purchase',
      vendorName: reportData.vendorName || "Multiple Vendors",
      showVendorColumn: selectedVendors.length > 1,
      dateRange: {
        from: searchParams.get("from") ? new Date(searchParams.get("from")!) : undefined,
        to: searchParams.get("to") ? new Date(searchParams.get("to")!) : undefined,
      },
      items: reportData.items,
      summaryMetrics
    };

    try {
      if (format === 'excel' || format === 'both') {
        generateExcel(options);
      }
      if (format === 'pdf' || format === 'both') {
        generatePDF(options);
      }
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const showReport = !!reportData;
  const isAllVendors = searchParams.get("vendorId") === "all";
  const pageTitle = reportType === "inventory" ? "Vendor Inventory Reports" : "Vendor Purchase Reports";

  // Derive Analytics Data for Filtered Reports (Client-Side)
  const filteredAnalyticsData: AnalyticsData | null = useMemo(() => {
    if (!reportData || !reportData.items) return null;

    if (reportType === "inventory") {
      const items = reportData.items;
      const totalItems = items.length;
      const totalValue = items.reduce((sum: number, i: any) => sum + (i.costPrice || 0), 0);
      
      const categoryMap = new Map<string, number>();
      const vendorValueMap = new Map<string, number>();
      const activeVendorsSet = new Set<string>();

      items.forEach((item: any) => {
         const cat = item.category || "Uncategorized";
         categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
         
         const vName = item.vendorName || "Unknown";
         activeVendorsSet.add(vName);
         vendorValueMap.set(vName, (vendorValueMap.get(vName) || 0) + (item.costPrice || 0));
      });

      return {
        type: "inventory",
        totalItems,
        totalValue,
        activeVendors: activeVendorsSet.size,
        categoryDistribution: Array.from(categoryMap.entries())
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value),
        topVendorsByValue: Array.from(vendorValueMap.entries())
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 10)
      };
    } else {
      // Purchase
      const items = reportData.items;
      const totalSpend = items.reduce((sum: number, i: any) => sum + (i.totalAmount || 0), 0);
      
      const monthlySpendMap = new Map<string, { spend: number; count: number }>();
      const vendorSpendMap = new Map<string, { spend: number; count: number }>();
      const activeVendorsSet = new Set<string>();

      // Initialize last 6 months for chart consistency if needed, 
      // but for filtered data, we might just show what's available or map to the date range.
      // Let's just map available data for simplicity and accuracy of the filter.
      
      items.forEach((item: any) => {
         const monthKey = format(new Date(item.date), "MMM yyyy");
         const currentMonth = monthlySpendMap.get(monthKey) || { spend: 0, count: 0 };
         monthlySpendMap.set(monthKey, {
           spend: currentMonth.spend + (item.totalAmount || 0),
           count: currentMonth.count + 1
         });

         const vName = item.vendorName || "Unknown";
         activeVendorsSet.add(vName);
         const currentVendor = vendorSpendMap.get(vName) || { spend: 0, count: 0 };
         vendorSpendMap.set(vName, {
           spend: currentVendor.spend + (item.totalAmount || 0),
           count: currentVendor.count + 1
         });
      });

      // Sort months chronologically? 
      // We need a way to sort. Simple string sort might fail for "Jan 2026" vs "Dec 2025".
      // Let's rely on the input order if it's sorted, or sort by date parsing.
      const monthlySpend = Array.from(monthlySpendMap.entries())
        .map(([month, data]) => ({ month, ...data }))
        // Sort by parsing month string is tricky without reference year if range is wide.
        // Assuming typical usage, we can leave as is or basic sort.
        // For better UX, we could just sort by the date key if we stored it.
        // Let's keep it simple: Map insertion order usually follows iteration order.
        // Since input items are sorted by date (desc/asc), we might need to reverse for chart.
        .reverse(); 

      return {
        type: "purchase",
        totalSpend,
        activeVendors: activeVendorsSet.size,
        totalPurchases: items.length,
        monthlySpend: monthlySpend,
        topVendors: Array.from(vendorSpendMap.entries())
          .map(([name, data]) => ({ name, ...data }))
          .sort((a, b) => b.spend - a.spend)
          .slice(0, 10)
      };
    }
  }, [reportData, reportType]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">{pageTitle}</h1>
        
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
            <Popover open={isVendorOpen} onOpenChange={setIsVendorOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={isVendorOpen} className="w-[250px] justify-between">
                        {selectedVendors.length === 0 
                            ? "Select Vendors" 
                            : selectedVendors.length === vendors.length 
                                ? "All Vendors Selected"
                                : `${selectedVendors.length} Vendors Selected`
                        }
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[250px] p-0">
                    <Command>
                        <CommandInput placeholder="Search vendor..." />
                        <CommandList>
                            <CommandEmpty>No vendor found.</CommandEmpty>
                            <CommandGroup>
                                <CommandItem onSelect={toggleAllVendors}>
                                    <div className={cn(
                                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                        selectedVendors.length === vendors.length ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible"
                                    )}>
                                        <Check className={cn("h-4 w-4")} />
                                    </div>
                                    <span>Select All</span>
                                </CommandItem>
                                <CommandSeparator />
                                {vendors.map((vendor) => (
                                    <CommandItem
                                        key={vendor.id}
                                        onSelect={() => toggleVendor(vendor.id)}
                                    >
                                        <div className={cn(
                                            "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                            selectedVendors.includes(vendor.id) ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible"
                                        )}>
                                            <Check className={cn("h-4 w-4")} />
                                        </div>
                                        <span>{vendor.name}</span>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            {/* Date Picker - Only for Purchase Reports */}
            {reportType === "purchase" && (
              <DateRangePickerWithPresets 
                date={date}
                onDateChange={setDate}
                align="end"
              />
            )}

            <Button onClick={applyFilters}>
            <Filter className="mr-2 h-4 w-4" />
            Apply Filters
            </Button>
        </div>
      </div>

      <Tabs value={reportType} onValueChange={handleTabChange} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="inventory">Inventory Level</TabsTrigger>
          <TabsTrigger value="purchase">Purchase History</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Main Content */}
      {!showReport ? (
        <div className="space-y-6">
           {selectedVendors.length === 0 ? (
                <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-md">
                    Please select one or more vendors from the dropdown above and click "Apply Filters".
                </div>
           ) : (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md">
                    Click "Apply Filters" to view the report for {selectedVendors.length} selected vendors.
                </div>
           )}
           {/* Show Global Overview when no specific report is loaded */}
           <VendorAnalytics data={overviewData} />
        </div>
      ) : (
        <div className="space-y-6">
            
            {/* Show Analytics Dashboard for the current filtered data */}
            {filteredAnalyticsData && (
                <VendorAnalytics data={filteredAnalyticsData} />
            )}

            {/* Detailed Report Table */}
            <div className="flex justify-between items-center mt-8">
                <h2 className="text-xl font-semibold">Detailed List</h2>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleExport('excel')} disabled={isExporting}>
                    {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />} 
                    Excel
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleExport('pdf')} disabled={isExporting}>
                    {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    PDF
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => handleExport('both')} disabled={isExporting}>
                    {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    Both
                    </Button>
                </div>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {reportType === "inventory" ? (
                        <>
                          <TableHead>SKU</TableHead>
                          <TableHead>Item Name</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Weight</TableHead>
                          <TableHead>Cost Price</TableHead>
                        </>
                      ) : (
                        <>
                          <TableHead>Date</TableHead>
                          <TableHead>Invoice No</TableHead>
                          <TableHead>Item</TableHead>
                          <TableHead>Weight</TableHead>
                          <TableHead>Total Amount</TableHead>
                        </>
                      )}
                      {selectedVendors.length > 1 && <TableHead>Vendor</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.items.map((item: any, idx: number) => (
                      <TableRow key={item.id || idx}>
                        {reportType === "inventory" ? (
                          <>
                            <TableCell className="font-mono">{item.sku}</TableCell>
                            <TableCell>{item.itemName}</TableCell>
                            <TableCell>{item.category}</TableCell>
                            <TableCell>{item.weightValue} {item.weightUnit}</TableCell>
                            <TableCell>{formatCurrency(item.costPrice)}</TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell>{format(new Date(item.date), "dd MMM yyyy")}</TableCell>
                            <TableCell>{item.invoiceNo}</TableCell>
                            <TableCell>{item.itemName}</TableCell>
                            <TableCell>{item.weight}</TableCell>
                            <TableCell>{formatCurrency(item.totalAmount)}</TableCell>
                          </>
                        )}
                        {selectedVendors.length > 1 && <TableCell>{item.vendorName}</TableCell>}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
        </div>
      )}
    </div>
  );
}
