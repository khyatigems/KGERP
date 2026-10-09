export type MarketplaceMediaFile = {
  buffer: Buffer;
  contentType: string;
  fileName: string;
};

export async function downloadMarketplaceMedia(
  rawUrl: string,
  expectedType: "IMAGE" | "VIDEO",
  maxBytes: number
): Promise<MarketplaceMediaFile> {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:") {
    throw new Error("Marketplace media must be served over HTTPS.");
  }

  const allowedHosts = new Set(["res.cloudinary.com"]);
  const imageKitEndpoint = process.env.IMAGEKIT_URL_ENDPOINT?.trim();
  if (imageKitEndpoint) {
    try {
      allowedHosts.add(new URL(imageKitEndpoint).hostname);
    } catch {
      throw new Error("IMAGEKIT_URL_ENDPOINT is invalid; marketplace media cannot be transferred.");
    }
  }
  if (!allowedHosts.has(url.hostname)) {
    throw new Error("Marketplace media must be hosted by the configured Cloudinary or ImageKit account.");
  }

  const response = await fetch(url, {
    redirect: "error",
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(`Unable to download selected marketplace media (HTTP ${response.status}).`);
  }

  const contentType = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  const validImage = ["image/jpeg", "image/png", "image/gif"].includes(contentType);
  const validVideo = ["video/mp4", "video/quicktime"].includes(contentType);
  if (expectedType === "IMAGE" ? !validImage : !validVideo) {
    throw new Error(`Selected ${expectedType.toLowerCase()} has an unsupported file type.`);
  }

  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new Error(`Selected ${expectedType.toLowerCase()} exceeds the marketplace file-size limit.`);
  }

  if (!response.body) throw new Error("Selected marketplace media returned an empty response.");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let receivedBytes = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    receivedBytes += chunk.value.byteLength;
    if (receivedBytes > maxBytes) {
      await reader.cancel();
      throw new Error(`Selected ${expectedType.toLowerCase()} exceeds the marketplace file-size limit.`);
    }
    chunks.push(chunk.value);
  }
  if (!receivedBytes) throw new Error("Selected marketplace media returned an empty file.");
  const buffer = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));

  const fileName = decodeURIComponent(url.pathname.split("/").pop() || `marketplace-${expectedType.toLowerCase()}`)
    .replace(/[^a-zA-Z0-9._-]/g, "_");
  return { buffer, contentType, fileName };
}
