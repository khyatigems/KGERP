import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { isSameRequestOrigin } from "@/lib/website/same-origin";
import { websiteDb, websiteEnabled } from "@/lib/website/editorial/database";
import { consumeLimit } from "@/lib/website/editorial/store";
import { imageSchema } from "@/lib/website/editorial/contract";
export const runtime = "nodejs";
const schema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("sign"),
      mediaType: z.enum(["image", "video"]),
      size: z.number().int().positive(),
    })
    .strict(),
  z
    .object({ action: z.literal("complete"), grantId: z.string().uuid() })
    .strict(),
]);
export async function POST(req: NextRequest) {
  const session = await auth();
  if (
    !websiteEnabled() ||
    !isSameRequestOrigin(req) ||
    !session?.user ||
    !(await checkUserPermission(session.user.id, PERMISSIONS.SETTINGS_MANAGE))
  )
    return NextResponse.json({ error: "Unavailable" }, { status: 403 });
  try {
    const raw = await req.text();
    if (raw.length > 2000)
      return NextResponse.json({ error: "Request too large" }, { status: 413 });
    const input = schema.parse(JSON.parse(raw));
    const cloud =
      process.env.CLOUDINARY_CLOUD_NAME ||
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const key = process.env.CLOUDINARY_API_KEY,
      secret = process.env.CLOUDINARY_API_SECRET;
    if (!cloud || !key || !secret)
      return NextResponse.json(
        { error: "Configure the existing ERP Cloudinary connection." },
        { status: 503 },
      );
    cloudinary.config({
      cloud_name: cloud,
      api_key: key,
      api_secret: secret,
      secure: true,
    });
    const actor = session.user.id,
      db = websiteDb();
    if (input.action === "sign") {
      const max = (input.mediaType === "video" ? 100 : 10) * 1024 * 1024;
      if (input.size > max)
        return NextResponse.json(
          { error: "Use images up to 10 MB or videos up to 100 MB." },
          { status: 400 },
        );
      if (!(await consumeLimit(`media:${actor}`, 40, 3600)))
        return NextResponse.json(
          { error: "Upload limit reached. Try later." },
          { status: 429 },
        );
      const id = randomUUID(),
        publicId = `website/editorial/${id}`;
      const params = {
        timestamp: Math.floor(Date.now() / 1000),
        public_id: publicId,
        overwrite: false,
        allowed_formats:
          input.mediaType === "video" ? "mp4,webm,mov" : "jpg,jpeg,png,webp",
      };
      await db.execute({
        sql: "INSERT INTO WebsiteUploadGrant(id,actor,publicId,mediaType,expiresAt) VALUES(?,?,?,?,?)",
        args: [id, actor, publicId, input.mediaType, Date.now() + 3600000],
      });
      return NextResponse.json(
        {
          grantId: id,
          endpoint: `https://api.cloudinary.com/v1_1/${cloud}/${input.mediaType}/upload`,
          fields: {
            ...params,
            api_key: key,
            signature: cloudinary.utils.api_sign_request(params, secret),
          },
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    const grant = (
      await db.execute({
        sql: "SELECT * FROM WebsiteUploadGrant WHERE id=? AND actor=?",
        args: [input.grantId, actor],
      })
    ).rows[0];
    if (!grant || Number(grant.expiresAt) < Date.now())
      return NextResponse.json(
        { error: "Upload authorization expired." },
        { status: 400 },
      );
    if (grant.completedId)
      return NextResponse.json({ id: String(grant.completedId) });
    const type = String(grant.mediaType) as "image" | "video";
    const resource = await cloudinary.api.resource(String(grant.publicId), {
      resource_type: type,
    });
    if (
      resource.public_id !== grant.publicId ||
      resource.resource_type !== type ||
      resource.bytes > (type === "video" ? 100 : 10) * 1024 * 1024 ||
      !(
        type === "video"
          ? ["mp4", "webm", "mov"]
          : ["jpg", "jpeg", "png", "webp"]
      ).includes(resource.format)
    )
      throw new Error("Uploaded media did not meet requirements");
    const poster =
      type === "video"
        ? cloudinary.url(String(grant.publicId), {
            resource_type: "video",
            format: "jpg",
            secure: true,
            transformation: [{ width: 640, crop: "limit", start_offset: "0" }],
          })
        : resource.secure_url;
    const payload = imageSchema.parse({
      title: "New website " + type,
      url: resource.secure_url,
      posterUrl: poster,
      mediaType: type,
      cloudinaryPublicId: String(grant.publicId),
      width: resource.width || 0,
      height: resource.height || 0,
      duration: resource.duration || 0,
    });
    const tx = await db.transaction("write");
    try {
      const id = input.grantId,
        now = new Date().toISOString();
      const claimed = await tx.execute({
        sql: "UPDATE WebsiteUploadGrant SET completedId=? WHERE id=? AND completedId IS NULL",
        args: [id, input.grantId],
      });
      if (claimed.rowsAffected === 1) {
        await tx.execute({
          sql: "INSERT INTO WebsiteImageRights(id,payload,updatedAt) VALUES(?,?,?)",
          args: [id, JSON.stringify(payload), now],
        });
        await tx.execute({
          sql: "INSERT INTO WebsiteEditorialAudit(id,entityId,action,actor,payload,createdAt) VALUES(?,?,?,?,?,?)",
          args: [
            randomUUID(),
            id,
            "upload",
            actor,
            JSON.stringify({ mediaType: type, publicId: grant.publicId }),
            now,
          ],
        });
      }
      await tx.commit();
      return NextResponse.json({
        id,
        notice:
          "Uploaded to the website library. Complete captions and rights before publication.",
      });
    } catch (error) {
      await tx.rollback();
      throw error;
    } finally {
      tx.close();
    }
  } catch {
    return NextResponse.json(
      {
        error:
          "Upload could not be verified. Check the file and Cloudinary connection, then retry.",
      },
      { status: 400 },
    );
  }
}
