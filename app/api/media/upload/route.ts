import { NextRequest, NextResponse } from 'next/server';
// This imports and configures cloudinary with env vars
import '@/lib/cloudinary';
import { v2 as cloudinary } from 'cloudinary';

// Configure API route
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Token for desktop app authentication
const DESKTOP_APP_TOKEN = 'KHYATI_MEDIA_SYNC_SECRET_2026';

export async function POST(req: NextRequest) {
  try {
    // Verify token from query parameter
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (token !== DESKTOP_APP_TOKEN) {
      return NextResponse.json(
        { error: 'Invalid or missing token' },
        { status: 401 }
      );
    }

    // Parse JSON body from desktop app
    const body = await req.json();
    const { sku, fileName, mimeType, base64Data } = body;

    // Validate required fields
    if (!sku || !fileName || !base64Data) {
      return NextResponse.json(
        { error: 'Missing required fields: sku, fileName, base64Data' },
        { status: 400 }
      );
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64');

    // Sanitize SKU and filename
    const sanitizedSku = sku.replace(/[^a-zA-Z0-9.-]/g, '_');
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');

    // Create unique filename with timestamp
    const timestamp = Date.now();
    const uniqueFileName = `${sanitizedSku}_${timestamp}_${sanitizedFileName}`;

    // Determine resource type based on mimeType
    const isVideo = mimeType?.startsWith('video/');
    const resourceType = isVideo ? 'video' : 'image';

    // Upload to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          public_id: uniqueFileName.replace(/\.[^/.]+$/, ''), // Remove extension for public_id
          folder: `KhyatiGems/SKU_${sanitizedSku}`,
          resource_type: resourceType,
          overwrite: false,
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject(error);
          } else {
            resolve(result);
          }
        }
      );

      // Write buffer to stream
      const Readable = require('stream').Readable;
      const readableStream = new Readable();
      readableStream.push(buffer);
      readableStream.push(null);
      readableStream.pipe(uploadStream);
    });

    const result = uploadResult as any;

    // Return success response
    return NextResponse.json({
      success: true,
      url: result.secure_url,
      cloudinaryUrl: result.secure_url,
      publicId: result.public_id,
      fileName: fileName,
      sku: sku,
    });

  } catch (error) {
    console.error('Media upload error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Upload failed';
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Upload failed', 
        message: errorMessage 
      },
      { status: 500 }
    );
  }
}

// Handle GET requests for testing
export async function GET(req: NextRequest) {
  return NextResponse.json({
    message: 'Media upload endpoint for Khyati Gems Desktop App',
    method: 'POST',
    requiredParams: ['token (query)', 'sku', 'fileName', 'base64Data'],
    optionalParams: ['mimeType'],
  });
}
