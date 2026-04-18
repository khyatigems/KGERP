"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Plus, X, User, Search, Tag, Percent, Gift, Calculator, Package, Calendar, AlertTriangle, CheckCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { createNewCustomer, validateCouponCode, getCustomerLoyaltyPoints } from "@/app/(dashboard)/sales/new-actions";
import { createSale, getNextInvoiceNumber } from "@/app/(dashboard)/sales/actions";
import { CORE_PLATFORMS } from "@/lib/platforms";

// Types
interface InventoryItem {
  id: string;
  sku: string;
  itemName: string;
  sellingPrice: number;
  category: string;
  gemType?: string | null;
  status: string;
}

interface Customer {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  stateCode?: string | null;
  country?: string | null;
  countryCode?: string | null;
  pincode?: string | null;
  gstin?: string | null;
}

interface CartItem extends InventoryItem {
  quantity: number;
  discount: number;
  taxAmount: number;
  netAmount: number;
  gstRate: number;
  usdPrice?: number;
}

interface CompanySettings {
  gstEnabled: boolean;
  gstType: string;
  categoryGstRates: string;
  invoicePrefix: string;
  companyName: string;
  companyAddress: string;
  companyCity: string;
  companyState: string;
  companyPincode: string;
  companyCountry: string;
  companyPhone: string;
  companyEmail: string;
  companyGstin: string;
}

interface PlatformOption {
  code: string;
  label: string;
  logoUrl?: string | null;
  active?: boolean;
}

// Form Schema
const saleFormSchema = z.object({
  customerType: z.enum(["existing", "new"]),
  customerId: z.string().optional(),
  customerName: z.string().min(2, "Customer name is required"),
  customerPhone: z.string().optional(),
  customerEmail: z.string().email().optional().or(z.literal("")),
  customerAddress: z.string().optional().or(z.literal("")),
  customerCity: z.string().optional().or(z.literal("")),
  customerState: z.string().optional().or(z.literal("")),
  customerPincode: z.string().optional().or(z.literal("")),
  customerGstin: z.string().optional().or(z.literal("")),
  discountType: z.enum(["none", "flat", "coupon"]),
  flatDiscount: z.number().min(0).optional().default(0),
  couponCode: z.string().optional().or(z.literal("")),
  loyaltyRedeemAmount: z.number().min(0).optional().default(0),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "UPI", "CHEQUE", "CARD", "PAYPAL", "PAYONEER"]).default("CASH"),
  paymentStatus: z.enum(["PAID", "PARTIAL", "PENDING"]),
  platform: z.enum(["MANUAL", "AMAZON", "ETSY", "EBAY", "FACEBOOK", "WHATSAPP"]).default("MANUAL"),
  invoiceType: z.enum(["TAX_INVOICE", "EXPORT_INVOICE"]).default("TAX_INVOICE"),
  // Export invoice fields
  invoiceCurrency: z.enum(["INR", "USD", "EUR", "GBP"]).optional(),
  conversionRate: z.number().min(0).optional(),
  iecCode: z.string().optional().or(z.literal("")),
  exportType: z.enum(["LUT", "BOND", "PAYMENT"]).optional(),
  countryOfDestination: z.string().optional().or(z.literal("")),
  portOfDispatch: z.string().optional().or(z.literal("")),
  modeOfTransport: z.enum(["AIR", "COURIER", "HAND_DELIVERY"]).optional(),
  courierPartner: z.string().optional().or(z.literal("")),
  trackingId: z.string().optional().or(z.literal("")),
  platformOrderId: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  shippingCharge: z.number().min(0).default(0),
  additionalCharge: z.number().min(0).default(0),
  invoiceDate: z.string(),
});

type SaleFormData = z.infer<typeof saleFormSchema>;

interface NewSalesPageProps {
  inventoryItems: InventoryItem[];
  existingCustomers: Customer[];
  companySettings: CompanySettings;
  platformOptions?: PlatformOption[];
}

export function NewSalesPage({ inventoryItems, existingCustomers, companySettings, platformOptions = [] }: NewSalesPageProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerLoyaltyPoints, setCustomerLoyaltyPoints] = useState<number>(0);
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [couponDiscountValue, setCouponDiscount] = useState<number>(0);
  const [showCustomerWarning, setShowCustomerWarning] = useState(false);
  const [maxLoyaltyRedeem, setMaxLoyaltyRedeem] = useState<number>(0);
  const [itemSearchQuery, setItemSearchQuery] = useState("");
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const itemSearchRef = useRef<HTMLDivElement>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationStep, setConfirmationStep] = useState(1);
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState<string>("");
  const [invoiceNumberStatus, setInvoiceNumberStatus] = useState<"loading" | "ready" | "error">("loading");
  const [categoryGstRates, setCategoryGstRates] = useState<Record<string, number>>({});
  const [initialPayments, setInitialPayments] = useState<Array<{ amount: number; method: string; date: string; reference?: string; notes?: string; advanceId?: string; creditNoteId?: string; creditNoteCode?: string }>>([]);
  const [availableAdvances, setAvailableAdvances] = useState<Array<{ id: string; amount: number; remainingAmount: number; paymentMode: string; createdAt: string }>>([]);
  const [availableCreditNotes, setAvailableCreditNotes] = useState<Array<{ id: string; code: string; amount: number; remainingAmount: number; createdAt: string }>>([]);
  const [exportSettings, setExportSettings] = useState<{
    enableExportInvoice: boolean;
    defaultExportType: string;
    companyIec: string;
    defaultCurrency: string;
    defaultPort: string;
  } | null>(null);

  const availablePlatforms = useMemo(() => {
    const fallbackMap = new Map(
      CORE_PLATFORMS.map((platform) => [platform.code, { code: platform.code, label: platform.label, logoUrl: null as string | null, active: true }])
    );

    platformOptions.forEach((platform) => {
      const normalizedCode = platform.code?.toUpperCase();
      if (!normalizedCode) return;
      if (!fallbackMap.has(normalizedCode)) return;

      const base = fallbackMap.get(normalizedCode)!;
      fallbackMap.set(normalizedCode, {
        code: normalizedCode,
        label: platform.label || base.label,
        logoUrl: platform.logoUrl ?? base.logoUrl,
        active: platform.active !== undefined ? platform.active : base.active,
      });
    });

    let list = Array.from(fallbackMap.values()).filter((platform) => platform.active !== false);
    if (!list.find((platform) => platform.code === "MANUAL")) {
      list = [{ code: "MANUAL", label: "Walk-in / Offline", logoUrl: null, active: true }, ...list];
    }

    return list;
  }, [platformOptions]);

  const fetchInventory = useCallback(async (q: string) => {
    const params = new URLSearchParams();
    params.set("status", "IN_STOCK");
    params.set("page", "1");
    params.set("pageSize", "25");
    if (q.trim()) params.set("q", q.trim());

    const r = await fetch(`/api/inventory/search?${params.toString()}`, {
      credentials: "include",
      cache: "no-store",
    });
    if (!r.ok) throw new Error(`Inventory search failed: ${r.status}`);
    const json = (await r.json()) as { items?: InventoryItem[] };
    return Array.isArray(json.items) ? json.items : [];
  }, []);

  // Initial inventory list (small) + server-backed search
  useEffect(() => {
    let active = true;
    const hasInitial = Array.isArray(inventoryItems) && inventoryItems.length > 0;

    // Seed with initial items quickly
    if (hasInitial) {
      setFilteredItems(inventoryItems);
    } else {
      fetchInventory("")
        .then((items) => {
          if (!active) return;
          setFilteredItems(items);
        })
        .catch(() => {
          if (!active) return;
          setFilteredItems([]);
        });
    }

    return () => {
      active = false;
    };
  }, [fetchInventory, inventoryItems]);

  useEffect(() => {
    let active = true;
    const handle = setTimeout(() => {
      fetchInventory(itemSearchQuery)
        .then((items) => {
          if (!active) return;
          setFilteredItems(items);
        })
        .catch(() => {
          if (!active) return;
          setFilteredItems([]);
        });
    }, 250);

    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [fetchInventory, itemSearchQuery]);

  const form = useForm<SaleFormData>({
    resolver: zodResolver(saleFormSchema) as any,
    defaultValues: {
      customerType: "existing",
      customerId: "",
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      customerAddress: "",
      customerCity: "",
      customerState: "",
      customerPincode: "",
      customerGstin: "",
      discountType: "none",
      flatDiscount: 0,
      couponCode: "",
      loyaltyRedeemAmount: 0,
      paymentMethod: "CASH",
      paymentStatus: "PAID",
      platform: "MANUAL",
      invoiceType: "TAX_INVOICE",
      invoiceCurrency: "INR",
      conversionRate: 1,
      iecCode: "",
      exportType: "LUT",
      countryOfDestination: "",
      portOfDispatch: "",
      modeOfTransport: "AIR",
      courierPartner: "",
      trackingId: "",
      platformOrderId: "",
      notes: "",
      shippingCharge: 0,
      additionalCharge: 0,
      invoiceDate: new Date().toISOString().split('T')[0],
    },
  });

  // Fetch export settings on mount (requires form instance)
  useEffect(() => {
    fetch("/api/settings/export")
      .then((res) => res.json())
      .then((data) => {
        setExportSettings(data);
        // Pre-fill form with export defaults
        if (data) {
          form.setValue("iecCode", data.companyIec || "");
          form.setValue("exportType", data.defaultExportType || "LUT");
          form.setValue("invoiceCurrency", data.defaultCurrency || "USD");
          form.setValue("portOfDispatch", data.defaultPort || "");
        }
      })
      .catch(() => {
        console.error("Failed to load export settings");
      });
  }, [form]);

  const watchedValues = form.watch();
  const customerType = watchedValues.customerType;
  const shippingChargeValue = Number(watchedValues.shippingCharge || 0);
  const additionalChargeValue = Number(watchedValues.additionalCharge || 0);

  
  // Parse GST rates from company settings
  useEffect(() => {
    if (companySettings.categoryGstRates) {
      try {
        const rates = JSON.parse(companySettings.categoryGstRates);
        setCategoryGstRates(rates);
      } catch (error) {
        console.error("Error parsing GST rates:", error);
      }
    }
  }, [companySettings]);

  const loadNextInvoiceNumber = useCallback(async () => {
    setInvoiceNumberStatus("loading");
    try {
      const result = await getNextInvoiceNumber();
      if (result?.invoiceNumber) {
        setNextInvoiceNumber(result.invoiceNumber);
        setInvoiceNumberStatus("ready");
      } else {
        setInvoiceNumberStatus("error");
      }
    } catch (error) {
      console.error("Error fetching next invoice number:", error);
      setInvoiceNumberStatus("error");
    }
  }, []);

  // Generate next invoice number by querying backend
  useEffect(() => {
    loadNextInvoiceNumber();
  }, [loadNextInvoiceNumber]);

  const removeCoupon = () => {
    setCouponDiscount(0);
    form.setValue("couponCode", "");
    form.setValue("discountType", "none");
    toast.success("Coupon removed");
  };

  const requiredCustomerFields = useMemo(() => {
    if (!selectedCustomer) return [] as string[];
    const missing: string[] = [];
    if (!(selectedCustomer.address || "").trim()) missing.push("Address");
    if (!(selectedCustomer.city || "").trim()) missing.push("City");
    const stateOrCode = (selectedCustomer.state || selectedCustomer.stateCode || "").trim();
    if (!stateOrCode) missing.push("State");
    if (!(selectedCustomer.pincode || "").trim()) missing.push("Pincode");
    const countryOrCode = (selectedCustomer.country || selectedCustomer.countryCode || "").trim();
    if (!countryOrCode) missing.push("Country");
    return missing;
  }, [selectedCustomer]);

  const addInitialPayment = () => {
    setInitialPayments(prev => [...prev, { amount: 0, method: "CASH", date: watchedValues.invoiceDate || new Date().toISOString().split('T')[0], notes: "" }]);
  };

  const updateInitialPayment = (index: number, field: string, value: any) => {
    setInitialPayments(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const removeInitialPayment = (index: number) => {
    setInitialPayments(prev => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    if (watchedValues.invoiceType === "EXPORT_INVOICE" && requiredCustomerFields.length > 0) {
      setShowCustomerWarning(true);
    } else {
      setShowCustomerWarning(false);
    }
  }, [watchedValues.invoiceType, requiredCustomerFields]);

  // Methods where the user enters amount in foreign currency (USD) directly
  const USD_METHODS = ["PAYPAL", "PAYONEER"];

  const totalPaidAmount = initialPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  // Calculate totals using EXACT backend logic
  const isExportInvoice = watchedValues.invoiceType === "EXPORT_INVOICE";
  const exportConvRate = (watchedValues.conversionRate && watchedValues.conversionRate > 0) ? watchedValues.conversionRate : 1;

  // For export invoices: USD methods are already in USD, INR methods must be divided by rate
  const totalPaidUsdAmount = isExportInvoice
    ? initialPayments.reduce((sum, p) => {
        if (!p.amount) return sum;
        return sum + (USD_METHODS.includes(p.method) ? p.amount : p.amount / exportConvRate);
      }, 0)
    : 0;
  // For export: use usdPrice * conversionRate as INR equivalent for totals
  const totalNetAmount = isExportInvoice
    ? cart.reduce((sum, item) => sum + (item.usdPrice ? item.usdPrice * exportConvRate : item.netAmount), 0) + shippingChargeValue + additionalChargeValue
    : cart.reduce((sum, item) => sum + item.netAmount, 0) + shippingChargeValue + additionalChargeValue;
  const totalUsdAmount = cart.reduce((sum, item) => sum + (item.usdPrice || 0), 0);
  const totalItemDiscount = cart.reduce((sum, item) => sum + (item.discount || 0), 0);
  
  // Calculate discount amount from coupon or flat discount (backend logic)
  let flatDiscountAmount = 0;
  if (watchedValues.discountType === "flat" && watchedValues.flatDiscount) {
    flatDiscountAmount = watchedValues.flatDiscount;
  } else if (watchedValues.discountType === "coupon" && couponDiscountValue > 0) {
    flatDiscountAmount = couponDiscountValue;
  }
  
  // Backend exact calculation - totalNetAmount already has item discounts applied
  const adjustedInvoiceTotal = Math.max(0, (totalNetAmount - flatDiscountAmount));
  const loyaltyRedeemAmount = Math.min(watchedValues.loyaltyRedeemAmount || 0, maxLoyaltyRedeem, adjustedInvoiceTotal);
  const finalTotal = Math.max(0, adjustedInvoiceTotal - loyaltyRedeemAmount);
  
  // Payment status logic — for export invoices compare USD vs USD, for domestic compare INR vs INR
  const effectivePaid = isExportInvoice ? totalPaidUsdAmount : totalPaidAmount;
  const effectiveTotal = isExportInvoice ? totalUsdAmount : finalTotal;
  const paidAmount = totalPaidAmount; // kept for non-export INR usage
  const invoicePaymentStatus =
    effectivePaid >= effectiveTotal - 0.001
      ? "PAID"
      : effectivePaid > 0
      ? "PARTIAL"
      : watchedValues.paymentStatus === "PARTIAL"
      ? "PARTIAL"
      : "PENDING";

  // Calculate amount to collect (backend logic)
  const amountToCollect = isExportInvoice
    ? Math.max(0, totalUsdAmount - totalPaidUsdAmount)
    : Math.max(0, finalTotal - paidAmount);

  // Auto-calculate payment status using effective USD/INR comparison
  useEffect(() => {
    if (effectiveTotal > 0) {
      const newStatus =
        effectivePaid >= effectiveTotal - 0.001
          ? "PAID"
          : effectivePaid > 0
          ? "PARTIAL"
          : watchedValues.paymentStatus === "PARTIAL"
          ? "PARTIAL"
          : "PENDING";

      if (watchedValues.paymentStatus !== newStatus) {
        form.setValue("paymentStatus", newStatus);
      }
    }
  }, [effectiveTotal, effectivePaid, watchedValues.paymentStatus]);

  // Customer search
  useEffect(() => {
    if (customerSearchQuery) {
      setIsSearchingCustomer(true);
      const filtered = existingCustomers.filter(customer =>
        customer.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
        customer.phone?.includes(customerSearchQuery) ||
        customer.email?.toLowerCase().includes(customerSearchQuery.toLowerCase())
      );
      setFilteredCustomers(filtered);
      setIsSearchingCustomer(false);
    } else {
      setFilteredCustomers([]);
    }
  }, [customerSearchQuery, existingCustomers]);

  // Item search
  useEffect(() => {
    if (itemSearchQuery) {
      const filtered = inventoryItems.filter(item =>
        item.status === 'IN_STOCK' && (
          item.sku.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
          item.itemName.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
          item.category.toLowerCase().includes(itemSearchQuery.toLowerCase())
        )
      );
      setFilteredItems(filtered.slice(0, 10));
    } else {
      setFilteredItems([]);
    }
  }, [itemSearchQuery, inventoryItems]);

  // Fetch available advances and credit notes when customer is selected
  useEffect(() => {
    if (selectedCustomer?.id) {
      fetch(`/api/customers/${selectedCustomer.id}/advances-available`)
        .then(res => res.json())
        .then(data => {
          if (data.advances) {
            setAvailableAdvances(data.advances);
          }
        })
        .catch(() => setAvailableAdvances([]));
      
      fetch(`/api/customers/${selectedCustomer.id}/credit-notes-available`)
        .then(res => res.json())
        .then(data => {
          if (data.creditNotes) {
            setAvailableCreditNotes(data.creditNotes);
          }
        })
        .catch(() => setAvailableCreditNotes([]));
    } else {
      setAvailableAdvances([]);
      setAvailableCreditNotes([]);
    }
  }, [selectedCustomer]);

  // Get customer loyalty points and calculate max redeemable using your loyalty settings (100% allowed)
  useEffect(() => {
    if (selectedCustomer && adjustedInvoiceTotal > 0) {
      const fetchLoyaltyPoints = async () => {
        try {
          const result = await getCustomerLoyaltyPoints(selectedCustomer.id);
          // Debug: Only log occasionally
          if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
            console.log('Loyalty points result:', result);
          }
          
          if (result && result.success) {
            const points = result.points || 0;
            setCustomerLoyaltyPoints(points);
            // Debug: Only log occasionally
            if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
              console.log('Customer points:', points);
              console.log('adjustedInvoiceTotal:', adjustedInvoiceTotal);
            }
            
            // Calculate max redeemable using your loyalty settings
            // You have maxRedeemPercent set to 100%
            const maxRedeemPercent = 100; // From your LoyaltySettings.maxRedeemPercent
            const maxByPercent = (adjustedInvoiceTotal * maxRedeemPercent) / 100;
            
            // Convert to points using your redeemRupeePerPoint setting
            const redeemRupeePerPoint = 1; // From your LoyaltySettings.redeemRupeePerPoint
            const maxByPoints = points * redeemRupeePerPoint;
            
            // Use the same logic as your existing system
            const maxAllowed = Math.max(0, Math.min(adjustedInvoiceTotal, maxByPercent, maxByPoints));
            
            // Debug: Only log occasionally
            if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
              console.log('maxByPercent:', maxByPercent);
              console.log('maxByPoints:', maxByPoints);
              console.log('maxAllowed:', maxAllowed);
            }
            
            setMaxLoyaltyRedeem(maxAllowed);
          } else {
            // Debug: Only log occasionally
            if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
              console.log('Loyalty points fetch failed:', result);
            }
          }
        } catch (error) {
          // Debug: Only log occasionally
          if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
            console.error('Error fetching loyalty points:', error);
          }
        }
      };
      fetchLoyaltyPoints();
    } else {
      // Reset max redeemable when no customer or no items in cart
      setMaxLoyaltyRedeem(0);
    }
  }, [selectedCustomer, adjustedInvoiceTotal]);

  // Debug: Monitor cart items for tax calculation (only when needed)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && cart.length > 0 && Math.random() < 0.1) { // Only log 10% of the time
      console.log('Cart Items Debug:', cart.map(item => ({
        name: item.itemName,
        sellingPrice: item.sellingPrice,
        taxAmount: item.taxAmount,
        gstRate: item.gstRate,
        netAmount: item.netAmount,
      })));
    }
  }, [cart]); // Remove isDevelopment from dependencies

  // Clear selected customer when switching to new customer type
  useEffect(() => {
    if (customerType === "new" && selectedCustomer) {
      setSelectedCustomer(null);
      setCustomerSearchQuery("");
      setFilteredCustomers([]);
      setCustomerLoyaltyPoints(0);
    }
  }, [customerType, selectedCustomer]);

  // Get GST rate for category
  const getGstRate = (category: string): number => {
    if (!companySettings.gstEnabled) return 0;
    return categoryGstRates[category] || 18; // Default 18% if not specified
  };

  // Add to cart with your existing GST logic (from actions.ts)
  const addToCart = (item: InventoryItem) => {
    const existingItem = cart.find(cartItem => cartItem.id === item.id);
    const gstRate = getGstRate(item.category);
    
    // Use your exact existing GST calculation from actions.ts
    const inclusivePrice = item.sellingPrice;
    const basePrice = inclusivePrice / (1 + (gstRate / 100));
    const gstAmount = inclusivePrice - basePrice;
    
    // Debug: Only log occasionally
    if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
      console.log('GST Calculation (Your Logic):', {
        inclusivePrice,
        gstRate,
        basePrice,
        gstAmount,
        verification: basePrice + gstAmount,
      });
    }
    
    if (existingItem) {
      setCart(cart.map(cartItem => {
        if (cartItem.id === item.id) {
          const newQuantity = cartItem.quantity + 1;
          const totalBasePrice = basePrice * newQuantity;
          const discountedBasePrice = Math.max(0, totalBasePrice - cartItem.discount);
          const discountedInclusivePrice = discountedBasePrice * (1 + (gstRate / 100));
          const finalGstAmount = discountedInclusivePrice - discountedBasePrice;
          const totalPrice = discountedBasePrice + finalGstAmount;
          
          return {
            ...cartItem,
            quantity: newQuantity,
            taxAmount: finalGstAmount,
            netAmount: totalPrice,
            gstRate,
          };
        }
        return cartItem;
      }));
    } else {
      // Apply same discount logic as updateCartItem for consistency
      const totalBasePrice = basePrice * 1;
      const discountedBasePrice = Math.max(0, totalBasePrice - 0); // No discount initially
      const discountedInclusivePrice = discountedBasePrice * (1 + (gstRate / 100));
      const finalGstAmount = discountedInclusivePrice - discountedBasePrice;
      const totalPrice = discountedBasePrice + finalGstAmount;
      
      setCart([...cart, {
        ...item,
        quantity: 1,
        discount: 0,
        taxAmount: finalGstAmount,
        netAmount: totalPrice,
        gstRate,
      }]);
    }
    setItemSearchQuery("");
    setShowItemDropdown(false);
    setFilteredItems([]);
  };

  // Click outside handler to close item search dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (itemSearchRef.current && !itemSearchRef.current.contains(event.target as Node)) {
        setShowItemDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update cart item with your existing GST logic
  const updateCartItem = (id: string, field: keyof CartItem, value: number) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        if (field === "quantity" || field === "discount") {
          // Use your exact existing GST calculation from actions.ts
          const inclusivePrice = item.sellingPrice;
          const basePrice = inclusivePrice / (1 + (item.gstRate / 100));
          const gstAmount = inclusivePrice - basePrice;
          
          const totalBasePrice = basePrice * updatedItem.quantity;
          updatedItem.discount = field === "discount" ? value : updatedItem.discount;
          
          // Apply discount to base price first, then calculate tax
          const discountedBasePrice = Math.max(0, totalBasePrice - updatedItem.discount);
          const discountedInclusivePrice = discountedBasePrice * (1 + (item.gstRate / 100));
          const finalGstAmount = discountedInclusivePrice - discountedBasePrice;
          const totalPrice = discountedBasePrice + finalGstAmount;
          
          updatedItem.taxAmount = finalGstAmount;
          updatedItem.netAmount = totalPrice;
        }
        return updatedItem;
      }
      return item;
    }));
  };

  // Remove from cart
  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  // Select customer
  const selectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    form.setValue("customerId", customer.id);
    form.setValue("customerName", customer.name);
    form.setValue("customerPhone", customer.phone || "");
    form.setValue("customerEmail", customer.email || "");
    form.setValue("customerAddress", customer.address || "");
    form.setValue("customerCity", customer.city || "");
    form.setValue("customerState", customer.state || "");
    form.setValue("customerPincode", customer.pincode || "");
    form.setValue("customerGstin", customer.gstin || "");
    setCustomerSearchQuery("");
    setFilteredCustomers([]);
  };

  // Create new customer
  const createNewCustomerHandler = async () => {
    setIsCreatingCustomer(true);
    try {
      const customerData = {
        name: watchedValues.customerName,
        phone: watchedValues.customerPhone,
        email: watchedValues.customerEmail,
        address: watchedValues.customerAddress,
        city: watchedValues.customerCity,
        state: watchedValues.customerState,
        pincode: watchedValues.customerPincode,
      };

      const result = await createNewCustomer(customerData);
      if (result.success && result.customer) {
        setSelectedCustomer(result.customer);
        form.setValue("customerId", result.customer.id);
        toast.success("Customer created successfully!");
      } else {
        toast.error(result.message || "Failed to create customer");
      }
    } catch (error) {
      toast.error("Failed to create customer");
    }
    setIsCreatingCustomer(false);
  };

  // Apply coupon
  const applyCoupon = async () => {
    if (!watchedValues.couponCode) {
      toast.error("Please enter a coupon code");
      return;
    }
    
    try {
      const result = await validateCouponCode(
        watchedValues.couponCode,
        adjustedInvoiceTotal,
        selectedCustomer?.id
      );
      
      if (result && result.success && result.discount !== undefined) {
        setCouponDiscount(result.discount);
        toast.success("Coupon applied successfully!");
      } else {
        toast.error(result?.message || "Failed to apply coupon");
      }
    } catch (error) {
      toast.error("Failed to validate coupon");
    }
  };

  // Confirmation dialog handlers
  const handleConfirmSale = () => {
    if (cart.length === 0) {
      toast.error("Please add items to cart");
      return;
    }

    const paymentStatus = watchedValues.paymentStatus;

    if (paymentStatus === "PARTIAL") {
      const pendingAmount = amountToCollect;
      setShowConfirmation(true);
      setConfirmationStep(1);
    } else if (paymentStatus === "PENDING") {
      setShowConfirmation(true);
      setConfirmationStep(2);
    } else {
      setShowConfirmation(true);
      setConfirmationStep(3);
    }
  };

  const proceedToNextStep = () => {
    if (confirmationStep < 3) {
      setConfirmationStep(confirmationStep + 1);
    } else {
      submitSale();
    }
  };

  // Submit sale using main createSale from actions.ts
  const submitSale = async () => {
    if (watchedValues.customerType === "new" && !selectedCustomer) {
      await createNewCustomerHandler();
    }

    setIsSubmitting(true);
    try {
      // Create FormData to match actions.ts expectations
      const paymentMethod = watchedValues.paymentMethod;
      const invoiceDate = watchedValues.invoiceDate || new Date().toISOString().split('T')[0];
      
      // Only use multi-payments array
      const combinedPayments: Array<{ amount: number; method: string; date: string; reference?: string; notes?: string }> = [];
      
      // Add payments from the multi-payment UI
      // For export invoices: Payoneer/PayPal amounts are entered in USD — convert to INR for backend storage
      const isExport = watchedValues.invoiceType === "EXPORT_INVOICE";
      const convRate = (watchedValues.conversionRate && watchedValues.conversionRate > 0) ? watchedValues.conversionRate : 1;
      initialPayments.forEach(p => {
        if (p.amount > 0) {
          const storedAmount = isExport && USD_METHODS.includes(p.method)
            ? p.amount * convRate  // convert USD → INR for backend
            : p.amount;
          combinedPayments.push({
            amount: storedAmount,
            method: p.method,
            date: p.date,
            reference: p.reference,
            notes: p.notes,
          });
        }
      });

      const formData = new FormData();

      // Required platform field
      formData.append("platform", watchedValues.platform || "MANUAL");
      
      // Customer data
      if (selectedCustomer?.id) formData.append("customerId", selectedCustomer.id);
      formData.append("customerName", watchedValues.customerName || "");
      if (watchedValues.customerPhone) formData.append("customerPhone", watchedValues.customerPhone);
      if (watchedValues.customerEmail) formData.append("customerEmail", watchedValues.customerEmail);
      if (watchedValues.customerAddress) formData.append("customerAddress", watchedValues.customerAddress);
      if (watchedValues.customerCity) formData.append("customerCity", watchedValues.customerCity);
      
      // Items data - actions.ts expects JSON string with inventoryId, sellingPrice (per unit), discount
      const itemsData = cart.map(item => {
        const quantity = Math.max(1, Number(item.quantity) || 1);
        const perUnitGross = Number((item.sellingPrice || 0).toFixed(2));
        const perUnitFinal = Number((item.netAmount / quantity).toFixed(2));
        const perUnitDiscount = Math.max(0, Number((perUnitGross - perUnitFinal).toFixed(2)));
        return {
          inventoryId: item.id,
          sellingPrice: perUnitGross,
          discount: perUnitDiscount,
          ...(watchedValues.invoiceType === "EXPORT_INVOICE" && item.usdPrice ? { usdPrice: item.usdPrice } : {}),
        };
      });
      formData.append("items", JSON.stringify(itemsData));
      formData.append("shippingCharge", shippingChargeValue.toString());
      formData.append("additionalCharge", additionalChargeValue.toString());
      
      // Discount type and flat discount
      formData.append("discountType", watchedValues.discountType || "none");
      if (watchedValues.flatDiscount && watchedValues.flatDiscount > 0) {
        formData.append("flatDiscount", watchedValues.flatDiscount.toString());
      }
      
      // Coupon code if provided
      if (watchedValues.couponCode) {
        formData.append("couponCode", watchedValues.couponCode);
      }
      
      // Loyalty redemption
      if (loyaltyRedeemAmount > 0) {
        formData.append("loyaltyRedeemAmount", loyaltyRedeemAmount.toString());
      }
      
      // Payment data - send combinedPayments and disable auto-fill
      formData.append("paymentStatus", watchedValues.paymentStatus);
      formData.append("paymentMode", paymentMethod);
      formData.append("initialPayments", JSON.stringify(combinedPayments));
      formData.append("autoFillSplitFromSingle", "false");

      // Sale date
      formData.append("saleDate", invoiceDate);
      
      // Notes (mapped to 'remarks' as expected by actions.ts saleSchema)
      if (watchedValues.notes) {
        formData.append("remarks", watchedValues.notes);
      }

      // Always send invoiceType
      formData.append("invoiceType", watchedValues.invoiceType || "TAX_INVOICE");

      // Export invoice fields
      if (watchedValues.invoiceType === "EXPORT_INVOICE") {
        formData.append("invoiceCurrency", watchedValues.invoiceCurrency || "USD");
        if (watchedValues.conversionRate && watchedValues.conversionRate > 0) {
          formData.append("conversionRate", watchedValues.conversionRate.toString());
        }
        if (watchedValues.iecCode) formData.append("iecCode", watchedValues.iecCode);
        if (watchedValues.exportType) formData.append("exportType", watchedValues.exportType);
        if (watchedValues.countryOfDestination) formData.append("countryOfDestination", watchedValues.countryOfDestination);
        if (watchedValues.portOfDispatch) formData.append("portOfDispatch", watchedValues.portOfDispatch);
        if (watchedValues.modeOfTransport) formData.append("modeOfTransport", watchedValues.modeOfTransport);
        if (watchedValues.courierPartner) formData.append("courierPartner", watchedValues.courierPartner);
        if (watchedValues.trackingId) formData.append("trackingId", watchedValues.trackingId);
        if (watchedValues.platformOrderId) formData.append("platformOrderId", watchedValues.platformOrderId);
      }

      const result = await createSale(null, formData);
      
      console.log('Backend response:', result);
      
      if (result && result.success) {
        const invoiceNumber = (result as unknown as { invoiceNumber?: string }).invoiceNumber;
        toast.success(
          <div className="flex flex-col gap-1">
            <span className="font-semibold">Invoice Created Successfully!</span>
            {invoiceNumber && (
              <span className="text-sm text-muted-foreground">
                Invoice #{invoiceNumber}
              </span>
            )}
          </div>,
          { duration: 5000 }
        );
        setShowConfirmation(false);
        setConfirmationStep(1);
        
        // Reset form after successful creation
        setCart([]);
        setSelectedCustomer(null);
        form.reset();
        
        // Redirect to sales page after successful creation
        window.location.href = "/sales";
      } else {
        toast.error(result?.message || "Failed to create sale", { duration: 5000 });
      }
    } catch (error) {
      console.error("Sale creation error:", error);
      toast.error("Failed to create sale. Please try again.", { duration: 5000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header with Invoice Preview */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Record New Sale</h1>
          <p className="text-muted-foreground">Create a new sales invoice with professional ERP workflow</p>
        </div>
        <div className="text-right space-y-2">
          <div className="text-sm text-muted-foreground">Next Invoice Number</div>
          <div className="text-2xl font-bold text-green-600">
            {invoiceNumberStatus === "ready"
              ? nextInvoiceNumber
              : invoiceNumberStatus === "loading"
              ? "Calculating..."
              : "Unavailable"}
          </div>
          {invoiceNumberStatus === "error" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadNextInvoiceNumber}
            >
              Retry
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Customer & Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                }}
                className="space-y-6"
              >
              {/* Customer Type Selection */}
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    {...form.register("customerType")}
                    value="existing"
                    className="w-4 h-4"
                  />
                  <span>Existing Customer</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    {...form.register("customerType")}
                    value="new"
                    className="w-4 h-4"
                  />
                  <span>New Customer</span>
                </label>
              </div>

              {watchedValues.customerType === "existing" ? (
                <div className="space-y-6">
                  {showCustomerWarning && (
                    <Alert variant="destructive" className="border-red-500 bg-red-50 text-red-800">
                      <AlertTitle>Customer details incomplete for export invoice</AlertTitle>
                      <AlertDescription>
                        {selectedCustomer ? (
                          <div className="space-y-3">
                            <p>
                              {selectedCustomer.name ? `${selectedCustomer.name}` : "Selected customer"} is missing the following fields: {requiredCustomerFields.join(", ")}. Export invoices require complete customer address information.
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="border-red-400 text-red-700 hover:bg-red-100"
                                onClick={() => {
                                  if (!selectedCustomer?.id) {
                                    toast.error("Customer record not found");
                                    return;
                                  }
                                  window.open(`/dashboard/customers/${selectedCustomer.id}?returnTo=/sales/new`, "_blank");
                                }}
                              >
                                Edit Customer
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-red-700"
                                onClick={() => setShowCustomerWarning(false)}
                              >
                                Dismiss
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p>Select a customer and ensure their address details are complete.</p>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                    <Input
                      placeholder="Search customers by name, phone, or email..."
                      value={customerSearchQuery}
                      onChange={(e) => setCustomerSearchQuery(e.target.value)}
                      className="pl-10"
                      style={{ color: '#000000', backgroundColor: '#ffffff' }}
                    />
                    {filteredCustomers.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-gray-50 border rounded-md shadow-lg max-h-60 overflow-auto">
                        {filteredCustomers.map((customer) => (
                          <div
                            key={customer.id}
                            className="p-3 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                            onClick={() => selectCustomer(customer)}
                          >
                            <div className="font-medium text-gray-900">{customer.name}</div>
                            <div className="text-sm text-gray-600">
                              {customer.phone} • {customer.email}
                            </div>
                            {customer.gstin && (
                              <div className="text-sm text-gray-600">GSTIN: {customer.gstin}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedCustomer && (
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-blue-900">{selectedCustomer.name}</div>
                          <div className="text-sm text-blue-700">
                            {selectedCustomer.phone} • {selectedCustomer.email}
                          </div>
                          {selectedCustomer.gstin && (
                            <div className="text-sm text-blue-700">GSTIN: {selectedCustomer.gstin}</div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-blue-600 font-medium">Loyalty Points</div>
                          <div className="text-2xl font-bold text-blue-900">{customerLoyaltyPoints}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customerName">Customer Name *</Label>
                    <Input
                      id="customerName"
                      value={watchedValues.customerName || ""}
                      onChange={(e) => form.setValue("customerName", e.target.value, { shouldValidate: true })}
                      placeholder="Enter customer name"
                      style={{ color: '#000000', backgroundColor: '#ffffff' }}
                    />
                    {form.formState.errors.customerName && (
                      <p className="text-sm text-red-500 mt-1">{form.formState.errors.customerName.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="customerPhone">Phone Number</Label>
                    <Input
                      id="customerPhone"
                      value={watchedValues.customerPhone || ""}
                      onChange={(e) => form.setValue("customerPhone", e.target.value, { shouldValidate: true })}
                      placeholder="Enter phone number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerEmail">Email Address</Label>
                    <Input
                      id="customerEmail"
                      value={watchedValues.customerEmail || ""}
                      onChange={(e) => form.setValue("customerEmail", e.target.value, { shouldValidate: true })}
                      placeholder="Enter email address"
                      type="email"
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerGstin">GSTIN</Label>
                    <Input
                      id="customerGstin"
                      value={watchedValues.customerGstin || ""}
                      onChange={(e) => form.setValue("customerGstin", e.target.value, { shouldValidate: true })}
                      placeholder="Enter GSTIN"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="customerAddress">Address</Label>
                    <Input
                      id="customerAddress"
                      value={watchedValues.customerAddress || ""}
                      onChange={(e) => form.setValue("customerAddress", e.target.value, { shouldValidate: true })}
                      placeholder="Enter address"
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerCity">City</Label>
                    <Input
                      id="customerCity"
                      value={watchedValues.customerCity || ""}
                      onChange={(e) => form.setValue("customerCity", e.target.value, { shouldValidate: true })}
                      placeholder="Enter city"
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerState">State</Label>
                    <Input
                      id="customerState"
                      value={watchedValues.customerState || ""}
                      onChange={(e) => form.setValue("customerState", e.target.value, { shouldValidate: true })}
                      placeholder="Enter state"
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerPincode">PIN Code</Label>
                    <Input
                      id="customerPincode"
                      value={watchedValues.customerPincode || ""}
                      onChange={(e) => form.setValue("customerPincode", e.target.value, { shouldValidate: true })}
                      placeholder="Enter PIN code"
                    />
                  </div>
                </div>
              )}
              </form>
            </CardContent>
          </Card>

          {/* Invoice Date & Platform */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Invoice Date & Platform
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="invoiceDate" className="text-sm font-medium">Invoice Date</Label>
                <Input
                  id="invoiceDate"
                  type="date"
                  value={watchedValues.invoiceDate || ""}
                  onChange={(e) => form.setValue("invoiceDate", e.target.value, { shouldValidate: true })}
                  className="w-full md:w-48 text-base font-medium"
                />
              </div>
              <div>
                <Label htmlFor="platform">Sales Platform</Label>
                <Select value={watchedValues.platform} onValueChange={(value) => form.setValue("platform", value as any)}>
                  <SelectTrigger id="platform">
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePlatforms.map((platform) => (
                      <SelectItem key={platform.code} value={platform.code}>
                        {platform.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="invoiceType">Invoice Type</Label>
                <Select value={watchedValues.invoiceType} onValueChange={(value) => form.setValue("invoiceType", value as any)}>
                  <SelectTrigger id="invoiceType">
                    <SelectValue placeholder="Select invoice type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TAX_INVOICE">Tax Invoice</SelectItem>
                    <SelectItem value="EXPORT_INVOICE">Export Invoice</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Export Configuration - Only show for Export Invoices */}
          {watchedValues.invoiceType === "EXPORT_INVOICE" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Export Configuration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="invoiceCurrency">Invoice Currency</Label>
                    <Select value={watchedValues.invoiceCurrency || "USD"} onValueChange={(value) => form.setValue("invoiceCurrency", value as any)}>
                      <SelectTrigger id="invoiceCurrency">
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD ($) - US Dollar</SelectItem>
                        <SelectItem value="EUR">EUR (€) - Euro</SelectItem>
                        <SelectItem value="GBP">GBP (£) - British Pound</SelectItem>
                        <SelectItem value="INR">INR (₹) - Indian Rupee</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="conversionRate">Conversion Rate (1 {watchedValues.invoiceCurrency || "USD"} = ? INR)</Label>
                    <Input
                      id="conversionRate"
                      type="number"
                      step="0.01"
                      placeholder="e.g., 83.50"
                      {...form.register("conversionRate", { valueAsNumber: true })}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter the current RBI/customs rate for invoice date
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="exportType">Export Type</Label>
                    <Select value={watchedValues.exportType || "LUT"} onValueChange={(value) => form.setValue("exportType", value as any)}>
                      <SelectTrigger id="exportType">
                        <SelectValue placeholder="Select export type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LUT">LUT (Letter of Undertaking)</SelectItem>
                        <SelectItem value="BOND">Bond</SelectItem>
                        <SelectItem value="PAYMENT">Payment of IGST</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="iecCode">Company IEC Code</Label>
                    <Input
                      id="iecCode"
                      placeholder="e.g., 0303011288"
                      {...form.register("iecCode")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="countryOfDestination">Country of Destination</Label>
                    <Input
                      id="countryOfDestination"
                      placeholder="e.g., United States"
                      {...form.register("countryOfDestination")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="portOfDispatch">Port of Dispatch</Label>
                    <Input
                      id="portOfDispatch"
                      placeholder="e.g., IGI Airport, New Delhi"
                      {...form.register("portOfDispatch")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="modeOfTransport">Mode of Transport</Label>
                    <Select value={watchedValues.modeOfTransport || "AIR"} onValueChange={(value) => form.setValue("modeOfTransport", value as any)}>
                      <SelectTrigger id="modeOfTransport">
                        <SelectValue placeholder="Select transport mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AIR">Air</SelectItem>
                        <SelectItem value="COURIER">Courier</SelectItem>
                        <SelectItem value="HAND_DELIVERY">Hand Delivery</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="courierPartner">Courier Partner</Label>
                    <Input
                      id="courierPartner"
                      placeholder="e.g., FedEx, DHL"
                      {...form.register("courierPartner")}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="trackingId">Tracking ID</Label>
                    <Input
                      id="trackingId"
                      placeholder="e.g., 1234567890"
                      {...form.register("trackingId")}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="platformOrderId">Platform Order ID</Label>
                    <Input
                      id="platformOrderId"
                      placeholder="e.g., eBay order #123456789, Amazon B00XXXX"
                      {...form.register("platformOrderId")}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Item Selection - SKU Search Only */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Add Items by SKU Search
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative" ref={itemSearchRef}>
                  <Search className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                  <Input
                    placeholder="Search by SKU, item name, or category (min 2 chars)..."
                    value={itemSearchQuery}
                    onChange={(e) => {
                      const value = e.target.value;
                      setItemSearchQuery(value);
                      // Only show dropdown when at least 2 characters typed
                      if (value.length >= 2) {
                        setShowItemDropdown(true);
                      } else {
                        setShowItemDropdown(false);
                      }
                    }}
                    onKeyDown={(e) => {
                      // Close dropdown on Escape key
                      if (e.key === 'Escape') {
                        setShowItemDropdown(false);
                      }
                    }}
                    className="pl-10 text-gray-900 placeholder:text-gray-500"
                    style={{ color: '#111827', backgroundColor: '#ffffff' }}
                  />
                  {showItemDropdown && filteredItems.length > 0 && itemSearchQuery.length >= 2 && (
                    <div className="absolute z-10 w-full mt-1 bg-gray-50 border rounded-md shadow-lg max-h-60 overflow-auto">
                      {filteredItems.map((item) => (
                        <div
                          key={item.id}
                          className="p-4 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                          onClick={() => addToCart(item)}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{item.itemName}</div>
                              <div className="text-sm text-gray-600">
                                SKU: {item.sku} • {item.category}
                              </div>
                              {item.gemType && (
                                <div className="text-sm text-gray-600">
                                  Gem Type: {item.gemType}
                                </div>
                              )}
                              <div className="text-sm text-green-600">
                                GST: {getGstRate(item.category)}% (included)
                              </div>
                            </div>
                            <div className="text-right ml-4">
                              <div className="text-lg font-bold text-green-600">
                                {formatCurrency(item.sellingPrice)}
                              </div>
                              <div className="text-sm text-green-600">
                                In Stock
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {itemSearchQuery && filteredItems.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">
                    No items found. Try a different search term.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Cart */}
          <Card>
            <CardHeader>
              <CardTitle>Cart Items ({cart.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No items in cart. Search and add items above.</p>
              ) : (
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{item.itemName}</div>
                        <div className="text-sm font-mono text-muted-foreground">SKU: {item.sku}</div>
                        {watchedValues.invoiceType !== "EXPORT_INVOICE" && (
                          <div className="text-sm text-muted-foreground">
                            GST: {item.gstRate}% • {formatCurrency(item.sellingPrice)} each
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm">Qty:</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateCartItem(item.id, "quantity", parseInt(e.target.value) || 1)}
                          className="w-20 h-8"
                        />
                      </div>
                      {watchedValues.invoiceType === "EXPORT_INVOICE" ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-200 min-w-[44px] text-center">
                            {watchedValues.invoiceCurrency || "USD"}
                          </span>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={item.usdPrice ?? ""}
                            onChange={(e) => updateCartItem(item.id, "usdPrice", parseFloat(e.target.value) || 0)}
                            className="w-28 h-8 border-blue-400 font-mono text-sm"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Label className="text-sm">Discount:</Label>
                          <Input
                            type="number"
                            min="0"
                            value={item.discount}
                            onChange={(e) => updateCartItem(item.id, "discount", parseFloat(e.target.value) || 0)}
                            className="w-24 h-8"
                          />
                        </div>
                      )}
                      <div className="text-right min-w-[90px]">
                        {watchedValues.invoiceType === "EXPORT_INVOICE" ? (
                          <>
                            <div className="font-bold text-blue-700 font-mono">
                              {item.usdPrice ? `${watchedValues.invoiceCurrency || "USD"} ${item.usdPrice.toFixed(2)}` : <span className="text-orange-400 text-sm">Enter price</span>}
                            </div>
                            <div className="text-xs text-emerald-600">Zero GST</div>
                          </>
                        ) : (
                          <>
                            <div className="font-bold">{formatCurrency(item.netAmount)}</div>
                            <div className="text-sm text-muted-foreground">
                              Tax: {formatCurrency(item.taxAmount)} ({item.gstRate}%)
                            </div>
                          </>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeFromCart(item.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Summary & Payment */}
        <div className="space-y-6">
          {/* Discount Section - Single Discount Only */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="w-5 h-5" />
                Discount Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={watchedValues.discountType} onValueChange={(value) => form.setValue("discountType", value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select discount type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Discount</SelectItem>
                  <SelectItem value="flat">Flat Amount</SelectItem>
                  <SelectItem value="coupon">Coupon Code</SelectItem>
                </SelectContent>
              </Select>

              {watchedValues.discountType === "flat" && (
                <div>
                  <Label htmlFor="flatDiscount">Flat Discount Amount</Label>
                  <Input
                    id="flatDiscount"
                    type="number"
                    min="0"
                    value={watchedValues.flatDiscount ?? ""}
                    onChange={(e) => form.setValue("flatDiscount", parseFloat(e.target.value) || 0, { shouldValidate: true })}
                    placeholder="Enter flat discount"
                  />
                </div>
              )}

              {watchedValues.discountType === "coupon" && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={watchedValues.couponCode || ""}
                      onChange={(e) => form.setValue("couponCode", e.target.value, { shouldValidate: true })}
                      placeholder="Enter coupon code"
                      className="flex-1"
                    />
                    <Button type="button" onClick={applyCoupon} variant="outline">
                      Apply
                    </Button>
                    {couponDiscountValue > 0 && (
                      <Button type="button" onClick={removeCoupon} variant="destructive" size="sm">
                        Remove
                      </Button>
                    )}
                  </div>
                  {couponDiscountValue > 0 && (
                    <div className="p-2 bg-green-50 rounded border border-green-200">
                      <span className="text-green-700">Coupon discount: {formatCurrency(couponDiscountValue)}</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Loyalty Points */}
          {selectedCustomer && customerLoyaltyPoints > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="w-5 h-5" />
                  Loyalty Points
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-purple-50 rounded border border-purple-200">
                  <div className="flex justify-between items-center">
                    <span className="text-purple-700">Available Points</span>
                    <span className="font-bold text-purple-900">{customerLoyaltyPoints}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-purple-700">Max Redeemable</span>
                    <span className="font-bold text-purple-900">{formatCurrency(maxLoyaltyRedeem)}</span>
                  </div>
                </div>
                <div>
                  <Label htmlFor="loyaltyRedeemAmount">Points to Redeem</Label>
                  <Input
                    id="loyaltyRedeemAmount"
                    type="number"
                    min="0"
                    max={maxLoyaltyRedeem}
                    value={watchedValues.loyaltyRedeemAmount ?? ""}
                    onChange={(e) => form.setValue("loyaltyRedeemAmount", parseFloat(e.target.value) || 0, { shouldValidate: true })}
                    placeholder="Enter amount to redeem"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Additional Charges */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Charges</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="shippingCharge">Shipping Charge</Label>
                <Input
                  id="shippingCharge"
                  type="number"
                  min="0"
                  value={watchedValues.shippingCharge ?? ""}
                  onChange={(e) => form.setValue("shippingCharge", parseFloat(e.target.value) || 0, { shouldValidate: true })}
                  placeholder="Enter shipping charge"
                />
              </div>
              <div>
                <Label htmlFor="additionalCharge">Additional Charge</Label>
                <Input
                  id="additionalCharge"
                  type="number"
                  min="0"
                  value={watchedValues.additionalCharge ?? ""}
                  onChange={(e) => form.setValue("additionalCharge", parseFloat(e.target.value) || 0, { shouldValidate: true })}
                  placeholder="Enter additional charge"
                />
              </div>
            </CardContent>
          </Card>

          {/* Payment Details */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Multi-Payment UI */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Payments</Label>
                  <Button type="button" onClick={addInitialPayment} variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    Add Payment
                  </Button>
                </div>
                {initialPayments.map((payment, index) => (
                  <div key={index} className="border rounded-md p-4 space-y-4">
                    {/* Row 1: Amount (full width) */}
                    <div className="mb-4">
                      <Label className="text-xs font-medium text-muted-foreground block mb-1.5">
                        Amount{" "}
                        {isExportInvoice && USD_METHODS.includes(payment.method) ? (
                          <span className="text-blue-600 font-bold">({watchedValues.invoiceCurrency || "USD"})</span>
                        ) : isExportInvoice ? (
                          <span className="text-gray-400">(INR)</span>
                        ) : null}
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={payment.amount}
                        onChange={(e) => updateInitialPayment(index, "amount", parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className={`h-10 text-base font-mono w-full ${isExportInvoice && USD_METHODS.includes(payment.method) ? "border-blue-400 focus:border-blue-600" : ""}`}
                      />
                      {isExportInvoice && USD_METHODS.includes(payment.method) && payment.amount > 0 && exportConvRate > 1 && (
                        <p className="text-xs text-gray-400 mt-1">= ₹{(payment.amount * exportConvRate).toFixed(2)} INR</p>
                      )}
                    </div>
                    
                    {/* Row 2: Method, Date, Reference */}
                    <div className="grid gap-3 md:grid-cols-3 items-start">
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground block mb-1.5">Method</Label>
                        <Select value={payment.method} onValueChange={(value) => updateInitialPayment(index, "method", value)}>
                          <SelectTrigger className="h-9 text-sm w-full">
                            <SelectValue placeholder="Choose method" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CASH">Cash</SelectItem>
                            <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                            <SelectItem value="UPI">UPI</SelectItem>
                            <SelectItem value="CHEQUE">Cheque</SelectItem>
                            <SelectItem value="CARD">Card</SelectItem>
                            <SelectItem value="ADVANCE_ADJUST">Advance Adjustment</SelectItem>
                            <SelectItem value="CREDIT_NOTE">Credit Note</SelectItem>
                            {watchedValues.invoiceType === "EXPORT_INVOICE" && <SelectItem value="PAYPAL">PayPal</SelectItem>}
                            {watchedValues.invoiceType === "EXPORT_INVOICE" && <SelectItem value="PAYONEER">Payoneer</SelectItem>}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground block mb-1.5">Date</Label>
                        <Input
                          type="date"
                          value={payment.date}
                          onChange={(e) => updateInitialPayment(index, "date", e.target.value)}
                          className="h-9 text-sm w-full"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground block mb-1.5">Reference</Label>
                        <Input
                          value={payment.reference || ""}
                          onChange={(e) => updateInitialPayment(index, "reference", e.target.value)}
                          placeholder="Txn Ref / CN Code"
                          className="h-9 text-sm w-full"
                        />
                      </div>
                    </div>
                    
                    {/* Advance Selection */}
                    {payment.method === "ADVANCE_ADJUST" && availableAdvances.length > 0 && (
                      <div className="col-span-full">
                        <Label>Select Advance</Label>
                        <Select 
                          value={payment.advanceId || ""} 
                          onValueChange={(value) => {
                            const advance = availableAdvances.find(a => a.id === value);
                            if (advance) {
                              updateInitialPayment(index, "advanceId", value);
                              updateInitialPayment(index, "amount", advance.remainingAmount);
                              updateInitialPayment(index, "reference", `Advance: ${advance.paymentMode} - ${new Date(advance.createdAt).toLocaleDateString()}`);
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose an available advance" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableAdvances.map((advance) => (
                              <SelectItem key={advance.id} value={advance.id}>
                                ₹{advance.remainingAmount.toLocaleString()} available (from {new Date(advance.createdAt).toLocaleDateString()})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    {/* Credit Note Code Entry */}
                    {payment.method === "CREDIT_NOTE" && (
                      <div className="col-span-full">
                        <Label className="text-sm font-medium text-muted-foreground">Credit Note Code</Label>
                        <div className="flex flex-col gap-2 md:flex-row">
                          <Input
                            placeholder="Enter CN-XXXX format"
                            value={payment.creditNoteCode || ""}
                            onChange={(e) => updateInitialPayment(index, "creditNoteCode", e.target.value.toUpperCase())}
                            className="h-10 text-base"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            className="md:w-auto w-full md:mt-0"
                            onClick={async () => {
                              const code = payment.creditNoteCode;
                              if (!code) {
                                toast.error("Please enter a credit note code");
                                return;
                              }
                              try {
                                const res = await fetch(`/api/credit-notes/validate?code=${encodeURIComponent(code)}`);
                                const data = await res.json();
                                if (data.valid) {
                                  updateInitialPayment(index, "creditNoteId", data.id);
                                  updateInitialPayment(index, "amount", data.remainingAmount);
                                  updateInitialPayment(index, "reference", `CN: ${code}`);
                                  toast.success(`Credit note validated: ₹${data.remainingAmount.toLocaleString()} available`);
                                } else {
                                  toast.error(data.error || "Invalid credit note code");
                                }
                              } catch {
                                toast.error("Failed to validate credit note");
                              }
                            }}
                          >
                            Validate
                          </Button>
                        </div>
                        {payment.creditNoteId && (
                          <p className="text-xs text-green-600 mt-1">
                            ✓ Credit note validated and linked
                          </p>
                        )}
                      </div>
                    )}
                    
                    {/* Notes row with delete button */}
                    <div className="flex flex-col gap-3 md:flex-row md:items-start">
                      <div className="flex-1">
                        <Label className="text-sm font-medium text-muted-foreground">Notes</Label>
                        <Textarea
                          value={payment.notes || ""}
                          onChange={(e) => updateInitialPayment(index, "notes", e.target.value)}
                          placeholder="Optional notes for this payment"
                          rows={2}
                          className="text-base"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="md:ml-3 md:mt-6 w-full md:w-auto"
                        onClick={() => removeInitialPayment(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={watchedValues.notes || ""}
                  onChange={(e) => form.setValue("notes", e.target.value, { shouldValidate: true })}
                  placeholder="Add any notes or special instructions"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                {isExportInvoice ? (
                  <>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Subtotal ({watchedValues.invoiceCurrency || "USD"})</span>
                      <span className="font-mono">{watchedValues.invoiceCurrency || "USD"} {totalUsdAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-600 text-sm">
                      <span>GST</span>
                      <span>Zero Rated (Export)</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span>Subtotal (Before Tax)</span>
                      <span>{formatCurrency(cart.reduce((sum, item) => {
                        const basePrice = (item.sellingPrice / (1 + (item.gstRate / 100))) * item.quantity;
                        return sum + basePrice;
                      }, 0))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax</span>
                      <span>{formatCurrency(cart.reduce((sum, item) => sum + (item.taxAmount || 0), 0))}</span>
                    </div>
                    {totalItemDiscount > 0 && (
                      <div className="flex justify-between">
                        <span>Item Discount</span>
                        <span>-{formatCurrency(totalItemDiscount)}</span>
                      </div>
                    )}
                    {flatDiscountAmount > 0 && (
                      <div className="flex justify-between">
                        <span>{watchedValues.discountType === "flat" ? "Flat Discount" : "Coupon Discount"}</span>
                        <span>-{formatCurrency(flatDiscountAmount)}</span>
                      </div>
                    )}
                    {loyaltyRedeemAmount > 0 && (
                      <div className="flex justify-between">
                        <span>Loyalty Points</span>
                        <span className="text-green-600">-{formatCurrency(loyaltyRedeemAmount)}</span>
                      </div>
                    )}
                  </>
                )}
                <div className="flex justify-between text-xl font-bold border-t pt-2">
                  <span>Total</span>
                  <span className="font-mono">
                    {isExportInvoice
                      ? `${watchedValues.invoiceCurrency || "USD"} ${totalUsdAmount.toFixed(2)}`
                      : formatCurrency(finalTotal)}
                  </span>
                </div>
                {totalPaidAmount > 0 && (
                  <div className="flex justify-between">
                    <span>Paid Amount</span>
                    <span className="text-green-600">
                      {isExportInvoice
                        ? `-${watchedValues.invoiceCurrency || "USD"} ${totalPaidUsdAmount.toFixed(2)}`
                        : `-${formatCurrency(totalPaidAmount)}`}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-bold text-green-600">
                  <span>Amount to Collect</span>
                  <span className="font-mono">
                    {isExportInvoice
                      ? `${watchedValues.invoiceCurrency || "USD"} ${Math.max(0, totalUsdAmount - totalPaidUsdAmount).toFixed(2)}`
                      : formatCurrency(amountToCollect)}
                  </span>
                </div>
              </div>
              <Separator />
              <Alert>
                <AlertDescription>
                  <strong>Amount to be collected:</strong>{" "}
                  <span className="text-xl font-bold text-green-600">
                    {isExportInvoice
                      ? `${watchedValues.invoiceCurrency || "USD"} ${Math.max(0, totalUsdAmount - totalPaidUsdAmount).toFixed(2)}`
                      : formatCurrency(amountToCollect)}
                  </span>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Create Sale Button */}
          <Button
            type="button"
            onClick={handleConfirmSale}
            disabled={isSubmitting || cart.length === 0}
            className="w-full"
            size="lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Sale...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Create Sale & Invoice
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent aria-describedby="confirm-sale-description" className="relative">
          {/* Loading Overlay */}
          {isSubmitting && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-lg">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
              <p className="text-lg font-medium">Creating Invoice...</p>
              <p className="text-sm text-muted-foreground mt-1">Please wait, this may take a few seconds</p>
            </div>
          )}
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {confirmationStep === 1 && <AlertTriangle className="w-5 h-5 text-yellow-500" />}
              {confirmationStep === 2 && <AlertTriangle className="w-5 h-5 text-red-500" />}
              {confirmationStep === 3 && <CheckCircle className="w-5 h-5 text-green-500" />}
              Confirm Sale Creation
            </DialogTitle>
            <DialogDescription id="confirm-sale-description" className="sr-only">
              Review payment status, pending amounts, and invoice totals before finalizing sale creation.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {confirmationStep === 1 && (
              <div>
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Partial Payment Detected</strong><br />
                    Amount Paid: {isExportInvoice
                      ? `${watchedValues.invoiceCurrency || "USD"} ${totalPaidUsdAmount.toFixed(2)}`
                      : formatCurrency(totalPaidAmount)}<br />
                    Pending Amount: {isExportInvoice
                      ? `${watchedValues.invoiceCurrency || "USD"} ${Math.max(0, totalUsdAmount - totalPaidUsdAmount).toFixed(2)}`
                      : formatCurrency(amountToCollect)}<br />
                    Are you sure you want to create this invoice with partial payment?
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {confirmationStep === 2 && (
              <div>
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>No Payment Made</strong><br />
                    Total Amount: {isExportInvoice
                      ? `${watchedValues.invoiceCurrency || "USD"} ${totalUsdAmount.toFixed(2)}`
                      : formatCurrency(finalTotal)}<br />
                    No payment was recorded for this invoice.<br />
                    Are you sure you want to create this invoice with pending payment status?
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {confirmationStep === 3 && (
              <div>
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Final Confirmation</strong><br />
                    Invoice Number: <strong>{nextInvoiceNumber}</strong><br />
                    Total Amount: {isExportInvoice
                      ? `${watchedValues.invoiceCurrency || "USD"} ${totalUsdAmount.toFixed(2)}`
                      : formatCurrency(finalTotal)}<br />
                    Amount to Collect: <strong>{isExportInvoice
                      ? `${watchedValues.invoiceCurrency || "USD"} ${Math.max(0, totalUsdAmount - totalPaidUsdAmount).toFixed(2)}`
                      : formatCurrency(amountToCollect)}</strong><br />
                    Payment Status: {watchedValues.paymentStatus}<br />
                    Customer: {selectedCustomer?.name || watchedValues.customerName}<br />
                    Items: {cart.length} (Quantity: {cart.reduce((sum, item) => sum + item.quantity, 0)})
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowConfirmation(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              onClick={proceedToNextStep}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {confirmationStep === 3 ? "Creating Invoice..." : "Processing..."}
                </>
              ) : (
                confirmationStep === 3 ? "Create Invoice" : "Continue"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
