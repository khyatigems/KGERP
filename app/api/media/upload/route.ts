import { NextRequest, NextResponse } from "next/server";
import "@/lib/cloudinary";
import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DEFAULT_MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const LEGACY_DESKTOP_APP_TOKEN = "KHYATI_MEDIA_SYNC_SECRET_2026";

function getDesktopAppToken() {
  return process.env.KHYATI_MEDIA_SYNC_TOKEN || process.env.MEDIA_UPLOAD_TOKEN || LEGACY_DESKTOP_APP_TOKEN;
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token") || req.headers.get("x-media-sync-token");
    const expectedToken = getDesktopAppToken();

    if (!expectedToken || token !== expectedToken) {
      return NextResponse.json({ error: "Invalid or missing token" }, { status: 401 });
    }

    const body = await req.json();
    const { sku, fileName, mimeType, base64Data } = body as {
      sku?: string;
      fileName?: string;
      mimeType?: string;
      base64Data?: string;
    };

    if (!sku || !fileName || !base64Data) {
      return NextResponse.json(
        { error: "Missing required fields: sku, fileName, base64Data" },
        { status: 400 }
      );
    }

    if (!/^[A-Za-z0-9+/=\r\n]+$/.test(base64Data)) {
      return NextResponse.json({ error: "Invalid base64Data" }, { status: 400 });
    }

    const buffer = Buffer.from(base64Data, "base64");
    const maxBytes = Number(process.env.MEDIA_UPLOAD_MAX_BYTES || DEFAULT_MAX_UPLOAD_BYTES);
    if (buffer.length === 0 || buffer.length > maxBytes) {
      return NextResponse.json(
        { error: `File is empty or exceeds ${Math.round(maxBytes / 1024 / 1024)}MB` },
        { status: 413 }
      );
    }

    const inventory = await prisma.inventory.findUnique({
      where: { sku },
      select: { id: true, imageUrl: true },
    });

    if (!inventory) {
      return NextResponse.json(
        {
          success: false,
          linkedToInventory: false,
          error: `Inventory SKU not found: ${sku}`,
        },
        { status: 404 }
      );
    }

    const sanitizedSku = sku.replace(/[^a-zA-Z0-9.-]/g, "_");
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniqueFileName = `${sanitizedSku}_${Date.now()}_${sanitizedFileName}`;
    const isVideo = mimeType?.startsWith("video/");
    const resourceType = isVideo ? "video" : "image";

    const uploadResult = await new Promise<{ secure_url?: string; public_id?: string }>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          public_id: uniqueFileName.replace(/\.[^/.]+$/, ""),
          folder: `KhyatiGems/SKU_${sanitizedSku}`,
          resource_type: resourceType,
          overwrite: false,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result || {});
        }
      );

      Readable.from(buffer).pipe(uploadStream);
    });

    const cloudinaryUrl = uploadResult.secure_url;
    if (!cloudinaryUrl) {
      return NextResponse.json({ success: false, error: "Cloudinary upload failed" }, { status: 502 });
    }

    try {
      const existingPrimary = await prisma.inventoryMedia.findFirst({
        where: { inventoryId: inventory.id, isPrimary: true },
        select: { id: true },
      });
      const isPrimary = !existingPrimary;

      const [mediaRecord] = await prisma.$transaction([
        prisma.inventoryMedia.create({
          data: {
            inventoryId: inventory.id,
            mediaUrl: cloudinaryUrl,
            type: isVideo ? "VIDEO" : "IMAGE",
            isPrimary,
          },
        }),
        ...(isPrimary && !inventory.imageUrl
          ? [
              prisma.inventory.update({
                where: { id: inventory.id },
                data: { imageUrl: cloudinaryUrl },
              }),
            ]
          : []),
      ]);

      return NextResponse.json({
        success: true,
        linkedToInventory: true,
        inventoryId: inventory.id,
        mediaId: mediaRecord.id,
        url: cloudinaryUrl,
        cloudinaryUrl,
        publicId: uploadResult.public_id,
        fileName,
        sku,
      });
    } catch (dbError) {
      console.error("Database error saving media:", dbError);
      return NextResponse.json(
        {
          success: false,
          linkedToInventory: false,
          cloudinaryUrl,
          publicId: uploadResult.public_id,
          error: "Uploaded to Cloudinary but failed to link media to ERP inventory",
          message: dbError instanceof Error ? dbError.message : "Database error saving media",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Media upload error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Upload failed",
        message: error instanceof Error ? error.message : "Upload failed",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Media upload endpoint for Khyati Gems desktop app",
    method: "POST",
    requiredParams: ["token (query)", "sku", "fileName", "base64Data"],
    optionalParams: ["mimeType"],
    maxUploadMb: Math.round(Number(process.env.MEDIA_UPLOAD_MAX_BYTES || DEFAULT_MAX_UPLOAD_BYTES) / 1024 / 1024),
  });
}
