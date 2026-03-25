"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/utils";
import { CustomerReceivables } from "@/components/customers/customer-receivables";

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
  createdAt: Date | string;
  updatedAt: Date | string;
};

export function CustomerDetailTabs({ customer }: { customer: CustomerView }) {
  return (
    <Tabs defaultValue="profile">
      <TabsList>
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="receivables">Receivables</TabsTrigger>
      </TabsList>

      <TabsContent value="profile">
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

      <TabsContent value="receivables">
        <CustomerReceivables customerId={customer.id} customerName={customer.name} />
      </TabsContent>
    </Tabs>
  );
}
