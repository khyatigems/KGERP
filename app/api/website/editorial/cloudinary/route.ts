import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { websiteEnabled } from "@/lib/website/editorial/database";
import { images, saveImage, consumeLimit } from "@/lib/website/editorial/store";
import { imageSchema } from "@/lib/website/editorial/contract";
import { isSameRequestOrigin } from "@/lib/website/same-origin";
async function access() {
  const session = await auth();
  if (
    !websiteEnabled() ||
    !session?.user ||
    !(await checkUserPermission(session.user.id, PERMISSIONS.SETTINGS_MANAGE))
  )
    return null;
  const cloud =
    process.env.CLOUDINARY_CLOUD_NAME ||
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (
    !cloud ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  )
    return null;
  cloudinary.config({
    cloud_name: cloud,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  return session.user.id;
}
export async function GET(req: NextRequest) {
  const actor = await access();
  if (!actor)
    return NextResponse.json(
      { error: "Cloudinary access unavailable" },
      { status: 403 },
    );
  if (!(await consumeLimit("cloudinary-list:" + actor, 60, 3600)))
    return NextResponse.json({ error: "Try later" }, { status: 429 });
  try {
    const mediaType =
      req.nextUrl.searchParams.get("type") === "video" ? "video" : "image";
    const cursor = req.nextUrl.searchParams.get("cursor");
    if (cursor && cursor.length > 1500) throw new Error();
    const result = await cloudinary.api.resources({
      type: "upload",
      resource_type: mediaType,
      max_results: 40,
      ...(cursor ? { next_cursor: cursor } : {}),
    });
    return NextResponse.json(
      {
        assets: result.resources.map(
          (asset: {
            public_id: string;
            asset_folder?: string;
            secure_url: string;
            width?: number;
            height?: number;
          }) => ({
            publicId: asset.public_id,
            folder:
              asset.asset_folder ||
              asset.public_id.split("/").slice(0, -1).join("/"),
            url: asset.secure_url,
            thumbnail:
              mediaType === "video"
                ? cloudinary.url(asset.public_id, {
                    resource_type: "video",
                    format: "jpg",
                    secure: true,
                    transformation: [
                      { start_offset: 0, width: 320, crop: "limit" },
                    ],
                  })
                : cloudinary.url(asset.public_id, {
                    secure: true,
                    transformation: [
                      {
                        width: 320,
                        crop: "limit",
                        quality: "auto",
                        fetch_format: "auto",
                      },
                    ],
                  }),
            mediaType,
          }),
        ),
        cursor: result.next_cursor || "",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Could not list existing Cloudinary assets." },
      { status: 503 },
    );
  }
}
export async function POST(req: NextRequest) {
  if (!isSameRequestOrigin(req))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const actor = await access();
  if (!actor)
    return NextResponse.json({ error: "Unavailable" }, { status: 403 });
  try {
    const raw = await req.text();
    if (raw.length > 1500) throw new Error();
    const input = z
      .object({
        publicId: z.string().min(1).max(250),
        mediaType: z.enum(["image", "video"]),
      })
      .strict()
      .parse(JSON.parse(raw));
    if (!(await consumeLimit("cloudinary-import:" + actor, 40, 3600)))
      return NextResponse.json({ error: "Try later" }, { status: 429 });
    const existing = (await images()).find(
      (asset) =>
        asset.cloudinaryPublicId === input.publicId &&
        asset.mediaType === input.mediaType,
    );
    if (existing) return NextResponse.json({ id: existing.id });
    const asset = await cloudinary.api.resource(input.publicId, {
      resource_type: input.mediaType,
      type: "upload",
    });
    if (
      asset.public_id !== input.publicId ||
      asset.resource_type !== input.mediaType ||
      !/^https:\/\/res\.cloudinary\.com\//.test(asset.secure_url)
    )
      throw new Error();
    const payload = imageSchema.parse({
      title: input.publicId.split("/").pop(),
      cloudinaryPublicId: input.publicId,
      mediaType: input.mediaType,
      url: asset.secure_url,
      width: asset.width || 0,
      height: asset.height || 0,
      duration: asset.duration || 0,
      posterUrl:
        input.mediaType === "video"
          ? cloudinary.url(input.publicId, {
              resource_type: "video",
              format: "jpg",
              secure: true,
              transformation: [{ start_offset: 0 }],
            })
          : "",
      status: "pending",
    });
    return NextResponse.json({ id: await saveImage({ payload }, actor) });
  } catch {
    return NextResponse.json(
      { error: "Could not add that asset for permission review." },
      { status: 400 },
    );
  }
}
