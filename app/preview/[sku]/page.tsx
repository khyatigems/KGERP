import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PreviewQR } from "@/components/preview/preview-qr";
import { Metadata } from "next";
import { formatCurrency } from "@/lib/utils";

interface PreviewPageProps {
    params: Promise<{ sku: string }>;
}

export async function generateMetadata({ params }: PreviewPageProps): Promise<Metadata> {
    const { sku } = await params;
    const item = await prisma.inventory.findUnique({
        where: { sku },
        select: { itemName: true }
    });

    return {
        title: item ? `${item.itemName} - Preview` : "Item Not Found",
    };
}

export default async function PreviewPage({ params }: PreviewPageProps) {
    const { sku } = await params;
    const item = await prisma.inventory.findUnique({
        where: { sku },
        include: {
            colorCode: true,
            gemstoneCode: true,
            cutCode: true,
            media: true
        }
    });

    if (!item) {
        notFound();
    }

    // Determine Pricing
    const isPerCarat = item.pricingMode === "PER_CARAT";
    const rate = isPerCarat ? item.sellingRatePerCarat : item.flatSellingPrice;
    const totalAmount = isPerCarat 
        ? (item.weightValue * (item.sellingRatePerCarat || 0)) 
        : (item.flatSellingPrice || 0);

    // Get Primary Image
    const primaryImage = item.media.find(m => m.type === "IMAGE")?.url;

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8 flex items-center justify-center">
            <Card className="max-w-md w-full shadow-lg overflow-hidden">
                <CardHeader className="text-center border-b bg-white relative z-10">
                    <div className="mx-auto mb-4">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary font-bold text-xl">
                            KG
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold text-primary">{item.itemName}</CardTitle>
                    <p className="text-sm text-muted-foreground font-mono mt-1">{item.sku}</p>
                </CardHeader>
                
                {/* Product Image */}
                {primaryImage ? (
                    <div className="w-full aspect-square bg-black/5 relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                            src={primaryImage} 
                            alt={item.itemName}
                            className="w-full h-full object-contain"
                        />
                    </div>
                ) : (
                    <div className="w-full aspect-video bg-muted flex items-center justify-center text-muted-foreground">
                        No Image Available
                    </div>
                )}

                <CardContent className="space-y-6 pt-6">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="space-y-1">
                            <span className="text-muted-foreground block text-xs uppercase tracking-wider">Gem Type</span>
                            <span className="font-medium">{item.gemType}</span>
                        </div>
                        <div className="space-y-1">
                            <span className="text-muted-foreground block text-xs uppercase tracking-wider">Color</span>
                            <span className="font-medium">{item.colorCode?.name || item.colorCodeId || "-"}</span>
                        </div>
                        <div className="space-y-1">
                            <span className="text-muted-foreground block text-xs uppercase tracking-wider">Shape/Cut</span>
                            <span className="font-medium">
                                {[item.shape, item.cutCode?.name].filter(Boolean).join(" / ") || "-"}
                            </span>
                        </div>
                        <div className="space-y-1">
                            <span className="text-muted-foreground block text-xs uppercase tracking-wider">Weight</span>
                            <span className="font-medium">
                                {item.weightValue} {item.weightUnit}
                                {item.weightRatti && <span className="text-muted-foreground ml-1">({item.weightRatti.toFixed(2)} Ratti)</span>}
                            </span>
                        </div>
                        {item.dimensionsMm && (
                            <div className="space-y-1 col-span-2">
                                <span className="text-muted-foreground block text-xs uppercase tracking-wider">Dimensions</span>
                                <span className="font-medium">{item.dimensionsMm} mm</span>
                            </div>
                        )}
                        
                        {/* Pricing Section */}
                        <div className="col-span-2 grid grid-cols-2 gap-4 pt-2 border-t mt-2">
                             <div className="space-y-1">
                                <span className="text-muted-foreground block text-xs uppercase tracking-wider">
                                    Rate ({isPerCarat ? "Per Carat" : "Per Piece"})
                                </span>
                                <span className="font-medium">
                                    {rate ? formatCurrency(rate) : "N/A"}
                                </span>
                            </div>
                            <div className="space-y-1">
                                <span className="text-muted-foreground block text-xs uppercase tracking-wider">Total Amount</span>
                                <span className="font-bold text-lg text-primary">
                                    {totalAmount ? formatCurrency(totalAmount) : "N/A"}
                                </span>
                            </div>
                        </div>

                        {(item.treatment || item.certification) && (
                            <div className="space-y-1 col-span-2 pt-2 border-t mt-2">
                                <span className="text-muted-foreground block text-xs uppercase tracking-wider">Additional Info</span>
                                <div className="font-medium text-xs">
                                    {item.treatment && <span className="mr-3">Treatment: {item.treatment}</span>}
                                    {item.certification && <span>Cert: {item.certification}</span>}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="pt-6 border-t flex flex-col items-center justify-center gap-2">
                        <PreviewQR url="" /> 
                    </div>
                    
                    <div className="text-center text-xs text-muted-foreground pt-2">
                        Verified Authentic • Khyati Gems
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
