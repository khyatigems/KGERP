"use client";

import { useState, useEffect } from "react";
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
import { VendorAnalytics } from "./vendor-analytics";
import { cn } from "@/lib/utils";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Bar,
  ResponsiveContainer
} from "recharts";

interface VendorReportClientProps {
  vendors: { id: string; name: string }[];
  overviewData: any; // Using the type from vendor-analytics
  reportData: any | null;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

// Helper to aggregate data for charts
const getInventoryCharts = (items: any[]) => {
  const categoryMap = new Map<string, number>();
  items.forEach(item => {
    const key = item.category || 'Uncategorized';
    categoryMap.set(key, (categoryMap.get(key) || 0) + 1);
  });
  return Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value }));
};

const getPurchaseCharts = (items: any[]) => {
  const dateMap = new Map<string, number>();
  items.forEach(item => {
    const key = format(new Date(item.date), "MMM yyyy");
    dateMap.set(key, (dateMap.get(key) || 0) + item.totalAmount);
  });
  return Array.from(dateMap.entries()).map(([name, value]) => ({ name, value }));
};

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
    
    // Also sync report type if changed externally (e.g. via Link)
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
    // If vendors are selected but not applied, should we apply them?
    // Let's assume the user wants to see the current report type for the APPLIED vendors.
    // If they want to change vendors, they should use Apply Filters.
    router.push(`/reports/vendor?${params.toString()}`);
  };

  // Update URL when filters change
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

    // Prepare Summary Metrics
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
      // Use searchParams to ensure date range matches the data displayed
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
      // Ideally show toast here
    } finally {
      setIsExporting(false);
    }
  };

  // Condition to show report: reportData must exist.
  // If no reportData (i.e. no vendorId in URL), show Overview.
  const showReport = !!reportData;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Vendor Reports</h1>
        
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

            {/* Date Picker with Presets - Always visible or conditional? User asked for Date Range Search functionality */}
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

      {/* Main Content */}
      {!showReport ? (
        <div className="space-y-6">
           {selectedVendors.length === 0 ? (
                <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-md">
                    Please select one or more vendors from the dropdown above and click "Apply Filters" to view detailed inventory and purchase reports.
                </div>
           ) : (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md">
                    Click "Apply Filters" to view the report for {selectedVendors.length} selected vendors.
                </div>
           )}
           <VendorAnalytics data={overviewData} />
        </div>
      ) : (
        <div className="space-y-6">
          <Tabs value={reportType} onValueChange={handleTabChange} className="w-full">
            <div className="flex justify-between items-center mb-4">
              <TabsList>
                <TabsTrigger value="inventory">Inventory Level</TabsTrigger>
                <TabsTrigger value="purchase">Purchase History</TabsTrigger>
              </TabsList>
              
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

            <TabsContent value="inventory" className="space-y-4">
              {reportData && (
                <>
                  {/* Inventory Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Items</CardTitle></CardHeader>
                      <CardContent><div className="text-2xl font-bold">{reportData.summary.totalItems}</div></CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Carats</CardTitle></CardHeader>
                      <CardContent><div className="text-2xl font-bold">{reportData.summary.totalCarats?.toFixed(2) || "0.00"}</div></CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Stock Value</CardTitle></CardHeader>
                      <CardContent><div className="text-2xl font-bold text-green-600">{formatCurrency(reportData.summary.totalValue || 0)}</div></CardContent>
                    </Card>
                  </div>

                  {/* Inventory Charts */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader><CardTitle>Inventory by Category</CardTitle></CardHeader>
                      <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={getInventoryCharts(reportData.items)}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {getInventoryCharts(reportData.items).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader><CardTitle>Value Distribution (Top 5 Items)</CardTitle></CardHeader>
                      <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={reportData.items
                              .sort((a: any, b: any) => b.costPrice - a.costPrice)
                              .slice(0, 5)
                              .map((i: any) => ({ name: i.itemName.substring(0, 15), value: i.costPrice }))}
                            layout="vertical"
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" tickFormatter={(v) => `₹${v/1000}k`} />
                            <YAxis dataKey="name" type="category" width={100} style={{ fontSize: '12px' }} />
                            <Tooltip formatter={(value: any) => formatCurrency(value)} />
                            <Bar dataKey="value" fill="#8884d8" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Detailed Table */}
                  <Card>
                    <CardHeader><CardTitle>Detailed Inventory</CardTitle></CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>SKU</TableHead>
                            <TableHead>Item Name</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Weight</TableHead>
                            <TableHead>Cost Price</TableHead>
                            {selectedVendors.length > 1 && <TableHead>Vendor</TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reportData.items.map((item: any) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-mono">{item.sku}</TableCell>
                              <TableCell>{item.itemName}</TableCell>
                              <TableCell>{item.category}</TableCell>
                              <TableCell>{item.weightValue} {item.weightUnit}</TableCell>
                              <TableCell>{formatCurrency(item.costPrice)}</TableCell>
                              {selectedVendors.length > 1 && <TableCell>{item.vendorName}</TableCell>}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            <TabsContent value="purchase" className="space-y-4">
               {reportData && (
                <>
                  {/* Purchase Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Invoices</CardTitle></CardHeader>
                      <CardContent><div className="text-2xl font-bold">{reportData.summary.totalCount}</div></CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Amount</CardTitle></CardHeader>
                      <CardContent><div className="text-2xl font-bold text-blue-600">{formatCurrency(reportData.summary.totalAmount)}</div></CardContent>
                    </Card>
                  </div>

                  {/* Purchase Charts */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <Card>
                      <CardHeader><CardTitle>Purchase Trend</CardTitle></CardHeader>
                      <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={getPurchaseCharts(reportData.items)}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip formatter={(value: any) => formatCurrency(value)} />
                            <Bar dataKey="value" fill="#82ca9d" />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Detailed Table */}
                  <Card>
                    <CardHeader><CardTitle>Purchase History</CardTitle></CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Invoice No</TableHead>
                            <TableHead>Item</TableHead>
                            <TableHead>Weight</TableHead>
                            <TableHead>Total Amount</TableHead>
                            {selectedVendors.length > 1 && <TableHead>Vendor</TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reportData.items.map((item: any, idx: number) => (
                            <TableRow key={idx}>
                              <TableCell>{format(new Date(item.date), "dd MMM yyyy")}</TableCell>
                              <TableCell>{item.invoiceNo}</TableCell>
                              <TableCell>{item.itemName}</TableCell>
                              <TableCell>{item.weight}</TableCell>
                              <TableCell>{formatCurrency(item.totalAmount)}</TableCell>
                              {selectedVendors.length > 1 && <TableCell>{item.vendorName}</TableCell>}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </>
               )}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
