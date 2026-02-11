'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function generateGciCertificate(inventoryId: string) {
  try {
    // 1. Fetch Inventory Data
    const inventory = await prisma.inventory.findUnique({
      where: { id: inventoryId },
      include: {
        gemstoneCode: true,
        categoryCode: true,
        colorCode: true
      }
    });

    if (!inventory) {
      return { success: false, error: "Inventory item not found" };
    }

    if (inventory.certificateNo && inventory.lab === 'GCI') {
      return { success: false, error: "Item already has a GCI certificate" };
    }

    // 2. Prepare Data for GCI API
    const variety = inventory.gemType || inventory.gemstoneCode?.name || "Gemstone";
    const species = "Natural " + variety; // Simplified logic, can be refined
    
    // Handle Image Conversion to Base64
    let imageBase64 = null;
    if (inventory.imageUrl) {
      try {
        const imageRes = await fetch(inventory.imageUrl);
        if (imageRes.ok) {
            const arrayBuffer = await imageRes.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            imageBase64 = `data:${imageRes.headers.get('content-type') || 'image/jpeg'};base64,` + buffer.toString('base64');
        }
      } catch (err) {
        console.error("Failed to fetch inventory image for GCI:", err);
      }
    }

    const payload = {
      variety: variety,
      species: species,
      weight: inventory.weightValue || inventory.carats || 0,
      shape: inventory.shape || inventory.cut || "Unknown",
      color: inventory.color || "Unknown",
      dimensions: inventory.measurements || inventory.dimensionsMm || "Unknown",
      customer_name: "KhyatiGems Stock", // Default owner
      image_base64: imageBase64
    };

    // 3. Send to GCI API
    const gciUrl = process.env.GCI_API_URL;
    const gciKey = process.env.GCI_API_KEY;

    if (!gciUrl || !gciKey) {
      return { success: false, error: "GCI API configuration missing in ERP" };
    }

    const response = await fetch(gciUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": gciKey
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

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

  } catch (error) {
    console.error("Generate GCI Cert Error:", error);
    return { success: false, error: "Internal Server Error" };
  }
}
