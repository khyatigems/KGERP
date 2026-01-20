import { NextRequest, NextResponse } from 'next/server';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { uploadToGoogleDrive, findOrCreateFolder } from '@/lib/google-drive';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('file') as File[];
    const sku = formData.get('sku') as string || 'temp'; // Optional SKU for folder/naming
    const category = formData.get('category') as string;

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const results = [];

    // Determine target folder based on Category
    // The requirement is: [Root Upload Directory]/[Category Name]/[Image Files]
    // So we prefer Category folder over SKU folder.
    
    let folderId: string | undefined | null = undefined;
    
    if (category) {
         folderId = await findOrCreateFolder(category);
    } else {
         // Fallback if no category provided
         folderId = await findOrCreateFolder('_Uncategorized_Uploads');
    }

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      
      // Upload to Cloudinary
      const cloudinaryUrl = await uploadToCloudinary(buffer, file.name);

      // Upload to Google Drive
      // Note: We upload asynchronously to speed up response? 
      // Or await to ensure sync? User wants "sync status", so await is safer.
      let driveFileId = null;
      let driveErrorMsg = null;
      try {
        const driveFileName = sku !== 'temp' ? `${sku}_${file.name}` : file.name;
        // Pass the determined folderId (if any)
        const driveFile = await uploadToGoogleDrive(buffer, driveFileName, file.type, folderId || undefined);
        if (driveFile && driveFile.id) {
            driveFileId = driveFile.id;
        } else {
            driveErrorMsg = "Upload returned no ID (check credentials)";
        }
      } catch (driveError: unknown) {
        console.error(`Google Drive upload failed for ${file.name}:`, driveError);
        
        const error = driveError as { message?: string };
        // Detailed error message for user
        if (error.message && error.message.includes("quota")) {
             driveErrorMsg = "Quota exceeded. For Service Accounts, you MUST use a Shared Drive (Team Drive) or share a folder from a paid Workspace account.";
        } else if (error.message && error.message.includes("supportsAllDrives")) {
             driveErrorMsg = "Shared Drive support missing. (Fixed in backend, please retry).";
        } else {
             driveErrorMsg = (driveError as Error).message || "Unknown Drive error";
        }
      }

      results.push({
        fileName: file.name,
        cloudinaryUrl,
        driveFileId,
        driveError: driveErrorMsg
      });
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
