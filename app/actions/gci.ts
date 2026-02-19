'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function generateGciCertificate(
  inventoryId: string, 
  additionalData?: {
    origin?: string;
    treatment?: string;
    fluorescence?: string;
    comments?: string;
  }
) {
  try {
    // 1. Fetch Inventory Data
    const inventory = await prisma.inventory.findUnique({
      where: { id: inventoryId },
      include: {
        gemstoneCode: true,
        categoryCode: true,
        colorCode: true,
        media: {
          where: { type: 'IMAGE' },
          orderBy: { isPrimary: 'desc' },
          take: 1
        }
      }
    });

    if (!inventory) {
      return { success: false, error: "Inventory item not found" };
    }

    if (inventory.certificateNo && inventory.lab === 'GCI') {
      return { success: false, error: "Item already has a GCI certificate" };
    }

    const speciesField = inventory.gemstoneCode?.name || inventory.gemType || "";
    const varietyField = inventory.gemType || inventory.categoryCode?.name || "";
    const colorField = inventory.color || inventory.colorCode?.name || "";
    const weightField = inventory.weightValue || inventory.carats || 0;
    const shapeField = inventory.shape || inventory.cut || "";
    const measurementsField = inventory.measurements || inventory.dimensionsMm || "";
    const originField = additionalData?.origin || inventory.origin || "";
    const treatmentField = additionalData?.treatment || inventory.treatment || "";
    const fluorescenceField = additionalData?.fluorescence || inventory.fluorescence || "";
    const hasImages = (inventory.media && inventory.media.length > 0) || !!inventory.imageUrl;

    const missing: string[] = [];
    if (!speciesField) missing.push("Species");
    if (!varietyField) missing.push("Variety");
    if (!colorField) missing.push("Color");
    if (!weightField || weightField <= 0) missing.push("Weight");
    if (!shapeField) missing.push("Shape");
    if (!measurementsField) missing.push("Measurements");
    if (!originField) missing.push("Origin");
    if (!treatmentField) missing.push("Treatments");
    if (!fluorescenceField) missing.push("Fluorescence");
    if (!hasImages) missing.push("Images");
    if (missing.length > 0) {
      return { success: false, error: `Missing required certificate fields: ${missing.join(", ")}` };
    }

    // 2. Prepare Data for GCI API
    const variety = varietyField || "Gemstone";
    const species = speciesField || "Natural Gemstone";
    
    // Handle Image Conversion to Base64
    let imageBase64 = null;
    const primaryImage = inventory.media?.[0]?.mediaUrl || inventory.imageUrl;
    
    if (primaryImage) {
      try {
        const imageRes = await fetch(primaryImage);
        if (imageRes.ok) {
            const arrayBuffer = await imageRes.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            imageBase64 = `data:${imageRes.headers.get('content-type') || 'image/jpeg'};base64,` + buffer.toString('base64');
        }
      } catch (err) {
        console.error("Failed to fetch inventory image for GCI:", err);
      }
    }

    // 3. Send to GCI API
    const gciUrl = process.env.GCI_API_URL?.trim();
    const gciKey = process.env.GCI_API_KEY?.trim();

    const payload = {
      variety: variety,
      species: species,
      weight: inventory.weightValue || inventory.carats || 0,
      shape: inventory.shape || inventory.cut || "Unknown",
      color: inventory.color || "Unknown",
      dimensions: inventory.measurements || inventory.dimensionsMm || "Unknown",
      customer_name: "KhyatiGems Stock", // Default owner
      image_base64: imageBase64,
      api_key: gciKey, // Also pass in body as fallback
      // Additional Data (from modal or defaults)
      origin: additionalData?.origin || inventory.origin || "Unknown",
      treatment: additionalData?.treatment || inventory.treatment || "None",
      fluorescence: additionalData?.fluorescence || inventory.fluorescence || "None",
      comments: additionalData?.comments || (inventory as unknown as { certificateComments?: string }).certificateComments || ""
    };

    // Force API key into URL as well to bypass Hostinger header stripping
    const finalUrl = gciUrl ? `${gciUrl}${gciUrl.includes('?') ? '&' : '?'}api_key=${encodeURIComponent(gciKey || '')}&t=${Date.now()}` : '';

    console.log("GCI Action - Target URL (sanitized):", finalUrl.replace(gciKey || '', '***'));
    console.log("GCI Action - Payload keys:", Object.keys(payload));

    if (!gciUrl || !gciKey) {
      return { success: false, error: "GCI API configuration missing in ERP" };
    }

    try {
      // Log URL for debugging (sanitized)
      console.log("GCI Action - Hitting URL:", finalUrl.replace(gciKey || '', '***'));

      const response = await fetch(finalUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-API-KEY": gciKey || "",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
          "Referer": "https://gemstonecertificationinstitute.com/",
          "Cache-Control": "no-cache",
          "Pragma": "no-cache"
        },
        body: JSON.stringify(payload),
        cache: 'no-store'
      });

      const responseText = await response.text();
      console.log("GCI Action - Raw Response Status:", response.status);

      if (!response.ok) {
        let errorMessage = `GCI Server Error (${response.status}): `;
        
        try {
          const errorJson = JSON.parse(responseText);
          if (errorJson.error) errorMessage += errorJson.error;
          if (errorJson.details) errorMessage += ` - Details: ${errorJson.details}`;
          if (errorJson.file) errorMessage += ` (File: ${errorJson.file}, Line: ${errorJson.line})`;
          if (errorJson.hint) errorMessage += ` - ${errorJson.hint}`;
        } catch {
          console.error("GCI Action - Failed to parse response as JSON. Raw response:", responseText);
          errorMessage += `The server returned an invalid response (not JSON). Raw response: ${responseText.substring(0, 100)}...`;
        }

        return { success: false, error: errorMessage };
      }

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error("GCI Action - JSON Parse Error:", parseError);
        console.error("GCI Action - Raw Response Content:", responseText);
        // Return the first 200 chars of the response to help debug
        const preview = responseText.substring(0, 200).replace(/\n/g, ' ');
        return { success: false, error: `Invalid JSON response from GCI API. Raw output: "${preview}..."` };
      }

      if (!result.success) {
        return { success: false, error: "GCI API Error: " + (result.error || "Unknown error") };
      }

      // 4. Update Inventory
      await prisma.inventory.update({
        where: { id: inventoryId },
        data: {
          certificateNo: result.certificate_number,
          lab: "GCI",
          certification: result.url // Storing the tracking URL
        }
      });

      revalidatePath(`/inventory/${inventoryId}`);
      return { success: true, certificateNumber: result.certificate_number };
    } catch (fetchError) {
      console.error("GCI Fetch Error:", fetchError);
      return { 
        success: false, 
        error: "Failed to connect to GCI API: " + (fetchError instanceof Error ? fetchError.message : "Unknown error") 
      };
    }

  } catch (error) {
    console.error("Generate GCI Cert Error:", error);
    return { success: false, error: "Internal Server Error" };
  }
}
