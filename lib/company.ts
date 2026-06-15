import { prisma } from "@/lib/prisma";

export interface CompanyBranding {
  logoUrl: string | null;
  companyName: string;
}

export async function getCompanyBranding(): Promise<CompanyBranding> {
  try {
    const settings = await prisma.companySettings.findFirst({
      select: { logoUrl: true, companyName: true },
    });
    return {
      logoUrl: settings?.logoUrl ?? null,
      companyName: settings?.companyName || "Khyati Gems",
    };
  } catch {
    return { logoUrl: null, companyName: "Khyati Gems" };
  }
}
