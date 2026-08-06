import { NextRequest, NextResponse } from 'next/server';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { uploadToImageKit } from '@/lib/imagekit';
import { withFreezeGuard } from "@/lib/governance";

// Configure API route to handle larger file uploads (max 50MB)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function uploadMedia(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('file') as File[];
    const sku = formData.get('sku') as string || 'temp'; // Optional SKU for naming
    const category = formData.get('category') as string || 'Uncategorized'; // Category for folder structure
    
    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const results = [];

    // Process files in bounded batches with parallel provider uploads per file.
    const CONCURRENCY = 4;

    async function processFile(file: File) {
      const buffer = Buffer.from(await file.arrayBuffer());

      // Sanitize SKU and Filename
      const sanitizedSku = sku !== 'temp' ? sku.replace(/[^a-zA-Z0-9.-]/g, '_') : '';
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');

      // Construct unique filename
      const timestamp = Date.now();
      const prefix = sanitizedSku ? `${sanitizedSku}_${timestamp}_` : `${timestamp}_`;

      // Truncate filename if needed
      const maxNameLength = 200 - prefix.length;
      const truncatedFileName = sanitizedFileName.length > maxNameLength
        ? sanitizedFileName.substring(0, maxNameLength) + (sanitizedFileName.includes('.') ? sanitizedFileName.substring(sanitizedFileName.lastIndexOf('.')) : '')
        : sanitizedFileName;

      const uniqueFileName = `${prefix}${truncatedFileName}`;

      // Run Cloudinary (primary) and ImageKit (backup) in parallel.
      const [cloudOut, kitOut] = await Promise.allSettled([
        (async () => {
          console.log(`Starting upload for ${uniqueFileName}, size: ${file.size} bytes`);
          const url = await uploadToCloudinary(buffer, uniqueFileName);
          console.log(`Cloudinary upload successful: ${url}`);
          return url;
        })(),
        (async () => {
          const safeCategory = category.replace(/[^a-zA-Z0-9\s-_]/g, '').trim().replace(/\s+/g, '_');
          const folder = `/KhyatiGems_Backups/${safeCategory || 'Uncategorized'}`;
          if (!process.env.IMAGEKIT_PRIVATE_KEY) console.error("IMAGEKIT_PRIVATE_KEY is missing in API route");
          const imageKitResult = await uploadToImageKit(buffer, uniqueFileName, folder);
          if (imageKitResult && imageKitResult.url) {
            console.log(`ImageKit backup successful: ${imageKitResult.url}`);
            return imageKitResult.url;
          }
          console.warn(`ImageKit upload returned no URL:`, JSON.stringify(imageKitResult));
          return null;
        })(),
      ]);

      let cloudinaryUrl: string | null = null;
      let imageKitUrl: string | null = null;
      let errorMsg: string | null = null;

      if (cloudOut.status === "fulfilled" && cloudOut.value) {
        cloudinaryUrl = cloudOut.value;
      } else {
        const reason = cloudOut.status === "rejected" ? cloudOut.reason : null;
        console.error(`Cloudinary upload failed for ${file.name}:`, reason);
        const msg =
          reason instanceof Error
            ? reason.message
            : typeof reason === "object" && reason && "error" in reason
              ? String((reason as { error?: unknown }).error)
              : "";
        errorMsg = msg || "Cloudinary Upload failed";
      }

      if (kitOut.status === "fulfilled" && kitOut.value) {
        imageKitUrl = kitOut.value;
      } else {
        const reason = kitOut.status === "rejected" ? kitOut.reason : null;
        console.error(`ImageKit backup failed for ${file.name}:`, reason);
        if (!errorMsg && !cloudinaryUrl) errorMsg = "Both uploads failed: " + (reason instanceof Error ? reason.message : "ImageKit upload failed");
      }

      return {
        fileName: file.name,
        cloudinaryUrl: cloudinaryUrl,
        backupUrl: imageKitUrl,
        error: errorMsg,
      };
    }

    for (let i = 0; i < files.length; i += CONCURRENCY) {
      const batch = files.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.all(batch.map(processFile));
      results.push(...batchResults);
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: 'Upload failed', message: errorMessage }, { status: 500 });
  }
}

export const POST = withFreezeGuard("Media upload", uploadMedia);
