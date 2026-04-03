"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RecordAdvanceDialog } from "@/components/advances/record-advance-dialog";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { Plus, Search, Wallet, ArrowUpRight, ArrowDownRight, Download, Loader2 } from "lucide-react";
import { generateAdvanceReceiptPDF, type AdvanceReceiptData } from "@/lib/advance-receipt-generator";
import { exportAdvancesToCSV, exportAdvancesToExcel, exportAdvancesToPDF } from "@/lib/advances-export";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileSpreadsheet, FileText, File as FilePdf } from "lucide-react";

export interface Advance {
  id: string;
  customerId: string;
  customerName: string;
  customerMobile: string;
  amount: number;
  remainingAmount: number;
  paymentMode: string;
  paymentRef?: string | null;
  notes?: string | null;
  isAdjusted: boolean;
  adjustedAmount: number;
  createdAt: Date;
}

interface AdvancesPageProps {
  advances: Advance[];
  customers: { id: string; name: string; phone?: string; address?: string; email?: string }[];
  companySettings?: {
    id: string;
    companyName: string;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    gstin?: string | null;
    website?: string | null;
    logoUrl?: string | null;
  } | null;
}

// Download button component for advance receipts
function DownloadAdvanceButton({ 
  advance, 
  companySettings 
}: { 
  advance: Advance; 
  companySettings?: AdvancesPageProps["companySettings"];
}) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleDownload = async () => {
    setLoading(true);
    try {
      const pdfData: AdvanceReceiptData = {
        advanceNumber: `ADV-${advance.id.slice(-6).toUpperCase()}`,
        date: new Date(advance.createdAt),
        amount: advance.amount,
        remainingAmount: advance.remainingAmount,
        paymentMode: advance.paymentMode,
        paymentRef: advance.paymentRef,
        notes: advance.notes,
        customer: {
          name: advance.customerName,
          phone: advance.customerMobile,
        },
        company: {
          name: companySettings?.companyName || "Khyati Gems",
          address: companySettings?.address,
          phone: companySettings?.phone,
          email: companySettings?.email,
          gstin: companySettings?.gstin,
          website: companySettings?.website,
          logoUrl: companySettings?.logoUrl,
        },
        terms: "This advance is valid for 6 months from the date of issue. Please present this receipt for any adjustments or refunds. Refunds are subject to company policy.",
      };

      const blob = await generateAdvanceReceiptPDF(pdfData);
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement("a");
      a.href = url;
      a.download = `Advance-Receipt-${pdfData.advanceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      setTimeout(() => URL.revokeObjectURL(url), 100);
      
      toast({
        title: "Receipt Downloaded",
        description: `Advance receipt ${pdfData.advanceNumber} has been downloaded.`,
      });
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      toast({
        title: "Download Failed",
        description: "Failed to generate advance receipt. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDownload}
      disabled={loading}
      className="h-8 w-8 p-0"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
    </Button>
  );
}

export function AdvancesPage({ advances, customers, companySettings }: AdvancesPageProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [showRecordDialog, setShowRecordDialog] = useState(false);

  const filteredAdvances = advances.filter((advance) => {
    const matchesSearch =
      advance.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      advance.customerMobile.includes(searchTerm);

    if (activeTab === "unadjusted") {
      return matchesSearch && advance.remainingAmount > 0;
    } else if (activeTab === "adjusted") {
      return matchesSearch && advance.remainingAmount === 0;
    }
    return matchesSearch;
  });

  const totalAdvances = advances.reduce((sum, a) => sum + a.amount, 0);
  const totalRemaining = advances.reduce((sum, a) => sum + a.remainingAmount, 0);
  const totalAdjusted = advances.reduce((sum, a) => sum + a.adjustedAmount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customer Advances</h1>
          <p className="text-muted-foreground">
            Record and manage customer advance payments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Export Options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => exportAdvancesToCSV(filteredAdvances)}>
                <FileText className="mr-2 h-4 w-4" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportAdvancesToExcel(filteredAdvances)}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export as Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportAdvancesToPDF(filteredAdvances)}>
                <FilePdf className="mr-2 h-4 w-4" />
                Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => setShowRecordDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Record Advance
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Advances</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalAdvances)}</div>
            <p className="text-xs text-muted-foreground">
              {advances.length} advance(s) recorded
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining Balance</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatCurrency(totalRemaining)}
            </div>
            <p className="text-xs text-muted-foreground">Available to adjust</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Adjusted Amount</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(totalAdjusted)}
            </div>
            <p className="text-xs text-muted-foreground">Used against invoices</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs and Search */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="all">All Advances</TabsTrigger>
            <TabsTrigger value="unadjusted">Unadjusted</TabsTrigger>
            <TabsTrigger value="adjusted">Fully Adjusted</TabsTrigger>
          </TabsList>
          <div className="relative w-72">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead>Payment Mode</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAdvances.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center h-24">
                        No advances found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAdvances.map((advance) => (
                      <TableRow key={advance.id}>
                        <TableCell>
                          <div className="font-medium">{advance.customerName}</div>
                          <div className="text-sm text-muted-foreground">
                            {advance.customerMobile}
                          </div>
                        </TableCell>
                        <TableCell>{formatCurrency(advance.amount)}</TableCell>
                        <TableCell>
                          <span
                            className={
                              advance.remainingAmount > 0
                                ? "text-emerald-600 font-medium"
                                : "text-muted-foreground"
                            }
                          >
                            {formatCurrency(advance.remainingAmount)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{advance.paymentMode}</Badge>
                          {advance.paymentRef && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Ref: {advance.paymentRef}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {format(new Date(advance.createdAt), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell>
                          {advance.remainingAmount === 0 ? (
                            <Badge variant="secondary">Fully Adjusted</Badge>
                          ) : advance.adjustedAmount > 0 ? (
                            <Badge variant="outline" className="bg-blue-50">
                              Partially Used
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                              Available
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DownloadAdvanceButton 
                            advance={advance} 
                            companySettings={companySettings}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <RecordAdvanceDialog
        open={showRecordDialog}
        onOpenChange={setShowRecordDialog}
        customers={customers}
      />
    </div>
  );
}
