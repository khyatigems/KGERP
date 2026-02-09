import ImageKit from "@imagekit/nodejs";

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY || "",
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "",
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || "",
});

export async function uploadToImageKit(
  fileBuffer: Buffer,
  fileName: string,
  folder: string = "/KhyatiGems_Backups"
) {
  try {
    const response = await imagekit.upload({
      file: fileBuffer, // required
      fileName: fileName, // required
      folder: folder, // optional
      useUniqueFileName: false, // We handle uniqueness in our logic if needed, or let ImageKit do it
    });

    return response;
  } catch (error) {
    console.error("ImageKit Upload Error:", error);
    throw error;
  }
}

export default imagekit;
