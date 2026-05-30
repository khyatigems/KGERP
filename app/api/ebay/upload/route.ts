import { NextRequest, NextResponse } from "next/server";
import "@/lib/cloudinary";
import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB for banner images

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (buffer.length === 0 || buffer.length > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: `File is empty or exceeds ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB` },
        { status: 413 }
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }

    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniqueFileName = `ebay_banner_${Date.now()}_${sanitizedFileName}`;

    const uploadResult = await new Promise<{ secure_url?: string; public_id?: string }>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          public_id: uniqueFileName.replace(/\.[^/.]+$/, ""),
          folder: "KhyatiGems/eBay_Banners",
          resource_type: "image",
          overwrite: false,
          transformation: [
            { width: 1440, crop: "scale" },
            { quality: "auto" }
          ]
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

    return NextResponse.json({
      success: true,
      url: cloudinaryUrl,
      publicId: uploadResult.public_id,
    });
  } catch (error) {
    console.error("eBay image upload error:", error);
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
