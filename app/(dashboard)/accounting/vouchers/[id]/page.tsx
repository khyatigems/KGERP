import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { VoucherPDFButton } from "@/components/accounting/voucher-pdf-button";

export default async function VoucherViewPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  const voucher = await prisma.voucher.findUnique({
    where: { id },
    include: {
        expense: {
            include: { category: true }
        },
        createdBy: { select: { name: true } }
    }
  });

  if (!voucher) {
      return <div className="p-10">Voucher not found</div>;
  }

  const isCredit = voucher.voucherType === "RECEIPT";
  
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
              <Link href="/accounting/reports">
                  <Button variant="outline" size="icon">
                      <ArrowLeft className="h-4 w-4" />
                  </Button>
              </Link>
              <div>
                  <h1 className="text-2xl font-bold">{voucher.voucherType} VOUCHER</h1>
                  <p className="text-muted-foreground">{voucher.voucherNumber}</p>
              </div>
          </div>
          <VoucherPDFButton voucher={voucher} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
          {/* Main Details */}
          <Card className="md:col-span-2">
              <CardHeader>
                  <CardTitle>Voucher Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                          <label className="text-sm text-muted-foreground">Date</label>
                          <div className="font-medium">{format(new Date(voucher.voucherDate), "dd MMMM yyyy")}</div>
                      </div>
                      <div>
                          <label className="text-sm text-muted-foreground">Amount</label>
                          <div className="font-bold text-xl">{formatCurrency(voucher.amount)}</div>
                      </div>
                      <div>
                          <label className="text-sm text-muted-foreground">Status</label>
                          <div>
                              {voucher.isReversed ? (
                                  <Badge variant="destructive">Cancelled</Badge>
                              ) : (
                                  <Badge className="bg-green-600">Active</Badge>
                              )}
                          </div>
                      </div>
                      <div>
                          <label className="text-sm text-muted-foreground">Created By</label>
                          <div className="font-medium">{voucher.createdBy?.name || "Admin"}</div>
                      </div>
                  </div>

                  <div className="border-t pt-4 mt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                              <label className="text-sm text-muted-foreground block mb-1">Particulars</label>
                              <div className="bg-muted/30 p-3 rounded-md">
                                  <div className="font-medium">{voucher.expense?.category?.name || (isCredit ? "Income" : "Expense")}</div>
                                  <div className="text-sm text-muted-foreground mt-1">{voucher.narration}</div>
                              </div>
                          </div>
                          <div>
                              <label className="text-sm text-muted-foreground block mb-1">Payment Info</label>
                              <div className="bg-muted/30 p-3 rounded-md space-y-1">
                                  <div className="flex justify-between">
                                      <span className="text-sm">Mode:</span>
                                      <span className="font-medium">{voucher.expense?.paymentMode || "CASH"}</span>
                                  </div>
                                  {voucher.expense?.vendorName && (
                                      <div className="flex justify-between">
                                          <span className="text-sm">Party:</span>
                                          <span className="font-medium">{voucher.expense.vendorName}</span>
                                      </div>
                                  )}
                              </div>
                          </div>
                      </div>
                  </div>
              </CardContent>
          </Card>
      </div>
    </div>
  );
}
