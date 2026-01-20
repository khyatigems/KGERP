import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadToCloudinary(fileBuffer: Buffer, fileName: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'auto',
        public_id: fileName.replace(/\.[^/.]+$/, ""), // Remove extension
        folder: 'inventory', // Optional: organize in folder
      },
      (error, result) => {
        if (error) {
          console.error("Cloudinary upload error:", error);
          reject(error);
        } else {
          resolve(result?.secure_url || "");
        }
      }
    );

    uploadStream.end(fileBuffer);
  });
}

export async function renameCloudinaryImage(originalUrl: string, newPublicId: string) {
    // Existing logic in actions.ts can be moved here, but for now we'll keep it there or reuse this.
    // ...
    console.log("Not implemented", originalUrl, newPublicId);
}
