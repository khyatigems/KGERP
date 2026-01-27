"use client";

import { useState, useEffect } from "react";
import { getVoucherReport, createReceipt, getCompanyDetailsForVoucher } from "@/app/(dashboard)/accounting/actions";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Search, Printer, Plus, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { generateVoucherPDF } from "../../lib/voucher-pdf";
import { generateMonthlyRegisterPDF } from "../../lib/voucher-register-pdf";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Voucher {
  id: string;
  voucherNumber: string;
  voucherDate: Date | string;
  voucherType: string;
  amount: number;
  narration: string | null;
  isReversed: boolean;
  expense?: {
      vendorName?: string | null;
      category?: { name: string };
      paymentMode?: string;
  } | null;
  createdBy?: { name: string } | null;
}

interface VoucherReportData {
  vouchers: Voucher[];
  stats: {
      totalDebits: number;
      totalCredits: number;
      totalReversals: number;
      count: number;
  };
}

export function VoucherReport() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date()
  });
  const [type, setType] = useState("ALL");
  const [search, setSearch] = useState("");
  const [data, setData] = useState<VoucherReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);

  // Receipt Form State
  const [receiptData, setReceiptData] = useState({
      amount: "",
      fromName: "",
      description: "",
      paymentMode: "CASH",
      date: new Date()
  });

  const handleCreateReceipt = async () => {
      if (!receiptData.amount || !receiptData.fromName) {
          toast.error("Please fill required fields");
          return;
      }
      try {
          const res = await createReceipt({
              ...receiptData,
              amount: Number(receiptData.amount),
              date: receiptData.date
          });
          if (res.success) {
              toast.success("Receipt Voucher Created");
              setReceiptOpen(false);
              setReceiptData({ amount: "", fromName: "", description: "", paymentMode: "CASH", date: new Date() });
              fetchData();
          } else {
              toast.error("Failed to create receipt");
        }
    } catch {
        toast.error("Error creating receipt");
    }
};

  const handleDownloadPDF = async (voucher: Voucher) => {
    try {
        const company = await getCompanyDetailsForVoucher();
        
        const pdfBlob = await generateVoucherPDF({
          voucherNumber: voucher.voucherNumber,
          date: new Date(voucher.voucherDate),
          type: voucher.voucherType,
          amount: voucher.amount,
          narration: voucher.narration,
          category: voucher.expense?.category?.name || "General",
          vendorName: voucher.expense?.vendorName,
          paymentMode: voucher.expense?.paymentMode || "CASH",
          createdBy: "Admin", 
          companyName: company.name,
          companyAddress: company.address,
          companyPhone: company.phone || undefined,
          companyEmail: company.email || undefined,
          logoUrl: company.logoUrl || undefined
        });
        
        if (!(pdfBlob instanceof Blob)) {
            throw new Error("PDF generation failed to return a Blob");
        }

        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Voucher-${voucher.voucherNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Cleanup
        setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (e) {
        console.error(e);
        toast.error("Failed to generate PDF");
    }
  };

  const handleDownloadRegister = async () => {
    if (!data?.vouchers || data.vouchers.length === 0) {
      toast.error("No vouchers to export");
      return;
    }

    try {
      toast.info("Generating Register PDF...");
      const company = await getCompanyDetailsForVoucher();
      
      // Determine month/year from filters or current date
      // Use the 'from' date if available, otherwise current date
      const reportDate = dateRange?.from || new Date();
      const monthName = format(reportDate, "MMMM");
      const year = reportDate.getFullYear();

      // If date range is wide, maybe indicate that? But for "Monthly Register" usually implies a month.
      // We will title it based on the start date's month, but the data is whatever is filtered.
      
      const registerData = {
        month: monthName,
        year: year,
        companyName: company.name,
        generatedBy: "Admin", // TODO: Replace with actual user name if available
        entries: data.vouchers.map(v => ({
            date: new Date(v.voucherDate),
            voucherNo: v.voucherNumber,
            type: v.isReversed ? `${v.voucherType} (CXL)` : v.voucherType,
            category: v.expense?.category?.name || "General",
            vendor: v.expense?.vendorName || "-",
            narration: v.narration || "-",
            amount: v.amount
        })),
        totalCount: data.stats.count,
        totalAmount: data.vouchers.filter(v => !v.isReversed).reduce((sum, v) => sum + v.amount, 0)
      };

      const pdfBlob = await generateMonthlyRegisterPDF(registerData);
       
      if (!(pdfBlob instanceof Blob)) {
          throw new Error("PDF generation failed to return a Blob");
      }

      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Voucher-Register-${monthName}-${year}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      setTimeout(() => URL.revokeObjectURL(url), 100);
      toast.success("Register downloaded successfully");

    } catch (e) {
      console.error(e);
      toast.error("Failed to generate Register PDF");
    }
  };

  async function fetchData() {
    setLoading(true);
    try {
      const result = await getVoucherReport({
        startDate: dateRange?.from,
        endDate: dateRange?.to,
        type,
        search
      });
      setData(result);
    } catch (error) {
      console.error("Failed to fetch report", error);
    } finally {
      setLoading(false);
    }
  }

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchData();
  }, [dateRange, type]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
          <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
              <DialogTrigger asChild>
                  <Button className="bg-green-600 hover:bg-green-700">
                      <Plus className="mr-2 h-4 w-4" /> Receive Payment (In)
                  </Button>
              </DialogTrigger>
              <DialogContent>
                  <DialogHeader>
                      <DialogTitle>Create Receipt Voucher</DialogTitle>
                      <DialogDescription>Record money received into the company.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                              <Label>Received From</Label>
                              <Input 
                                  placeholder="Payer Name" 
                                  value={receiptData.fromName}
                                  onChange={(e) => setReceiptData({...receiptData, fromName: e.target.value})}
                              />
                          </div>
                          <div className="space-y-2">
                              <Label>Amount</Label>
                              <Input 
                                  type="number" 
                                  placeholder="0.00" 
                                  value={receiptData.amount}
                                  onChange={(e) => setReceiptData({...receiptData, amount: e.target.value})}
                              />
                          </div>
                      </div>
                      <div className="space-y-2">
                          <Label>Narration / Description</Label>
                          <Input 
                              placeholder="e.g. Advance payment for order #123" 
                              value={receiptData.description}
                              onChange={(e) => setReceiptData({...receiptData, description: e.target.value})}
                          />
                      </div>
                      <div className="space-y-2">
                          <Label>Payment Mode</Label>
                          <Select 
                              value={receiptData.paymentMode} 
                              onValueChange={(val) => setReceiptData({...receiptData, paymentMode: val})}
                          >
                              <SelectTrigger>
                                  <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="CASH">Cash</SelectItem>
                                  <SelectItem value="UPI">UPI</SelectItem>
                                  <SelectItem value="BANK">Bank Transfer</SelectItem>
                                  <SelectItem value="CHEQUE">Cheque</SelectItem>
                              </SelectContent>
                          </Select>
                      </div>
                  </div>
                  <DialogFooter>
                      <Button onClick={handleCreateReceipt}>Save Receipt</Button>
                  </DialogFooter>
              </DialogContent>
          </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium">Report Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
               <label className="text-sm font-medium mb-1 block">Date Period</label>
               <DateRangePicker date={dateRange} setDate={setDateRange} />
            </div>
            <div className="w-full md:w-48">
               <label className="text-sm font-medium mb-1 block">Voucher Type</label>
               <Select value={type} onValueChange={setType}>
                 <SelectTrigger>
                   <SelectValue placeholder="Type" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="ALL">All Vouchers</SelectItem>
                   <SelectItem value="EXPENSE">Expense (Dr)</SelectItem>
                   <SelectItem value="RECEIPT">Receipt (Cr)</SelectItem>
                   <SelectItem value="PAYMENT">Payment (Dr)</SelectItem>
                   <SelectItem value="REVERSAL">Reversal</SelectItem>
                 </SelectContent>
               </Select>
            </div>
            <div className="flex-1">
               <label className="text-sm font-medium mb-1 block">Search</label>
               <div className="flex gap-2">
                 <Input 
                    placeholder="Search V.No, Vendor, Narration..." 
                    value={search} 
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && fetchData()}
                 />
                 <Button onClick={fetchData} variant="secondary">
                   <Search className="h-4 w-4" />
                 </Button>
               </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      {data && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Debit (Out)</CardTitle>
              <ArrowUpCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(data.stats.totalDebits)}</div>
            </CardContent>
          </Card>
          <Card>
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Credit (In)</CardTitle>
              <ArrowDownCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(data.stats.totalCredits)}</div>
            </CardContent>
          </Card>
          <Card>
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${data.stats.totalCredits - data.stats.totalDebits >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(data.stats.totalCredits - data.stats.totalDebits)}
              </div>
            </CardContent>
          </Card>
          <Card>
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Voucher Count</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.stats.count}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Ledger Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Ledger Register</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadRegister}>
              <FileText className="mr-2 h-4 w-4" /> Download Register
            </Button>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" /> Export Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Voucher No</TableHead>
                <TableHead>Particulars</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Debit (Out)</TableHead>
                <TableHead className="text-right">Credit (In)</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                 <TableRow>
                   <TableCell colSpan={9} className="text-center h-24">Loading records...</TableCell>
                 </TableRow>
              ) : data?.vouchers.length === 0 ? (
                 <TableRow>
                   <TableCell colSpan={9} className="text-center h-24">No vouchers found for this period.</TableCell>
                 </TableRow>
              ) : (
                data?.vouchers.map((voucher) => {
                    const isCredit = voucher.voucherType === "RECEIPT";
                    const isDebit = voucher.voucherType === "EXPENSE" || voucher.voucherType === "PAYMENT";
                    
                    return (
                      <TableRow key={voucher.id} className={voucher.isReversed ? "opacity-60 bg-muted/50" : ""}>
                        <TableCell className="font-medium">
                            {format(new Date(voucher.voucherDate), "dd-MMM-yy")}
                        </TableCell>
                        <TableCell>{voucher.voucherNumber}</TableCell>
                        <TableCell>
                            <div className="flex flex-col">
                                <span>{voucher.narration}</span>
                                {voucher.expense?.vendorName && (
                                    <span className="text-xs text-muted-foreground">Vendor: {voucher.expense.vendorName}</span>
                                )}
                            </div>
                        </TableCell>
                        <TableCell>
                            <Badge variant={isCredit ? "default" : "outline"} className={isCredit ? "bg-green-600 hover:bg-green-700" : ""}>
                                {voucher.voucherType}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-red-600">
                            {isDebit && !voucher.isReversed ? formatCurrency(voucher.amount) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-green-600">
                            {isCredit && !voucher.isReversed ? formatCurrency(voucher.amount) : "-"}
                        </TableCell>
                         <TableCell className="text-center">
                            {voucher.isReversed ? (
                                <Badge variant="destructive">Cancelled</Badge>
                            ) : (
                                <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
                            )}
                        </TableCell>
                        <TableCell className="text-right">
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleDownloadPDF(voucher)}
                                title="Download Voucher PDF"
                            >
                                <Printer className="h-4 w-4" />
                            </Button>
                        </TableCell>
                      </TableRow>
                    );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
