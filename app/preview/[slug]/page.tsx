
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { Metadata } from "next";
import { getPublicLabelData } from "@/app/erp/packaging/actions";
import { SkuPreviewContent } from "@/components/preview/sku-preview-content";
import { trackPublicView } from "@/lib/analytics";

interface PreviewPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  
  // Try Serial
  const serialRes = await getPublicLabelData(slug);
  if (serialRes.success && serialRes.data) {
    return {
      title: "Packaging Label Preview",
      description: `Label preview for ${serialRes.data.serial}`,
    };
  }

  // Try SKU
  const item = await prisma.inventory.findUnique({
    where: { sku: slug },
    select: { itemName: true }
  });

  return {
    title: item ? `${item.itemName} - Preview` : "Item Not Found",
  };
}

export default async function PreviewPage({ params, searchParams }: PreviewPageProps) {
  const { slug } = await params;
  const sp = await searchParams;

  // 1. Check if it looks like a Serial Number (usually starts with KG-)
  // We can just try to fetch it as a serial number first.
  const serialRes = await getPublicLabelData(slug);
  
  if (serialRes.success && serialRes.data) {
    const source = typeof sp.source === "string" ? sp.source : (Array.isArray(sp.source) ? sp.source[0] : undefined);
    const query = source ? `?source=${encodeURIComponent(source)}` : "";
    redirect(`/verify/${encodeURIComponent(slug)}${query}`);
  }

  // 2. If not a serial, try finding it as a SKU
  const item = await prisma.inventory.findUnique({
    where: { sku: slug },
    include: {
      colorCode: true,
      gemstoneCode: true,
      cutCode: true,
      media: true,
      certificates: true
    }
  });

  if (item) {
    // Track View for SKU
    await trackPublicView("SKU_VIEW", item.id, item.sku, sp);

    // Determine Pricing
    const isPerCarat = item.pricingMode === "PER_CARAT";
    const rate = isPerCarat ? item.sellingRatePerCarat : item.flatSellingPrice;
    const totalAmount = isPerCarat
        ? ((item.weightValue || 0) * (item.sellingRatePerCarat || 0))
        : (item.flatSellingPrice || 0);

    // Get Company Settings for Logo
    const companySettings = await prisma.companySettings.findFirst();

    return (
      <SkuPreviewContent 
        item={item} 
        companySettings={companySettings}
        rate={rate || 0}
        totalAmount={totalAmount || 0}
        isPerCarat={isPerCarat}
      />
    );
  }

  // 3. Not Found
  notFound();
}
