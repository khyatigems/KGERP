"use server";

import { generatePackagingPdfPuppeteer } from "@/lib/packaging-puppeteer";
import type { PackagingLabelData } from "@/lib/packaging-puppeteer";

export async function generatePackagingPdfAction(labels: PackagingLabelData[]) {
  try {
    const pdfBuffer = await generatePackagingPdfPuppeteer(labels);
    
    // Convert buffer to base64 string
    const base64 = Buffer.from(pdfBuffer).toString("base64");
    
    return {
      success: true,
      data: `data:application/pdf;base64,${base64}`,
    };
  } catch (error) {
    console.error("Puppeteer PDF Generation Error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to generate PDF",
    };
  }
}
