import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Metadata } from "next";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MediaGallery } from "@/components/preview/media-gallery";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";

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
            media: true,
            certificates: true
        }
    });

    if (!item) {
        notFound();
    }

    // Determine Pricing
    const isPerCarat = item.pricingMode === "PER_CARAT";
    const rate = isPerCarat ? item.sellingRatePerCarat : item.flatSellingPrice;
    const totalAmount = isPerCarat
        ? ((item.weightValue || 0) * (item.sellingRatePerCarat || 0))
        : (item.flatSellingPrice || 0);

    // Get Company Settings for Logo
    const companySettings = await prisma.companySettings.findFirst();

    const displayLogo = companySettings?.logoUrl;

    return (
        <div className="min-h-screen bg-[#FDFBF7] p-4 md:p-8 flex items-center justify-center font-sans">
            <Card className="max-w-md w-full shadow-[0_8px_40px_rgb(0,0,0,0.08)] border-0 overflow-hidden bg-white">
                <CardHeader className="text-center bg-white pb-6 pt-10 relative z-10">
                    <div className="mx-auto mb-6 relative">
                        {displayLogo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img 
                                src={displayLogo} 
                                alt={companySettings?.companyName || "Company Logo"} 
                                className="h-24 w-auto object-contain mx-auto"
                            />
                        ) : (
                            <div className="w-20 h-20 bg-stone-900 text-[#C5A059] rounded-full flex items-center justify-center mx-auto font-serif text-3xl shadow-lg ring-4 ring-stone-100">
                                KG
                            </div>
                        )}
                    </div>
                    <CardTitle className="text-3xl font-serif text-stone-900 tracking-tight leading-tight">{item.itemName}</CardTitle>
                    <div className="flex items-center justify-center gap-2 mt-3">
                        <div className="h-px w-8 bg-stone-300"></div>
                        <p className="text-xs text-stone-500 font-medium tracking-[0.2em] uppercase">{item.sku}</p>
                        <div className="h-px w-8 bg-stone-300"></div>
                    </div>
                </CardHeader>
                
                {/* Media Gallery */}
                <div className="bg-white px-6 pb-2">
                    <MediaGallery media={item.media.map(m => ({...m, mediaType: m.type}))} itemName={item.itemName} />
                </div>

                <CardContent className="space-y-8 pt-6 bg-white px-8 pb-10">
                    <div className="grid grid-cols-2 gap-y-8 gap-x-6 text-sm">
                        <div className="space-y-2">
                            <span className="text-stone-400 block text-[10px] uppercase tracking-widest font-semibold">Gem Type</span>
                            <span className="font-serif text-stone-800 text-lg">{item.gemType}</span>
                        </div>
                        <div className="space-y-2">
                            <span className="text-stone-400 block text-[10px] uppercase tracking-widest font-semibold">Color</span>
                            <span className="font-serif text-stone-800 text-lg">{item.colorCode?.name || item.colorCodeId || "-"}</span>
                        </div>
                        <div className="space-y-2">
                            <span className="text-stone-400 block text-[10px] uppercase tracking-widest font-semibold">Transparency</span>
                            {/* @ts-ignore */}
                            <span className="font-serif text-stone-800 text-lg">{item.transparency || "-"}</span>
                        </div>
                        <div className="space-y-2">
                            <span className="text-stone-400 block text-[10px] uppercase tracking-widest font-semibold">Shape / Cut</span>
                            <span className="font-serif text-stone-800 text-lg">
                                {[item.shape, item.cutCode?.name].filter(Boolean).join(" / ") || "-"}
                            </span>
                        </div>
                        <div className="space-y-2">
                            <span className="text-stone-400 block text-[10px] uppercase tracking-widest font-semibold">Weight</span>
                            <span className="font-serif text-stone-800 text-lg">
                                {item.weightValue} {item.weightUnit}
                                {item.weightRatti && <span className="text-stone-400 text-sm ml-1 font-sans">({item.weightRatti.toFixed(2)} Ratti)</span>}
                            </span>
                        </div>
                        {item.dimensionsMm && (
                            <div className="space-y-2 col-span-2">
                                <span className="text-stone-400 block text-[10px] uppercase tracking-widest font-semibold">Dimensions</span>
                                <span className="font-serif text-stone-800 text-lg">{item.dimensionsMm} mm</span>
                            </div>
                        )}
                        
                        {/* Pricing Section - Highlighted */}
                        <div className="col-span-2 bg-stone-50 -mx-8 px-8 py-6 border-y border-stone-100 flex items-center justify-between mt-2">
                             <div className="space-y-1">
                                <span className="text-stone-400 block text-[10px] uppercase tracking-widest font-semibold">
                                    Rate ({isPerCarat ? "Per Carat" : "Per Piece"})
                                </span>
                                <span className="font-medium text-stone-600 font-serif text-lg">
                                    {rate ? formatCurrency(rate) : "N/A"}
                                </span>
                            </div>
                            <div className="space-y-1 text-right">
                                <span className="text-stone-400 block text-[10px] uppercase tracking-widest font-semibold">Total Amount</span>
                                <span className="font-bold text-3xl text-stone-900 font-serif">
                                    {totalAmount ? formatCurrency(totalAmount) : "N/A"}
                                </span>
                            </div>
                        </div>

                        {(item.treatment || (item.certificates && item.certificates.length > 0) || item.certification) && (
                            <div className="space-y-3 col-span-2 pt-2">
                                <span className="text-stone-400 block text-[10px] uppercase tracking-widest font-semibold">Additional Info</span>
                                <div className="flex flex-wrap gap-3">
                                    {item.treatment && (
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-stone-100 text-stone-600 border border-stone-200">
                                            Treatment: {item.treatment}
                                        </span>
                                    )}
                                    {item.certificates && item.certificates.length > 0 ? (
                                        item.certificates.map((cert) => (
                                            <span key={cert.id} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#FFF9EB] text-[#947600] border border-[#F5E6C8]">
                                                Cert: {cert.name}{cert.remarks ? ` (${cert.remarks})` : ''}
                                            </span>
                                        ))
                                    ) : item.certification ? (
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#FFF9EB] text-[#947600] border border-[#F5E6C8]">
                                            Cert: {item.certification}
                                        </span>
                                    ) : null}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="pt-4 flex flex-col gap-3">
                        <Button 
                            className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold py-6 text-lg shadow-lg shadow-green-500/20 transition-all hover:scale-[1.01] hover:shadow-xl rounded-xl" 
                            asChild
                        >
                            <Link href={`https://wa.me/?text=Hi, I am interested in ${item.itemName} (${item.sku})`} target="_blank">
                                <WhatsAppIcon className="w-6 h-6 mr-2" />
                                Inquire on WhatsApp
                            </Link>
                        </Button>
                    </div>
                    
                    <div className="text-center pt-2">
                        <p className="text-[10px] text-stone-400 uppercase tracking-[0.2em] font-medium">Verified Authentic</p>
                        <p className="text-xs text-stone-300 font-serif italic mt-1">KhyatiGems Collection</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
