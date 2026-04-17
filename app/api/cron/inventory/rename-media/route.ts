import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type CloudinaryRenameResult = { secure_url?: string };

type MediaRow = {
  id: string;
  mediaUrl: string;
  type: string;
  inventory: { id: string; sku: string };
};

function extractCloudinaryPublicId(originalUrl: string) {
  const urlObj = new URL(originalUrl);
  const parts = urlObj.pathname.split("/");
  const uploadIndex = parts.findIndex((p) => p === "upload");
  if (uploadIndex === -1) return null;

  const afterUpload = parts.slice(uploadIndex + 1);
  const withoutVersion = afterUpload[0] && /^v[0-9]+$/.test(afterUpload[0]) ? afterUpload.slice(1) : afterUpload;
  const publicIdWithExt = withoutVersion.join("/");
  const publicId = publicIdWithExt.replace(/\.[^/.]+$/, "");
  return publicId || null;
}

function isAlreadyRenamed(publicId: string, targetBase: string) {
  const last = publicId.split("/").pop() || "";
  return last === targetBase || last.startsWith(`${targetBase}_`);
}

async function renameCloudinaryResource(params: {
  originalUrl: string;
  toPublicId: string;
}) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return { ok: false as const, reason: "missing_cloudinary_env" };
  }

  const fromPublicId = extractCloudinaryPublicId(params.originalUrl);
  if (!fromPublicId) return { ok: false as const, reason: "not_cloudinary_url" };

  const urlObj = new URL(params.originalUrl);
  const isVideo = urlObj.pathname.includes("/video/upload/") || params.originalUrl.match(/\.(mp4|mov|webm)$/i) != null;
  const resourceType = isVideo ? "video" : "image";

  if (isAlreadyRenamed(fromPublicId, params.toPublicId)) {
    return { ok: true as const, secureUrl: params.originalUrl, skipped: true as const };
  }

  const authHeader = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
  const body = new URLSearchParams({
    from_public_id: fromPublicId,
    to_public_id: params.toPublicId,
    overwrite: "true",
  });

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/resources/${resourceType}/upload`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${authHeader}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const json = (await response.json()) as CloudinaryRenameResult;
  if (!response.ok) {
    return { ok: false as const, reason: "cloudinary_error", details: json };
  }

  return { ok: true as const, secureUrl: json.secure_url || params.originalUrl, skipped: false as const };
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const provided = request.nextUrl.searchParams.get("secret") || request.headers.get("x-cron-secret") || "";
    if (provided !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const batchSize = Math.min(50, Math.max(1, Number(request.nextUrl.searchParams.get("limit") || 20)));

  const rows = (await prisma.inventoryMedia.findMany({
    where: {
      mediaUrl: { contains: "res.cloudinary.com" },
    },
    orderBy: [{ inventoryId: "asc" }, { createdAt: "asc" }],
    take: batchSize,
    select: {
      id: true,
      mediaUrl: true,
      type: true,
      inventory: { select: { id: true, sku: true } },
    },
  })) as unknown as MediaRow[];

  let processed = 0;
  let renamed = 0;
  let skipped = 0;
  const errors: Array<{ id: string; reason: string }> = [];

  const perInventoryCounter = new Map<string, number>();

  for (const m of rows) {
    processed += 1;
    const count = (perInventoryCounter.get(m.inventory.id) || 0) + 1;
    perInventoryCounter.set(m.inventory.id, count);

    const targetPublicId = count === 1 ? m.inventory.sku : `${m.inventory.sku}_${count}`;

    try {
      const res = await renameCloudinaryResource({ originalUrl: m.mediaUrl, toPublicId: targetPublicId });
      if (!res.ok) {
        errors.push({ id: m.id, reason: res.reason });
        continue;
      }

      if (res.skipped) {
        skipped += 1;
        continue;
      }

      if (res.secureUrl && res.secureUrl !== m.mediaUrl) {
        await prisma.inventoryMedia.update({ where: { id: m.id }, data: { mediaUrl: res.secureUrl } });
      }
      renamed += 1;
    } catch (e) {
      errors.push({ id: m.id, reason: e instanceof Error ? e.message : "unknown" });
    }
  }

  return NextResponse.json({ success: true, processed, renamed, skipped, errors });
}
