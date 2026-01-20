import { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { VendorForm } from "@/components/vendors/vendor-form";

export const metadata: Metadata = {
  title: "Edit Vendor | KhyatiGems™",
};

export default async function EditVendorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const vendor = await prisma.vendor.findUnique({
    where: { id },
  });

  if (!vendor) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Edit Vendor</h1>
      </div>
      <div className="rounded-xl border bg-card text-card-foreground shadow">
        <div className="p-6">
          <VendorForm vendor={vendor} />
        </div>
      </div>
    </div>
  );
}
