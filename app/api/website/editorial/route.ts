import {
  acknowledgeEnquiry,
  ensureEnquiryEmailSchema,
} from "@/lib/website/editorial/enquiry-email";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { isSameRequestOrigin } from "@/lib/website/same-origin";
import { websiteDb, websiteEnabled } from "@/lib/website/editorial/database";
import { saveIndexObservation } from "@/lib/website/editorial/indexing";
import supportingDrafts from "@/lib/website/editorial/supporting-drafts.json";
import expandedDrafts from "@/lib/website/editorial/expanded-library-drafts.json";
import { contentSchema } from "@/lib/website/editorial/contract";
import { importReviewedRelease } from "@/lib/website/editorial/launch-release";
import { listEnquiries } from "@/lib/website/editorial/enquiries";
import {
  ensureEnquiryFollowupSchema,
  saveEnquiryFollowup,
} from "@/lib/website/editorial/enquiry-followup";
import { ensureEnquiryReferences } from "@/lib/website/editorial/enquiry-reference";
import {
  articles,
  images,
  settings,
  saveArticle,
  saveImage,
  saveSettings,
  transition,
  revisions,
  importDraftBundle,
} from "@/lib/website/editorial/store";
export const dynamic = "force-dynamic";
async function actor() {
  if (!websiteEnabled()) return null;
  const session = await auth();
  if (
    !session?.user ||
    !(await checkUserPermission(session.user.id, PERMISSIONS.SETTINGS_MANAGE))
  )
    return null;
  return session.user.id;
}
export async function GET(req: NextRequest) {
  if (!(await actor()))
    return NextResponse.json({ error: "Unavailable" }, { status: 403 });
  try {
    const id = req.nextUrl.searchParams.get("revisions");
    if (id)
      return NextResponse.json(
        { revisions: await revisions(id) },
        { headers: { "Cache-Control": "no-store" } },
      );
    const enquiryFilter = {
      page: Math.max(
        0,
        Math.min(
          100000,
          Number(req.nextUrl.searchParams.get("enquiryPage")) || 0,
        ),
      ),
      query: (req.nextUrl.searchParams.get("enquiryQuery") || "").slice(0, 200),
      status: z
        .enum(["all", "new", "resolved"])
        .catch("all")
        .parse(req.nextUrl.searchParams.get("enquiryStatus") || "all"),
      due: req.nextUrl.searchParams.get("enquiryDue") === "true",
    };
    const [entries, assets, site, enquiries, indexing, metrics] =
      await Promise.all([
        articles(),
        images(),
        settings(),
        listEnquiries(enquiryFilter),
        websiteDb().execute(
          "SELECT articleId,platform,status,evidence,checkedAt FROM WebsiteIndexObservation ORDER BY checkedAt DESC",
        ),
        websiteDb().execute(
          "SELECT day,kind,path,total FROM WebsiteUsageMetric WHERE day>=date('now','-30 days') ORDER BY day DESC LIMIT 500",
        ),
      ]);
    return NextResponse.json(
      {
        articles: entries,
        images: assets,
        settings: site,
        ...enquiries,
        indexing: indexing.rows,
        metrics: metrics.rows,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "The website content schema is not ready. Apply the website-only editorial migration.",
      },
      { status: 503 },
    );
  }
}
const writeSchema = z
  .object({
    type: z.enum([
      "article",
      "image",
      "settings",
      "transition",
      "enquiry",
      "enquiry-followup",
      "indexing",
      "import-drafts",
      "import-reviewed-release",
    ]),
    id: z.string().max(100).optional(),
    revision: z.number().int().nonnegative().optional(),
    payload: z.unknown().optional(),
    action: z
      .enum(["advance", "unpublish", "restore", "delete", "acknowledge"])
      .optional(),
    reviewerName: z.string().max(150).optional(),
    credentials: z.string().max(250).optional(),
    confirmed: z.boolean().optional(),
    restoreRevision: z.number().int().positive().optional(),
    sourceReview: contentSchema.shape.sourceReview.optional(),
    offset: z.number().int().min(0).max(100).optional(),
    status: z.enum(["new", "resolved"]).optional(),
  })
  .strict();
export async function POST(req: NextRequest) {
  if (!isSameRequestOrigin(req))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const user = await actor();
  if (!user)
    return NextResponse.json({ error: "Unavailable" }, { status: 403 });
  try {
    const raw = await req.text();
    if (Buffer.byteLength(raw) > 650000)
      return NextResponse.json(
        { error: "Content is too large" },
        { status: 413 },
      );
    const input = writeSchema.parse(JSON.parse(raw));
    let id = input.id;
    if (input.type === "import-reviewed-release") {
      if (input.confirmed !== true)
        throw new Error(
          "Confirm owner-delegated AI-assisted review before importing",
        );
      return NextResponse.json({
        ok: true,
        ...(await importReviewedRelease(user, input.offset || 0)),
      });
    }
    if (input.type === "import-drafts")
      return NextResponse.json({
        ok: true,
        imported: await importDraftBundle(
          [...supportingDrafts, ...expandedDrafts],
          user,
        ),
      });
    if (input.type === "enquiry-followup") {
      if (!input.id) throw new Error("Select an enquiry");
      await saveEnquiryFollowup(input.id, input.payload, user);
      return NextResponse.json({ ok: true });
    }
    if (input.type === "article")
      id = await saveArticle({ ...input, payload: input.payload }, user);
    else if (input.type === "image")
      id = await saveImage({ ...input, payload: input.payload }, user);
    else if (input.type === "settings")
      await saveSettings(input.payload, input.revision ?? -1, user);
    else if (input.type === "transition") {
      if (
        !input.id ||
        !input.action ||
        input.action === "delete" ||
        input.action === "acknowledge" ||
        !input.revision
      )
        throw new Error("Select an article and action");
      await transition(
        {
          ...input,
          id: input.id,
          revision: input.revision,
          action: input.action,
        },
        user,
      );
    } else if (input.type === "indexing") {
      await saveIndexObservation(input.payload, user);
    } else {
      if (input.type === "enquiry" && input.action === "acknowledge") {
        if (!input.id) throw new Error("Select an enquiry");
        return NextResponse.json({
          ok: true,
          acknowledgement: await acknowledgeEnquiry(input.id),
        });
      }
      if (input.type === "enquiry" && input.action === "delete") {
        if (!input.id || !input.confirmed)
          throw new Error("Confirm enquiry deletion");
        await ensureEnquiryFollowupSchema();
        await websiteDb().execute({
          sql: "DELETE FROM WebsiteEnquiryFollowup WHERE enquiryId=?",
          args: [input.id],
        });
        await ensureEnquiryReferences();
        await websiteDb().execute({
          sql: "DELETE FROM WebsiteEnquiryReference WHERE enquiryId=?",
          args: [input.id],
        });
        await websiteDb().execute({
          sql: "DELETE FROM WebsiteEnquiryEmail WHERE enquiryId=?",
          args: [input.id],
        });
        await websiteDb().execute({
          sql: "DELETE FROM WebsiteEnquiry WHERE id=?",
          args: [input.id],
        });
        return NextResponse.json({ ok: true });
      }
      if (!input.id || !input.status)
        throw new Error("Select an enquiry and status");
      const result = await websiteDb().execute({
        sql: "UPDATE WebsiteEnquiry SET status=? WHERE id=?",
        args: [input.status, input.id],
      });
      if (result.rowsAffected !== 1) throw new Error("Enquiry not found");
    }
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("\n")
        : error instanceof Error &&
            /changed|requires|required|Select|Confirm|content|source|review|image|SEO|article|URL|Revision|Enquiry|Already|Published|Settings/i.test(
              error.message,
            )
          ? error.message
          : "Unable to save. Check fields and try again.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
