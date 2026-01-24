"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { updateInvoiceSettings } from "./actions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { InvoiceSettings, PaymentSettings } from "@prisma/client-custom-v2";

import { SignatureUpload } from "@/components/invoice/signature-upload";

interface InvoiceSettingsFormProps {
  initialSettings: Partial<InvoiceSettings> | null;
  initialPaymentSettings: Partial<PaymentSettings> | null;
  categories: { id: string; name: string }[];
}

export function InvoiceSettingsForm({ initialSettings, initialPaymentSettings, categories }: InvoiceSettingsFormProps) {
  const [isPending, setIsPending] = useState(false);
  const [signatureUrl, setSignatureUrl] = useState(initialSettings?.digitalSignatureUrl || "");
  
  // Parse initial GST rates
  const [gstRates, setGstRates] = useState<Record<string, string>>(() => {
    try {
      return initialSettings?.categoryGstRates ? JSON.parse(initialSettings.categoryGstRates) : {};
    } catch {
      return {};
    }
  });

  const handleRateChange = (categoryName: string, rate: string) => {
    setGstRates(prev => ({
      ...prev,
      [categoryName]: rate
    }));
  };

  const [activeTab, setActiveTab] = useState("general");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    const formData = new FormData(event.currentTarget);
    formData.set("digitalSignatureUrl", signatureUrl);
    formData.set("categoryGstRates", JSON.stringify(gstRates));
    
    const result = await updateInvoiceSettings(null, formData);
    
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
    setIsPending(false);
  }

  return (
    <form onSubmit={handleSubmit}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <div className="flex justify-between items-center">
             <TabsList>
              <TabsTrigger value="general">General & Branding</TabsTrigger>
              <TabsTrigger value="gst">Taxation (GST)</TabsTrigger>
              <TabsTrigger value="payments">Payment Gateways</TabsTrigger>
            </TabsList>
            <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
            </Button>
        </div>

        <div className={activeTab === "general" ? "block mt-2" : "hidden"}>
          <Card>
            <CardHeader>
              <CardTitle>General Configuration</CardTitle>
              <CardDescription>Manage invoice prefixes, currency, and legal text.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prefix">Invoice Prefix</Label>
                  <Input id="prefix" name="prefix" defaultValue={initialSettings?.prefix || "INV"} placeholder="INV" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currencySymbol">Currency Symbol</Label>
                  <Select name="currencySymbol" defaultValue={initialSettings?.currencySymbol || "₹"}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="₹">₹ (INR)</SelectItem>
                      <SelectItem value="$">$ (USD)</SelectItem>
                      <SelectItem value="€">€ (EUR)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Digital Signature</Label>
                <div className="flex flex-col gap-2">
                  <SignatureUpload 
                    defaultUrl={signatureUrl}
                    onUploadComplete={setSignatureUrl}
                  />
                  <input type="hidden" name="digitalSignatureUrl" value={signatureUrl || ""} />
                  <p className="text-xs text-muted-foreground">Upload a transparent PNG of authorized signatory.</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="terms">Terms & Conditions</Label>
                <Textarea 
                    id="terms" 
                    name="terms" 
                    defaultValue={initialSettings?.terms || ""} 
                    placeholder="1. Goods once sold will not be taken back..." 
                    rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="footerNotes">Footer Notes</Label>
                <Textarea 
                    id="footerNotes" 
                    name="footerNotes" 
                    defaultValue={initialSettings?.footerNotes || ""} 
                    placeholder="Thank you for your business!" 
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className={activeTab === "gst" ? "block mt-2" : "hidden"}>
          <Card>
            <CardHeader>
              <CardTitle>Taxation Settings</CardTitle>
              <CardDescription>Configure GST rules for invoice generation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch id="gstEnabled" name="gstEnabled" defaultChecked={initialSettings?.gstEnabled} />
                <Label htmlFor="gstEnabled">Enable GST Calculation</Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gstType">Default Tax Mode</Label>
                <Select name="gstType" defaultValue={initialSettings?.gstType || "CGST_SGST"}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CGST_SGST">Intrastate (CGST + SGST)</SelectItem>
                      <SelectItem value="IGST">Interstate (IGST)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">This is the default mode. Individual invoices can override this.</p>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-medium">Category-wise GST Rates</h3>
                <p className="text-sm text-muted-foreground">Set specific GST rates for each product category.</p>
                
                <div className="grid gap-4 md:grid-cols-2">
                    {categories?.map((category) => (
                        <div key={category.id} className="flex items-center justify-between border p-3 rounded-md">
                            <Label className="flex-1 cursor-pointer" htmlFor={`gst-${category.id}`}>{category.name}</Label>
                            <div className="flex items-center gap-2 w-32">
                                <Input 
                                    id={`gst-${category.id}`}
                                    type="number" 
                                    placeholder="0" 
                                    value={gstRates[category.name] || ""} 
                                    onChange={(e) => handleRateChange(category.name, e.target.value)}
                                    className="h-8 text-right"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                />
                                <span className="text-sm text-muted-foreground w-4">%</span>
                            </div>
                        </div>
                    ))}
                    {(!categories || categories.length === 0) && (
                        <div className="col-span-2 text-center text-muted-foreground py-4">
                            No categories found in Code Management.
                        </div>
                    )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className={activeTab === "payments" ? "block mt-2" : "hidden"}>
          <Card>
            <CardHeader>
              <CardTitle>Payment Gateways & Methods</CardTitle>
              <CardDescription>Configure UPI, Bank Transfer, and Payment Gateways.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
               
               {/* UPI Settings */}
               <div className="space-y-4 border p-4 rounded-md">
                   <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <Switch id="upiEnabled" name="upiEnabled" defaultChecked={initialPaymentSettings?.upiEnabled} />
                            <Label htmlFor="upiEnabled" className="font-bold">UPI Payments (QR Code)</Label>
                        </div>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="upiId">UPI ID (VPA)</Label>
                            <Input id="upiId" name="upiId" defaultValue={initialPaymentSettings?.upiId || ""} placeholder="merchant@upi" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="upiPayeeName">Payee Name</Label>
                            <Input id="upiPayeeName" name="upiPayeeName" defaultValue={initialPaymentSettings?.upiPayeeName || ""} placeholder="Merchant Name" />
                        </div>
                   </div>
               </div>

               {/* Bank Transfer Settings */}
               <div className="space-y-4 border p-4 rounded-md">
                   <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <Switch id="bankEnabled" name="bankEnabled" defaultChecked={initialPaymentSettings?.bankEnabled} />
                            <Label htmlFor="bankEnabled" className="font-bold">Bank Transfer Details</Label>
                        </div>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="bankName">Bank Name</Label>
                            <Input id="bankName" name="bankName" defaultValue={initialPaymentSettings?.bankName || ""} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="accountNumber">Account Number</Label>
                            <Input id="accountNumber" name="accountNumber" defaultValue={initialPaymentSettings?.accountNumber || ""} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="ifscCode">IFSC Code</Label>
                            <Input id="ifscCode" name="ifscCode" defaultValue={initialPaymentSettings?.ifscCode || ""} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="accountHolder">Account Holder Name</Label>
                            <Input id="accountHolder" name="accountHolder" defaultValue={initialPaymentSettings?.accountHolder || ""} />
                        </div>
                   </div>
               </div>

               {/* Razorpay Settings */}
               <div className="space-y-4 border p-4 rounded-md">
                   <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <Switch id="razorpayEnabled" name="razorpayEnabled" defaultChecked={initialPaymentSettings?.razorpayEnabled || false} />
                            <Label htmlFor="razorpayEnabled" className="font-bold">Razorpay Integration</Label>
                        </div>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="razorpayKeyId">Key ID</Label>
                            <Input id="razorpayKeyId" name="razorpayKeyId" defaultValue={initialPaymentSettings?.razorpayKeyId || ""} type="password" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="razorpayKeySecret">Key Secret</Label>
                            <Input id="razorpayKeySecret" name="razorpayKeySecret" defaultValue={initialPaymentSettings?.razorpayKeySecret || ""} type="password" />
                        </div>
                   </div>
                   <div className="space-y-2">
                        <Label htmlFor="razorpayButtonId">Payment Button ID (Optional)</Label>
                        <Input 
                            id="razorpayButtonId" 
                            name="razorpayButtonId" 
                            defaultValue={initialPaymentSettings?.razorpayButtonId || ""} 
                            placeholder="pl_..." 
                        />
                        <p className="text-xs text-muted-foreground">
                            If provided, this specific button configuration from Razorpay Dashboard will be used.
                        </p>
                   </div>
               </div>
            </CardContent>
          </Card>
        </div>
      </Tabs>
    </form>
  );
}
