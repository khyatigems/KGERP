import { getEbaySettings } from "@/lib/ebay-settings-server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const result = await getEbaySettings();
    
    if (result.success && result.data) {
      return NextResponse.json({
        success: true,
        data: {
          id: result.data.id,
          globalBannerImages: result.data.globalBannerImages
            ? JSON.parse(result.data.globalBannerImages)
            : [],
          categoryImageUrls: result.data.categoryImageUrls
            ? JSON.parse(result.data.categoryImageUrls)
            : {},
          categoryGemtypeImageUrls: result.data.categoryGemtypeImageUrls
            ? JSON.parse(result.data.categoryGemtypeImageUrls)
            : {},
          maxImagesPerCategory: result.data.maxImagesPerCategory || 4,
          imagesPerDescription: result.data.imagesPerDescription || 2,
          imageRotationMode: result.data.imageRotationMode || "SEQUENTIAL",
          brandLogoUrl: result.data.brandLogoUrl,
          companyName: result.data.companyName,
          tagline: result.data.tagline,
        },
      });
    }

    return NextResponse.json(result, { status: 500 });
  } catch (error) {
    console.error("[/api/ebay/settings] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
