"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/utils";
import { CustomerReceivables } from "@/components/customers/customer-receivables";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

type CustomerView = {
  id: string;
  customerCode: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  phoneSecondary: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  pincode: string | null;
  pan: string | null;
  gstin: string | null;
  notes: string | null;
  customerType?: string | null;
  assignedSalesperson?: string | null;
  whatsappNumber?: string | null;
  preferredContact?: string | null;
  budgetRange?: string | null;
  interestedIn?: string | null;
  dateOfBirth?: string | null;
  anniversaryDate?: string | null;
  communicationOptIn?: boolean | null;
  preferredLanguage?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export function CustomerDetailTabs({ customer, stats, recentInvoices }: { customer: CustomerView, stats?: Record<string, unknown>, recentInvoices?: Record<string, unknown>[] }) {
  let tierColor = "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300";
  if (stats?.tier === "Platinum") tierColor = "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
  else if (stats?.tier === "Gold") tierColor = "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";

  return (
    <Tabs defaultValue="profile">
      <TabsList>
        <TabsTrigger value="profile">Profile & Summary</TabsTrigger>
        <TabsTrigger value="timeline">Purchase Timeline</TabsTrigger>
        <TabsTrigger value="receivables">Receivables</TabsTrigger>
      </TabsList>

      <TabsContent value="profile">
        {stats && (
          <div className="grid gap-4 md:grid-cols-5 mb-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-medium">Customer Tier</p>
                <div className="mt-1"><Badge variant="secondary" className={tierColor}>{stats.tier as string}</Badge></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-medium">Total Revenue</p>
                <p className="text-lg font-bold">{formatCurrency(stats.totalRevenue as number)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-medium">Total Orders</p>
                <p className="text-lg font-bold">{stats.orderCount as number}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-medium">Avg Order Value</p>
                <p className="text-lg font-bold">{formatCurrency(stats.aov as number)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-medium">Highest Order</p>
                <p className="text-lg font-bold">{formatCurrency(stats.highestOrder as number)}</p>
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Customer Code</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Customer Code</span>
              <span className="font-semibold font-mono">{customer.customerCode || "-"}</span>
            </div>
          </CardContent>
        </Card>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><span className="text-muted-foreground">Email:</span> {customer.email || "-"}</div>
              <div><span className="text-muted-foreground">Primary Phone:</span> {customer.phone || "-"}</div>
              <div><span className="text-muted-foreground">Secondary Phone:</span> {customer.phoneSecondary || "-"}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="whitespace-pre-wrap">{customer.address || "-"}</div>
              <div>
                {[customer.city, customer.state, customer.country].filter(Boolean).join(", ") || "-"}
              </div>
              <div><span className="text-muted-foreground">Pincode:</span> {customer.pincode || "-"}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Intelligence & Comms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><span className="text-muted-foreground">Type:</span> {customer.customerType || "Retail"}</div>
              <div><span className="text-muted-foreground">Salesperson:</span> {customer.assignedSalesperson || "-"}</div>
              <div><span className="text-muted-foreground">WhatsApp:</span> {customer.whatsappNumber || "-"}</div>
              <div><span className="text-muted-foreground">Pref. Contact:</span> {customer.preferredContact || "-"}</div>
              <div><span className="text-muted-foreground">Budget:</span> {customer.budgetRange || "-"}</div>
              <div><span className="text-muted-foreground">Interested In:</span> {customer.interestedIn || "-"}</div>
              <div><span className="text-muted-foreground">DOB:</span> {customer.dateOfBirth ? formatDate(customer.dateOfBirth) : "-"}</div>
              <div><span className="text-muted-foreground">Anniversary:</span> {customer.anniversaryDate ? formatDate(customer.anniversaryDate) : "-"}</div>
              <div><span className="text-muted-foreground">Opt-In:</span> {customer.communicationOptIn === false ? "No" : "Yes"}</div>
              <div><span className="text-muted-foreground">Language:</span> {customer.preferredLanguage || "-"}</div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Business (Optional)</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 md:grid-cols-3 text-sm">
            <div><span className="text-muted-foreground">PAN:</span> {customer.pan || "-"}</div>
            <div><span className="text-muted-foreground">GSTIN:</span> {customer.gstin || "-"}</div>
            <div><span className="text-muted-foreground">Updated:</span> {formatDate(customer.updatedAt)}</div>
            <div className="md:col-span-3 whitespace-pre-wrap"><span className="text-muted-foreground">Notes:</span> {customer.notes || "-"}</div>
            <div className="md:col-span-3 text-xs text-muted-foreground">Created {formatDate(customer.createdAt)}</div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="timeline">
        <Card>
          <CardHeader>
            <CardTitle>Recent Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            {(!recentInvoices || recentInvoices.length === 0) ? (
              <p className="text-sm text-muted-foreground">No purchase history found.</p>
            ) : (
              <div className="space-y-4">
                {recentInvoices.map((inv) => (
                  <div key={inv.id as string} className="flex justify-between items-start border-b pb-4 last:border-0 last:pb-0">
                    <div>
                      <Link href={`/invoices/${inv.id}`} className="font-medium text-blue-600 hover:underline">
                        {inv.invoiceNumber as string}
                      </Link>
                      <div className="text-sm text-muted-foreground mt-1">
                        {formatDate((inv.invoiceDate || inv.createdAt) as Date)}
                      </div>
                      <div className="text-sm mt-1">
                        {((inv.sales as Record<string, unknown>[]) || []).map((s) => (s.inventory as Record<string, unknown>)?.itemName as string).filter(Boolean).join(", ") || "No items"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{formatCurrency(inv.totalAmount as number)}</div>
                      <Badge variant="outline" className="mt-1">{inv.paymentStatus as string}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="receivables">
        <CustomerReceivables customerId={customer.id} customerName={customer.name} />
      </TabsContent>
    </Tabs>
  );
}
