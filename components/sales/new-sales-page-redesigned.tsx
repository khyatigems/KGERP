"use client";

import { useState, useEffect, useMemo } from "react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  pincode?: string | null;
  gstin?: string | null;
}

interface CartItem extends InventoryItem {
  quantity: number;
  discount: number;
  taxAmount: number;
  netAmount: number;
  gstRate: number;
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
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "UPI", "CHEQUE", "CARD"]),
  paymentStatus: z.enum(["PAID", "PARTIAL", "PENDING"]),
  platform: z.enum(["MANUAL", "AMAZON", "ETSY", "EBAY", "FACEBOOK", "WHATSAPP"]).default("MANUAL"),
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
  const [maxLoyaltyRedeem, setMaxLoyaltyRedeem] = useState<number>(0);
  const [itemSearchQuery, setItemSearchQuery] = useState("");
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationStep, setConfirmationStep] = useState(1);
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState<string>("");
  const [categoryGstRates, setCategoryGstRates] = useState<Record<string, number>>({});
  const [initialPayments, setInitialPayments] = useState<Array<{ amount: number; method: string; date: string; reference?: string; notes?: string; advanceId?: string; creditNoteId?: string }>>([]);
  const [availableAdvances, setAvailableAdvances] = useState<Array<{ id: string; amount: number; remainingAmount: number; paymentMode: string; createdAt: string }>>([]);
  const [availableCreditNotes, setAvailableCreditNotes] = useState<Array<{ id: string; code: string; amount: number; remainingAmount: number; createdAt: string }>>([]);

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
      notes: "",
      shippingCharge: 0,
      additionalCharge: 0,
      invoiceDate: new Date().toISOString().split('T')[0],
    },
  });

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

  // Generate next invoice number by querying backend
  useEffect(() => {
    const loadNextInvoiceNumber = async () => {
      try {
        const result = await getNextInvoiceNumber();
        if (result?.success && result.invoiceNumber) {
          setNextInvoiceNumber(result.invoiceNumber);
        } else if (result?.invoiceNumber) {
          setNextInvoiceNumber(result.invoiceNumber);
        }
      } catch (error) {
        console.error("Error fetching next invoice number:", error);
      }
    };

    loadNextInvoiceNumber();
  }, []);

  const removeCoupon = () => {
    setCouponDiscount(0);
    form.setValue("couponCode", "");
    form.setValue("discountType", "none");
    toast.success("Coupon removed");
  };

  const addInitialPayment = () => {
    setInitialPayments(prev => [...prev, { amount: 0, method: "CASH", date: watchedValues.invoiceDate || new Date().toISOString().split('T')[0], notes: "" }]);
  };

  const updateInitialPayment = (index: number, field: string, value: any) => {
    setInitialPayments(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const removeInitialPayment = (index: number) => {
    setInitialPayments(prev => prev.filter((_, i) => i !== index));
  };

  const totalPaidAmount = initialPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  // Calculate totals using EXACT backend logic
  const totalNetAmount = cart.reduce((sum, item) => sum + item.netAmount, 0) + shippingChargeValue + additionalChargeValue;
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
  
  // Payment status logic (EXACT backend logic)
  const paidAmount = totalPaidAmount;
  const invoicePaymentStatus = 
    paidAmount >= finalTotal - 0.01
      ? "PAID"
      : paidAmount > 0
      ? "PARTIAL"
      : watchedValues.paymentStatus === "PARTIAL"
      ? "PARTIAL"
      : "PENDING"; // Changed from UNPAID to PENDING for frontend compatibility
  
  // Calculate amount to collect (backend logic)
  const amountToCollect = Math.max(0, finalTotal - paidAmount);

  // Auto-calculate payment status using EXACT backend logic
  useEffect(() => {
    if (finalTotal > 0) {
      // Use exact backend payment status logic
      const newStatus = 
        paidAmount >= finalTotal - 0.01
          ? "PAID"
          : paidAmount > 0
          ? "PARTIAL"
          : watchedValues.paymentStatus === "PARTIAL"
          ? "PARTIAL"
          : "PENDING";
      
      // Only update if different to avoid infinite loops
      if (watchedValues.paymentStatus !== newStatus) {
        form.setValue("paymentStatus", newStatus);
      }
    }
  }, [finalTotal, paidAmount, watchedValues.paymentStatus]);

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
  };

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
      initialPayments.forEach(p => {
        if (p.amount > 0) {
          combinedPayments.push({
            amount: p.amount,
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
        };
      });
      formData.append("items", JSON.stringify(itemsData));
      formData.append("shippingCharge", shippingChargeValue.toString());
      formData.append("additionalCharge", additionalChargeValue.toString());
      
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
      
      // Notes
      if (watchedValues.notes) {
        formData.append("notes", watchedValues.notes);
      }

      const result = await createSale(null, formData);
      
      console.log('Backend response:', result);
      
      if (result && result.success) {
        toast.success(result.message || "Sale created successfully!");
        setShowConfirmation(false);
        setConfirmationStep(1);
        
        // Reset form after successful creation
        setCart([]);
        setSelectedCustomer(null);
        form.reset();
        
        // Redirect to sales page after successful creation
        window.location.href = "/sales";
      } else {
        toast.error(result?.message || "Failed to create sale");
      }
    } catch (error) {
      toast.error("Failed to create sale");
    }
    setIsSubmitting(false);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header with Invoice Preview */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Record New Sale</h1>
          <p className="text-muted-foreground">Create a new sales invoice with professional ERP workflow</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Next Invoice Number</div>
          <div className="text-2xl font-bold text-green-600">{nextInvoiceNumber}</div>
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
            <CardContent className="space-y-4">
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
                <div className="space-y-4">
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
                <Label htmlFor="invoiceDate">Invoice Date</Label>
                <Input
                  id="invoiceDate"
                  type="date"
                  value={watchedValues.invoiceDate || ""}
                  onChange={(e) => form.setValue("invoiceDate", e.target.value, { shouldValidate: true })}
                  className="w-full md:w-auto"
                />
              </div>
              <div>
                <Label htmlFor="platform">Sales Platform</Label>
                <Select value={watchedValues.platform} onValueChange={(value) => form.setValue("platform", value as any)}>
                  <SelectTrigger>
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
            </CardContent>
          </Card>

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
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                  <Input
                    placeholder="Search by SKU, item name, or category..."
                    value={itemSearchQuery}
                    onChange={(e) => setItemSearchQuery(e.target.value)}
                    className="pl-10 text-gray-900 placeholder:text-gray-500"
                    style={{ color: '#111827', backgroundColor: '#ffffff' }}
                  />
                  {filteredItems.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-gray-50 border rounded-md shadow-lg max-h-80 overflow-auto">
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
                        <div className="text-sm text-muted-foreground">SKU: {item.sku}</div>
                        <div className="text-sm text-muted-foreground">
                          GST: {item.gstRate}% • {formatCurrency(item.sellingPrice)} each
                        </div>
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
                      <div className="text-right">
                        <div className="font-bold">{formatCurrency(item.netAmount)}</div>
                        <div className="text-sm text-muted-foreground">
                          Tax: {formatCurrency(item.taxAmount)} ({item.gstRate}%)
                        </div>
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
              <div>
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Select value={watchedValues.paymentMethod} onValueChange={(value) => form.setValue("paymentMethod", value as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                    <SelectItem value="CARD">Card</SelectItem>
                    <SelectItem value="ADVANCE_ADJUST">Advance Adjustment</SelectItem>
                    <SelectItem value="CREDIT_NOTE">Credit Note</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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
                  <div key={index} className="border rounded-md p-3 space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <Label>Amount</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={payment.amount}
                          onChange={(e) => updateInitialPayment(index, "amount", parseFloat(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label>Method</Label>
                        <Select value={payment.method} onValueChange={(value) => updateInitialPayment(index, "method", value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CASH">Cash</SelectItem>
                            <SelectItem value="BANK_TRANSFER">Bank</SelectItem>
                            <SelectItem value="UPI">UPI</SelectItem>
                            <SelectItem value="CHEQUE">Cheque</SelectItem>
                            <SelectItem value="CARD">Card</SelectItem>
                            <SelectItem value="ADVANCE_ADJUST">Advance Adjustment</SelectItem>
                            <SelectItem value="CREDIT_NOTE">Credit Note</SelectItem>
                          </SelectContent>
                        </Select>
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
                      
                      {/* Credit Note Selection */}
                      {payment.method === "CREDIT_NOTE" && availableCreditNotes.length > 0 && (
                        <div className="col-span-full">
                          <Label>Select Credit Note</Label>
                          <Select 
                            value={payment.creditNoteId || ""} 
                            onValueChange={(value) => {
                              const note = availableCreditNotes.find(n => n.id === value);
                              if (note) {
                                updateInitialPayment(index, "creditNoteId", value);
                                updateInitialPayment(index, "amount", note.remainingAmount);
                                updateInitialPayment(index, "reference", `CN: ${note.code}`);
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Choose an available credit note" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableCreditNotes.map((note) => (
                                <SelectItem key={note.id} value={note.id}>
                                  {note.code} - ₹{note.remainingAmount.toLocaleString()} available
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <div>
                        <Label>Date</Label>
                        <Input
                          type="date"
                          value={payment.date}
                          onChange={(e) => updateInitialPayment(index, "date", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Reference</Label>
                        <Input
                          value={payment.reference || ""}
                          onChange={(e) => updateInitialPayment(index, "reference", e.target.value)}
                          placeholder="Ref #"
                        />
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <Label>Notes</Label>
                        <Input
                          value={payment.notes || ""}
                          onChange={(e) => updateInitialPayment(index, "notes", e.target.value)}
                          placeholder="Optional notes"
                        />
                      </div>
                      <Button type="button" variant="destructive" size="sm" className="ml-3" onClick={() => removeInitialPayment(index)}>
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
                <div className="flex justify-between">
                  <span>Subtotal (Before Tax)</span>
                  <span>{formatCurrency(cart.reduce((sum, item) => {
                    const basePrice = (item.sellingPrice / (1 + (item.gstRate / 100))) * item.quantity;
                    return sum + basePrice;
                  }, 0))}</span>
                </div>
                {totalItemDiscount > 0 && (
                  <div className="flex justify-between">
                    <span>Item Discount</span>
                    <span>-{formatCurrency(totalItemDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Tax</span>
                  <span>{formatCurrency(cart.reduce((sum, item) => sum + (item.taxAmount || 0), 0))}</span>
                </div>
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
                <div className="flex justify-between text-xl font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(finalTotal)}</span>
                </div>
                {totalPaidAmount > 0 && (
                  <div className="flex justify-between">
                    <span>Paid Amount</span>
                    <span className="text-green-600">-{formatCurrency(totalPaidAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-bold text-green-600">
                  <span>Amount to Collect</span>
                  <span>{formatCurrency(amountToCollect)}</span>
                </div>
              </div>
              <Separator />
              <Alert>
                <AlertDescription>
                  <strong>Amount to be collected:</strong>{" "}
                  <span className="text-xl font-bold text-green-600">{formatCurrency(amountToCollect)}</span>
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
        <DialogContent aria-describedby="confirm-sale-description">
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
                    Amount Paid: {formatCurrency(totalPaidAmount)}<br />
                    Pending Amount: {formatCurrency(amountToCollect)}<br />
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
                    Total Amount: {formatCurrency(finalTotal)}<br />
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
                    Total Amount: {formatCurrency(finalTotal)}<br />
                    Amount to Collect: <strong>{formatCurrency(amountToCollect)}</strong><br />
                    Payment Status: {watchedValues.paymentStatus}<br />
                    Customer: {selectedCustomer?.name || watchedValues.customerName}<br />
                    Items: {cart.length} (Quantity: {cart.reduce((sum, item) => sum + item.quantity, 0)})
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmation(false)}>
              Cancel
            </Button>
            <Button onClick={proceedToNextStep}>
              {confirmationStep === 3 ? "Create Invoice" : "Continue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
