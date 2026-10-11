import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { normalizeEbayReviewImage } from "@/lib/marketplace/ebay-review-image";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await checkUserPermission(session.user.id, PERMISSIONS.INVENTORY_EDIT))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const form = await req.formData();
    const draftId = String(form.get("draftId") || ""), shopId = String(form.get("shopId") || "");
    const file = form.get("file");
    if (!(file instanceof File) || file.size > 4 * 1024 * 1024) return NextResponse.json({ error: "Choose one photo up to 4 MB." }, { status: 400 });
    const draft = await prisma.listing.findFirst({ where: { id: draftId, marketplaceShopId: shopId, platform: "EBAY", status: "DRAFT", marketplaceShop: { status: "CONNECTED", connection: { status: "CONNECTED" } } } });
    if (!draft?.inventoryId) return NextResponse.json({ error: "Unpublished eBay draft not found." }, { status: 404 });
    const metadata = JSON.parse(draft.rawMetadata || "{}");
    if (["PREPARING", "PUBLISHING", "PUBLISH_UNCERTAIN"].includes(metadata.completeEbay?.state)) return NextResponse.json({ error: "Check the pending operation before changing images." }, { status: 409 });
    const buffer = await normalizeEbayReviewImage(Buffer.from(await file.arrayBuffer()));
    const url = await uploadToCloudinary(buffer, `${draft.listingSku || "ebay"}_${randomUUID()}.jpg`);
    if (!url.startsWith("https://")) throw new Error("Image hosting did not return a secure photo URL.");
    await prisma.$transaction(async (tx) => {
      const updated = await tx.listing.updateMany({ where: { id: draft.id, status: "DRAFT", rawMetadata: draft.rawMetadata }, data: { rawMetadata: JSON.stringify({ ...metadata, completeEbay: { ...metadata.completeEbay, state: "SAVED", verified: false, reviewToken: undefined } }) } });
      if (!updated.count) throw new Error("This draft changed during upload. Reload its review.");
      await tx.inventoryMedia.create({ data: { inventoryId: draft.inventoryId!, mediaUrl: url, type: "IMAGE", isPrimary: false } });
    });
    return NextResponse.json({ mediaUrl: url, type: "IMAGE" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Image upload failed." }, { status: 422 });
  }
}
