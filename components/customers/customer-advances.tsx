"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Wallet, Loader2 } from "lucide-react";
import Link from "next/link";

interface CustomerAdvance {
  id: string;
  amount: number;
  remainingAmount: number;
  adjustedAmount: number;
  paymentMode: string;
  paymentRef: string | null;
  notes: string | null;
  isAdjusted: boolean;
  createdAt: string;
  adjustments: {
    id: string;
    amountUsed: number;
    createdAt: string;
    sale: {
      id: string;
      invoiceId: string;
    } | null;
  }[];
}

interface CustomerAdvancesProps {
  customerId: string;
  customerName: string;
}

export function CustomerAdvances({ customerId, customerName }: CustomerAdvancesProps) {
  const [advances, setAdvances] = useState<CustomerAdvance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAdvances = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/customers/${customerId}/advances`);
        const data = await res.json();
        if (data.success) {
          setAdvances(data.advances || []);
        } else {
          setError(data.error || "Failed to fetch advances");
        }
      } catch {
        setError("Failed to fetch advances");
      } finally {
        setIsLoading(false);
      }
    };
    fetchAdvances();
  }, [customerId]);

  const totalAvailable = advances.reduce((sum, a) => sum + a.remainingAmount, 0);
  const totalReceived = advances.reduce((sum, a) => sum + a.amount, 0);
  const totalUsed = advances.reduce((sum, a) => sum + a.adjustedAmount, 0);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Received</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalReceived)}</div>
            <p className="text-xs text-muted-foreground">{advances.length} advance(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Used</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalUsed)}</div>
            <p className="text-xs text-muted-foreground">Adjusted against invoices</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalAvailable)}</div>
            <p className="text-xs text-muted-foreground">Remaining to use</p>
          </CardContent>
        </Card>
      </div>

      {/* Action Button */}
      <div className="flex justify-end">
        <Button asChild>
          <Link href={`/advances?customerId=${customerId}`}>
            <Wallet className="mr-2 h-4 w-4" />
            Record New Advance
          </Link>
        </Button>
      </div>

      {/* Advances Table */}
      <Card>
        <CardHeader>
          <CardTitle>Advance History</CardTitle>
        </CardHeader>
        <CardContent>
          {advances.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No advances recorded for this customer.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead>Used</TableHead>
                    <TableHead>Payment Mode</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {advances.map((advance) => (
                    <TableRow key={advance.id}>
                      <TableCell>{formatDate(advance.createdAt)}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(advance.amount)}</TableCell>
                      <TableCell className="text-green-600">{formatCurrency(advance.remainingAmount)}</TableCell>
                      <TableCell>{formatCurrency(advance.adjustedAmount)}</TableCell>
                      <TableCell>{advance.paymentMode}</TableCell>
                      <TableCell>
                        {advance.remainingAmount === 0 ? (
                          <span className="text-muted-foreground">Fully Used</span>
                        ) : advance.adjustedAmount > 0 ? (
                          <span className="text-amber-600">Partially Used</span>
                        ) : (
                          <span className="text-green-600">Available</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
