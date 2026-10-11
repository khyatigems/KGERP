import sharp from "sharp";

export async function normalizeEbayReviewImage(buffer: Buffer): Promise<Buffer> {
  if (!buffer.length || buffer.length > 4 * 1024 * 1024) throw new Error("Choose an image up to 4 MB.");
  const jpeg = buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  const png = buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const webp = buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  if (!jpeg && !png && !webp) throw new Error("Choose a JPEG, PNG or WebP photo.");
  const image = sharp(buffer, { limitInputPixels: 40000000 });
  const metadata = await image.metadata();
  if (!["jpeg", "png", "webp"].includes(metadata.format || "") || (metadata.pages || 1) > 1) throw new Error("Choose a JPEG, PNG or WebP photo.");
  if (Math.max(metadata.width || 0, metadata.height || 0) < 500) throw new Error("eBay photos must be at least 500 pixels on the longest side.");
  return image.rotate().resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true }).flatten({ background: "#ffffff" }).jpeg({ quality: 92 }).toBuffer();
}
