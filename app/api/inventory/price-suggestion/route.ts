import { NextRequest, NextResponse } from "next/server";
import { getPriceSuggestions } from "@/lib/price-suggestion";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const categoryCodeId = searchParams.get("categoryCodeId") || undefined;
  const gemstoneCodeId = searchParams.get("gemstoneCodeId") || undefined;
  const vendorId = searchParams.get("vendorId") || undefined;
  const weightValue = parseFloat(searchParams.get("weightValue") || "0");
  const weightUnit = searchParams.get("weightUnit") || "cts";
  const pricingMode = (searchParams.get("pricingMode") || "PER_CARAT") as "PER_CARAT" | "PER_RATTI" | "FLAT";

  try {
    const result = await getPriceSuggestions({
      categoryCodeId,
      gemstoneCodeId,
      vendorId,
      weightValue,
      weightUnit,
      pricingMode,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[price-suggestion] API route error:", err);
    return NextResponse.json({
      suggestedSellingRate: null,
      suggestedSellingPrice: null,
      suggestedPurchaseRate: null,
      confidence: 0,
      sampleCount: 0,
      minRate: null,
      maxRate: null,
      matchLevel: "none",
    });
  }
}
