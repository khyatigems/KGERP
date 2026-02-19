import { NextRequest, NextResponse } from 'next/server';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { uploadToImageKit } from '@/lib/imagekit';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('file') as File[];
    const sku = formData.get('sku') as string || 'temp'; // Optional SKU for naming
    const category = formData.get('category') as string || 'Uncategorized'; // Category for folder structure
    
    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const results = [];

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      
      let cloudinaryUrl = null;
      let imageKitUrl = null;
      let errorMsg = null;

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

      // 1. Upload to Cloudinary (Primary)
      try {
        console.log(`Starting upload for ${uniqueFileName}, size: ${file.size} bytes`);
        cloudinaryUrl = await uploadToCloudinary(buffer, uniqueFileName);
        console.log(`Cloudinary upload successful: ${cloudinaryUrl}`);
      } catch (error: unknown) {
        console.error(`Cloudinary upload failed for ${file.name}:`, error);
        const msg =
          error instanceof Error
            ? error.message
            : typeof error === "object" && error && "error" in error
              ? String((error as { error?: unknown }).error)
              : "";
        errorMsg = msg || "Cloudinary Upload failed";
      }

      // 2. Backup to ImageKit (Secondary)
      try {
        // Sanitize category for folder name (remove special chars to avoid path issues)
        // Replace spaces with underscores for ImageKit compatibility
        const safeCategory = category.replace(/[^a-zA-Z0-9\s-_]/g, '').trim().replace(/\s+/g, '_');
        const folder = `/KhyatiGems_Backups/${safeCategory || 'Uncategorized'}`;
        
        console.log(`Starting ImageKit upload for ${uniqueFileName} to folder ${folder}`);
        
        // Debug env vars (safe logging)
        if (!process.env.IMAGEKIT_PRIVATE_KEY) console.error("IMAGEKIT_PRIVATE_KEY is missing in API route");
        
        const imageKitResult = await uploadToImageKit(buffer, uniqueFileName, folder);
        
        if (imageKitResult && imageKitResult.url) {
            imageKitUrl = imageKitResult.url;
            console.log(`ImageKit backup successful: ${imageKitUrl}`);
        } else {
            console.warn(`ImageKit upload returned no URL:`, JSON.stringify(imageKitResult));
        }
      } catch (error: unknown) {
        console.error(`ImageKit backup failed for ${file.name}:`, error);
        // Do not fail the whole request if backup fails, but log it
        const msg = error instanceof Error ? error.message : "ImageKit upload failed";
        if (!errorMsg && !cloudinaryUrl) errorMsg = "Both uploads failed: " + msg;
        // else if (errorMsg) errorMsg += " | ImageKit failed: " + error.message; 
      }

      results.push({
        fileName: file.name,
        cloudinaryUrl: cloudinaryUrl,
        backupUrl: imageKitUrl, // Renamed from googleDriveUrl
        error: errorMsg
      });
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
