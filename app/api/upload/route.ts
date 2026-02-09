import { NextRequest, NextResponse } from 'next/server';
import { uploadToCloudinary } from '@/lib/cloudinary';
import fs from 'fs';
import path from 'path';

// Define the base directory for local uploads.
// You can change this to an absolute path like 'D:/KhyatiGems_Images' or use an environment variable.
const LOCAL_UPLOAD_BASE_DIR = process.env.LOCAL_UPLOAD_DIR || 'C:\\KhyatiGems_Images';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('file') as File[];
    const sku = formData.get('sku') as string || 'temp'; // Optional SKU for naming
    const category = formData.get('category') as string || 'Uncategorized'; // Category for folder structure
    
    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    // Ensure the base directory exists
    if (!fs.existsSync(LOCAL_UPLOAD_BASE_DIR)) {
      try {
        fs.mkdirSync(LOCAL_UPLOAD_BASE_DIR, { recursive: true });
      } catch (err) {
        console.error('Failed to create local base directory:', err);
      }
    }

    const results = [];

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      
      let cloudinaryUrl = null;
      let localFilePath = null;
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

      // 1. Upload to Cloudinary
      try {
        console.log(`Starting upload for ${uniqueFileName}, size: ${file.size} bytes`);
        cloudinaryUrl = await uploadToCloudinary(buffer, uniqueFileName);
        console.log(`Cloudinary upload successful: ${cloudinaryUrl}`);
      } catch (error: any) {
        console.error(`Cloudinary upload failed for ${file.name}:`, error);
        errorMsg = error.message || error.error?.message || JSON.stringify(error) || "Cloudinary Upload failed";
      }

      // 2. Save to Local Storage (Hard Drive)
      try {
        const categoryDir = path.join(LOCAL_UPLOAD_BASE_DIR, category);
        
        // Create category directory if it doesn't exist
        if (!fs.existsSync(categoryDir)) {
          fs.mkdirSync(categoryDir, { recursive: true });
        }

        const fullLocalPath = path.join(categoryDir, uniqueFileName);
        fs.writeFileSync(fullLocalPath, buffer);
        localFilePath = fullLocalPath;
        console.log(`Local save successful: ${localFilePath}`);
      } catch (error: any) {
        console.error(`Local save failed for ${file.name}:`, error);
        // We don't fail the whole request if local save fails, but we log it.
        if (!errorMsg) errorMsg = "Local Save failed: " + error.message;
        else errorMsg += " | Local Save failed: " + error.message;
      }

      results.push({
        fileName: file.name,
        cloudinaryUrl: cloudinaryUrl,
        localPath: localFilePath,
        error: errorMsg
      });
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
