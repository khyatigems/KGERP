import { NextRequest, NextResponse } from 'next/server';
import { uploadToCloudinary } from '@/lib/cloudinary';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('file') as File[];
    const sku = formData.get('sku') as string || 'temp'; // Optional SKU for naming
    
    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const results = [];

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      
      let cloudinaryUrl = null;
      let errorMsg = null;

      try {
        // Sanitize SKU to remove spaces and special chars
        const sanitizedSku = sku !== 'temp' ? sku.replace(/[^a-zA-Z0-9.-]/g, '_') : '';
        
        // Sanitize filename to remove spaces and special chars
        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        
        // Construct unique filename: SKU_Timestamp_Filename
        // Ensure total length doesn't exceed Cloudinary limit (255 chars)
        // Timestamp is ~13 chars. Reserve some space.
        const timestamp = Date.now();
        const prefix = sanitizedSku ? `${sanitizedSku}_${timestamp}_` : `${timestamp}_`;
        
        // Truncate filename if needed to fit within limit (leaving room for folder 'inventory/')
        // 'inventory/' is 10 chars. Limit safe margin to ~200 chars for the name.
        const maxNameLength = 200 - prefix.length;
        const truncatedFileName = sanitizedFileName.length > maxNameLength 
          ? sanitizedFileName.substring(0, maxNameLength) + (sanitizedFileName.includes('.') ? sanitizedFileName.substring(sanitizedFileName.lastIndexOf('.')) : '')
          : sanitizedFileName;

        const uniqueFileName = `${prefix}${truncatedFileName}`;
        
        console.log(`Starting upload for ${uniqueFileName}, size: ${file.size} bytes`);
        
        cloudinaryUrl = await uploadToCloudinary(buffer, uniqueFileName);
        console.log(`Upload successful: ${cloudinaryUrl}`);
      } catch (error: any) {
        console.error(`Cloudinary upload failed for ${file.name}:`, error);
        // Extract detailed error message from Cloudinary error object if available
        errorMsg = error.message || error.error?.message || JSON.stringify(error) || "Upload failed";
      }

      results.push({
        fileName: file.name,
        cloudinaryUrl: cloudinaryUrl,
        error: errorMsg
      });
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
