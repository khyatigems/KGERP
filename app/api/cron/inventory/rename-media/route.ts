import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { createHash } from "crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type CloudinaryTagsResult = { public_ids?: string[]; error?: { message?: string } };

type MediaRow = {
  id: string;
  mediaUrl: string;
  type: string;
  inventoryId: string;
};

function extractCloudinaryPublicId(originalUrl: string) {
  let urlObj: URL;
  try {
    urlObj = new URL(originalUrl);
  } catch {
    return null;
  }
  const parts = urlObj.pathname.split("/");
  const uploadIndex = parts.findIndex((p) => p === "upload");
  if (uploadIndex === -1) return null;

  const afterUpload = parts.slice(uploadIndex + 1);
  const withoutVersion = afterUpload[0] && /^v[0-9]+$/.test(afterUpload[0]) ? afterUpload.slice(1) : afterUpload;
  const publicIdWithExt = withoutVersion.join("/");
  const publicId = publicIdWithExt.replace(/\.[^/.]+$/, "");
  return publicId || null;
}

function toSkuTag(sku: string) {
  // Cloudinary tag naming: keep it simple, searchable and stable.
  // Replace non-alphanumeric with underscore.
  return `sku_${sku.replace(/[^a-zA-Z0-9]+/g, "_")}`;
}

function signCloudinaryParams(params: Record<string, string>, apiSecret: string) {
  const toSign = Object.keys(params)
    .filter((k) => params[k] !== "" && params[k] != null)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(toSign + apiSecret).digest("hex");
}

async function addCloudinaryTag(params: {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  resourceType: "image" | "video";
  tag: string;
  publicIds: string[];
}) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = signCloudinaryParams(
    {
      command: "add",
      public_ids: params.publicIds.join(","),
      tag: params.tag,
      timestamp,
      type: "upload",
    },
    params.apiSecret
  );

  const body = new URLSearchParams();
  body.set("command", "add");
  body.set("tag", params.tag);
  body.set("type", "upload");
  body.set("timestamp", timestamp);
  body.set("api_key", params.apiKey);
  body.set("signature", signature);
  // Cloudinary accepts repeated public_ids[] keys.
  for (const pid of params.publicIds) body.append("public_ids[]", pid);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${params.cloudName}/${params.resourceType}/tags`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const json = (await response.json().catch(() => ({}))) as CloudinaryTagsResult;
  if (!response.ok) {
    return {
      ok: false as const,
      reason: "cloudinary_error",
      message: json?.error?.message || "Cloudinary tags request failed",
      details: json,
    };
  }

  return { ok: true as const, tagged: json.public_ids || [] };
}

function detectResourceType(originalUrl: string): "image" | "video" {
  try {
    const u = new URL(originalUrl);
    if (u.pathname.includes("/video/upload/")) return "video";
  } catch {
    // ignore
  }
  return originalUrl.match(/\.(mp4|mov|webm|mp3|wav)$/i) ? "video" : "image";
}

function validateCloudName(params: { originalUrl: string; cloudName: string }) {
  try {
    const u = new URL(params.originalUrl);
    if (u.hostname === "res.cloudinary.com") {
      const urlCloud = u.pathname.split("/").filter(Boolean)[0] || "";
      if (urlCloud && urlCloud !== params.cloudName) {
        return {
          ok: false as const,
          reason: "cloud_name_mismatch",
          message: `URL cloud '${urlCloud}' does not match configured CLOUDINARY_CLOUD_NAME '${params.cloudName}'`,
        };
      }
    }
  } catch {
    // ignore
  }
  return { ok: true as const };
}

async function tagCloudinaryResource(params: { originalUrl: string; sku: string }) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return { ok: false as const, reason: "missing_cloudinary_env" };
  }

  const cloudCheck = validateCloudName({ originalUrl: params.originalUrl, cloudName });
  if (!cloudCheck.ok) return cloudCheck;

  const publicId = extractCloudinaryPublicId(params.originalUrl);
  if (!publicId) return { ok: false as const, reason: "not_cloudinary_url" };

  const resourceType = detectResourceType(params.originalUrl);
  const tag = toSkuTag(params.sku);
  return addCloudinaryTag({
    cloudName,
    apiKey,
    apiSecret,
    resourceType,
    tag,
    publicIds: [publicId],
  });
}

export async function GET(request: NextRequest) {
  try {
    const secret = process.env.CRON_SECRET;
    const provided = request.nextUrl.searchParams.get("secret") || request.headers.get("x-cron-secret") || "";
    const secretOk = !!secret && provided === secret;

    if (!secretOk) {
      const session = await auth();
      const userId = session?.user?.id;
      if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const canManage = await checkUserPermission(userId, PERMISSIONS.INVENTORY_EDIT);
      if (!canManage) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const batchSize = Math.min(500, Math.max(1, Number(request.nextUrl.searchParams.get("limit") || 200)));
    const inventoryId = (request.nextUrl.searchParams.get("inventoryId") || "").trim();
    const cleanupOrphans = (request.nextUrl.searchParams.get("cleanupOrphans") || "").trim() === "1";

    const where = {
      mediaUrl: { contains: "res.cloudinary.com" },
      ...(inventoryId ? { inventoryId } : {}),
    } as const;

    const totalCandidates = await prisma.inventoryMedia.count({ where });

    const rows = (await prisma.inventoryMedia.findMany({
      where,
      orderBy: [{ inventoryId: "asc" }, { createdAt: "asc" }],
      take: batchSize,
      select: {
        id: true,
        mediaUrl: true,
        type: true,
        inventoryId: true,
      },
    })) as unknown as MediaRow[];

    const inventoryIds = Array.from(new Set(rows.map((r) => r.inventoryId).filter(Boolean)));
    const inventoryRows = await prisma.inventory.findMany({
      where: { id: { in: inventoryIds } },
      select: { id: true, sku: true },
    });
    const skuByInventoryId = new Map(inventoryRows.map((r) => [r.id, r.sku]));

    const orphanMediaIds = rows.filter((r) => !skuByInventoryId.has(r.inventoryId)).map((r) => r.id);
    if (cleanupOrphans && orphanMediaIds.length > 0) {
      const del = await prisma.inventoryMedia.deleteMany({
        where: {
          id: { in: orphanMediaIds },
        },
      });

      return NextResponse.json({
        success: true,
        cleaned: true,
        deletedOrphans: del.count,
        totalCandidates,
        returned: rows.length,
        orphaned: orphanMediaIds.length,
      });
    }

    const perInventoryCounter = new Map<string, number>();
    const skuReport = new Map<
      string,
      {
        inventoryId: string;
        sku: string;
        attempted: number;
        tagged: number;
        failed: number;
        failures: Array<{ mediaId: string; mediaUrl: string; reason: string; message?: string }>;
      }
    >();

    const upsertSku = (invId: string, sku: string) => {
      const existing = skuReport.get(sku);
      if (existing) return existing;
      const next = {
        inventoryId: invId,
        sku,
        attempted: 0,
        tagged: 0,
        failed: 0,
        failures: [] as Array<{ mediaId: string; mediaUrl: string; reason: string; message?: string }>,
      };
      skuReport.set(sku, next);
      return next;
    };

    let processed = 0;
    let tagged = 0;
    let failed = 0;
    let orphaned = 0;

    for (const m of rows) {
      processed += 1;
      const sku = skuByInventoryId.get(m.inventoryId);
      if (!sku) {
        const orphanSkuKey = `ORPHAN:${m.inventoryId}`;
        const orphanEntry = upsertSku(m.inventoryId, orphanSkuKey);
        orphanEntry.attempted += 1;
        orphanEntry.failed += 1;
        orphanEntry.failures.push({
          mediaId: m.id,
          mediaUrl: m.mediaUrl,
          reason: "orphan_inventory",
          message: "Inventory row not found for inventoryMedia.inventoryId",
        });
        failed += 1;
        orphaned += 1;
        continue;
      }

      const skuEntry = upsertSku(m.inventoryId, sku);
      skuEntry.attempted += 1;

      try {
        const res = await tagCloudinaryResource({ originalUrl: m.mediaUrl, sku });
        if (!res.ok) {
          failed += 1;
          skuEntry.failed += 1;
          skuEntry.failures.push({
            mediaId: m.id,
            mediaUrl: m.mediaUrl,
            reason: res.reason,
            message: (res as unknown as { message?: string }).message,
          });
          continue;
        }

        tagged += 1;
        skuEntry.tagged += 1;
      } catch (e) {
        failed += 1;
        skuEntry.failed += 1;
        skuEntry.failures.push({
          mediaId: m.id,
          mediaUrl: m.mediaUrl,
          reason: "exception",
          message: e instanceof Error ? e.message : "unknown",
        });
      }
    }

    const skuItems = Array.from(skuReport.values()).sort((a, b) => a.sku.localeCompare(b.sku));
    return NextResponse.json({
      success: true,
      limit: batchSize,
      totalCandidates,
      returned: rows.length,
      processed,
      tagged,
      failed,
      orphaned,
      orphanMediaIds,
      skuItems,
    });
  } catch (e) {
    console.error("rename-media route error:", e);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: e instanceof Error ? e.message : "unknown",
      },
      { status: 500 }
    );
  }
}
