"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { uploadToCloudinary } from "@/lib/cloudinary";

export async function getInvoiceSettings() {
  const settings = await prisma.invoiceSettings.findFirst();
  let paymentSettings = await prisma.paymentSettings.findFirst();
  
  // Migration Logic: If payment settings are missing or incomplete, try to fetch from legacy settings
  if (!paymentSettings || (!paymentSettings.upiId && !paymentSettings.bankName)) {
      const rawSettings = await prisma.setting.findMany({
          where: {
              key: { in: ['upi_vpa', 'upi_payee_name', 'bank_name', 'bank_account', 'bank_ifsc'] }
          }
      });
      
      const config = rawSettings.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {} as Record<string, string>);
      
      // If we found legacy settings, merge them
      if (Object.keys(config).length > 0) {
          // @ts-ignore - Constructing a partial object that matches the shape for UI
          paymentSettings = {
              ...(paymentSettings || {}),
              upiEnabled: paymentSettings?.upiEnabled ?? !!config.upi_vpa,
              upiId: paymentSettings?.upiId || config.upi_vpa || "",
              upiPayeeName: paymentSettings?.upiPayeeName || config.upi_payee_name || "",
              
              bankEnabled: paymentSettings?.bankEnabled ?? !!config.bank_name,
              bankName: paymentSettings?.bankName || config.bank_name || "",
              accountNumber: paymentSettings?.accountNumber || config.bank_account || "",
              ifscCode: paymentSettings?.ifscCode || config.bank_ifsc || "",
              accountHolder: paymentSettings?.accountHolder || "",
              
              // Preserve other fields
              razorpayEnabled: paymentSettings?.razorpayEnabled || false,
              razorpayKeyId: paymentSettings?.razorpayKeyId || "",
              razorpayKeySecret: paymentSettings?.razorpayKeySecret || "",
              razorpayButtonId: paymentSettings?.razorpayButtonId || "",
          };
      }
  }
  
  return {
    settings,
    paymentSettings
  };
}

export async function updateInvoiceSettings(prevState: any, formData: FormData) {
  try {
    const prefix = (formData.get("prefix") as string).trim();
    const terms = (formData.get("terms") as string).trim();
    const footerNotes = (formData.get("footerNotes") as string).trim();
    const currencySymbol = (formData.get("currencySymbol") as string).trim();
    const gstEnabled = formData.get("gstEnabled") === "on";
    const gstType = (formData.get("gstType") as string).trim();
    const categoryGstRates = (formData.get("categoryGstRates") as string).trim();
    
    // Payment Settings
    const upiEnabled = formData.get("upiEnabled") === "on";
    const upiId = (formData.get("upiId") as string).trim();
    const upiPayeeName = (formData.get("upiPayeeName") as string).trim();
    
    const bankEnabled = formData.get("bankEnabled") === "on";
    const bankName = (formData.get("bankName") as string).trim();
    const accountNumber = (formData.get("accountNumber") as string).trim();
    const ifscCode = (formData.get("ifscCode") as string).trim();
    const accountHolder = (formData.get("accountHolder") as string).trim();

    const razorpayEnabled = formData.get("razorpayEnabled") === "on";
    const razorpayKeyId = (formData.get("razorpayKeyId") as string).trim();
    const razorpayKeySecret = (formData.get("razorpayKeySecret") as string).trim();
    const razorpayButtonId = (formData.get("razorpayButtonId") as string).trim();
    
    // File Uploads
    const signatureFile = formData.get("digitalSignature") as File;
    let digitalSignatureUrl = formData.get("digitalSignatureUrl") as string | undefined;
    
    // If a new file is provided, upload it (this overrides the hidden input url if both are present, though UI should prevent that)
    if (signatureFile && signatureFile.size > 0) {
      const buffer = Buffer.from(await signatureFile.arrayBuffer());
      digitalSignatureUrl = await uploadToCloudinary(buffer, `signature-${Date.now()}`);
    } else if (!digitalSignatureUrl || digitalSignatureUrl === "undefined") {
        // If no file and no URL (or explicitly removed), set to null/undefined
        // However, if we want to keep existing, we rely on the form passing the existing URL back.
        // If the form passes an empty string, it means "remove signature".
        if (digitalSignatureUrl === "") {
             digitalSignatureUrl = null as any; // Allow null to clear it
        } else {
             digitalSignatureUrl = undefined; // Do nothing (keep existing)
        }
    }

    // Update Invoice Settings
    const existingSettings = await prisma.invoiceSettings.findFirst();
    
    if (existingSettings) {
      await prisma.invoiceSettings.update({
        where: { id: existingSettings.id },
        data: {
          prefix,
          terms,
          footerNotes,
          currencySymbol,
          gstEnabled,
          gstType,
          categoryGstRates,
          ...(digitalSignatureUrl !== undefined && { digitalSignatureUrl }),
        }
      });
    } else {
      await prisma.invoiceSettings.create({
        data: {
          prefix,
          terms,
          footerNotes,
          currencySymbol,
          gstEnabled,
          gstType,
          categoryGstRates,
          digitalSignatureUrl: digitalSignatureUrl || null,
        }
      });
    }
    
    // Update Payment Settings
    const existingPayment = await prisma.paymentSettings.findFirst();
    if (existingPayment) {
        await prisma.paymentSettings.update({
            where: { id: existingPayment.id },
            data: {
                upiEnabled,
                upiId,
                upiPayeeName,
                bankEnabled,
                bankName,
                accountNumber,
                ifscCode,
                accountHolder,
                razorpayEnabled,
                razorpayKeyId,
                razorpayKeySecret,
                razorpayButtonId,
            }
        });
    } else {
        await prisma.paymentSettings.create({
            data: {
                upiEnabled,
                upiId,
                upiPayeeName,
                bankEnabled,
                bankName,
                accountNumber,
                ifscCode,
                accountHolder,
                razorpayEnabled,
                razorpayKeyId,
                razorpayKeySecret,
                razorpayButtonId,
            }
        });
    }

    revalidatePath("/settings/invoice");
    revalidatePath("/invoice/[token]");
    return { success: true, message: "Settings updated successfully" };
  } catch (error) {
    console.error("Failed to update invoice settings:", error);
    return { 
        success: false, 
        message: error instanceof Error ? error.message : "Failed to update settings" 
    };
  }
}
