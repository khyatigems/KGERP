import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { isSameRequestOrigin } from "@/lib/website/same-origin";
import { websiteEnabled } from "@/lib/website/editorial/database";
import {
  settingsSchema,
  contentSchema,
} from "@/lib/website/editorial/contract";
import { publicFeed, images } from "@/lib/website/editorial/store";
import { previewCss } from "@/lib/website/editorial/preview-css";

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
    if (Buffer.byteLength(raw) > 650000)
      return NextResponse.json(
        { error: "Preview is too large" },
        { status: 413 },
      );
    const input = JSON.parse(raw);
    const [feed, assets] = await Promise.all([publicFeed(), images()]);
    let preview: unknown;
    if (input.type === "article") {
      const content = contentSchema.parse(input.payload);
      content.review = null;
      content.sourceReview = null;
      preview = {type:"article",article:{...content,id:"private-draft",revision:0,publishedAt:"",updatedAt:"",images:assets.filter(asset=>content.imageIds.includes(asset.id))}};
    } else {
      const settings = settingsSchema.parse(input);
      const homepageMedia = assets.filter((asset) =>
        [
          settings.heroImageId,
          settings.heroVideoId,
          ...settings.heroGalleryIds,
          settings.brandImageId,
          ...settings.galleryImageIds,
        ].includes(asset.id),
      );
      preview = {type:"homepage",feed:{...feed,settings,homepageMedia}};
    }
    return NextResponse.json(
      { preview, css:previewCss },
      {
        headers: {
          "Cache-Control": "no-store",
          "X-Robots-Tag": "noindex, nofollow",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { error: "Check homepage settings or the content connection." },
      { status: 400 },
    );
  }
}
