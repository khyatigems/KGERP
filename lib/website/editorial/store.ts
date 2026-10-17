import { randomUUID } from "node:crypto";
import type { Client, Transaction } from "@libsql/client";
import {
  contentSchema,
  defaultSettings,
  imageSchema,
  imageIssues,
  publicationIssues,
  settingsSchema,
  stages,
  type Content,
  type ImageAsset,
  type PublicArticle,
  type PublicFeed,
  type Stage,
} from "./contract";
import { websiteDb } from "./database";
import { contentReviewHash, validSourceReview } from "./source-review";

type DB = Client | Transaction;
export interface ArticleRecord {
  id: string;
  kind: string;
  slug: string;
  payload: Content;
  stage: Stage;
  revision: number;
  publishedRevision: number | null;
  publishedAt: string | null;
  updatedAt: string;
}
const timestamp = () => new Date().toISOString();
const decode = (r: Record<string, unknown>): ArticleRecord => ({
  id: String(r.id),
  kind: String(r.kind),
  slug: String(r.slug),
  payload: contentSchema.parse(JSON.parse(String(r.payload))),
  stage: r.stage as Stage,
  revision: Number(r.revision),
  publishedRevision: r.publishedRevision ? Number(r.publishedRevision) : null,
  publishedAt: r.publishedAt ? String(r.publishedAt) : null,
  updatedAt: String(r.updatedAt),
});
export async function articles(db: DB = websiteDb()) {
  const rows = await db.execute(
    "SELECT id,kind,slug,payload,stage,revision,publishedRevision,publishedAt,updatedAt FROM WebsiteArticle ORDER BY updatedAt DESC",
  );
  return rows.rows.map((row) => decode(row));
}
export async function images(db: DB = websiteDb()): Promise<ImageAsset[]> {
  const rows = await db.execute(
    "SELECT id,payload,revision FROM WebsiteImageRights ORDER BY updatedAt DESC",
  );
  return rows.rows.map((row) => ({
    ...imageSchema.parse(JSON.parse(String(row.payload))),
    id: String(row.id),
    revision: Number(row.revision),
  }));
}
export async function settings(db: DB = websiteDb()) {
  const row = (
    await db.execute(
      "SELECT payload,revision FROM WebsiteEditorialSettings WHERE id='site'",
    )
  ).rows[0];
  return {
    payload: row
      ? settingsSchema.parse(JSON.parse(String(row.payload)))
      : defaultSettings,
    revision: row ? Number(row.revision) : 0,
  };
}
async function audit(
  db: DB,
  entityId: string,
  action: string,
  actor: string,
  payload: unknown,
) {
  await db.execute({
    sql: "INSERT INTO WebsiteEditorialAudit(id,entityId,action,actor,payload,createdAt) VALUES(?,?,?,?,?,?)",
    args: [
      randomUUID(),
      entityId,
      action,
      actor,
      JSON.stringify(payload),
      timestamp(),
    ],
  });
}
async function transaction<T>(fn: (db: Transaction) => Promise<T>) {
  const tx = await websiteDb().transaction("write");
  try {
    const result = await fn(tx);
    await tx.commit();
    return result;
  } catch (error) {
    await tx.rollback();
    throw error;
  } finally {
    tx.close();
  }
}
export async function saveArticle(
  input: { id?: string; revision?: number; payload: unknown },
  actor: string,
) {
  const parsed = contentSchema.parse(input.payload);
  // Any content edit invalidates draft approval. The last approved publication stays intact.
  parsed.review = null;
  parsed.sourceReview = null;
  return transaction(async (tx) => {
    const id = input.id || randomUUID();
    if (input.id) {
      const row = (
        await tx.execute({
          sql: "SELECT kind,slug,publishedAt, EXISTS(SELECT 1 FROM WebsiteArticleRevision WHERE articleId=WebsiteArticle.id AND stage='published') AS everPublished FROM WebsiteArticle WHERE id=?",
          args: [id],
        })
      ).rows[0];
      if (
        (row?.publishedAt || row?.everPublished) &&
        (row.slug !== parsed.slug || row.kind !== parsed.kind)
      )
        throw new Error(
          "Published URLs are stable. Create a replacement and an explicit redirect to change one.",
        );
      const result = await tx.execute({
        sql: "UPDATE WebsiteArticle SET kind=?,slug=?,payload=?,stage='draft',revision=revision+1,updatedAt=? WHERE id=? AND revision=?",
        args: [
          parsed.kind,
          parsed.slug,
          JSON.stringify(parsed),
          timestamp(),
          id,
          input.revision ?? -1,
        ],
      });
      if (result.rowsAffected !== 1)
        throw new Error("This article changed. Reload before saving.");
    } else
      await tx.execute({
        sql: "INSERT INTO WebsiteArticle(id,kind,slug,payload,stage,updatedAt) VALUES(?,?,?,?,'draft',?)",
        args: [
          id,
          parsed.kind,
          parsed.slug,
          JSON.stringify(parsed),
          timestamp(),
        ],
      });
    await recordRevision(tx, id, "save", actor);
    return id;
  });
}
async function recordRevision(
  tx: DB,
  id: string,
  action: string,
  actor: string,
) {
  const r = (
    await tx.execute({
      sql: "SELECT payload,stage,revision FROM WebsiteArticle WHERE id=?",
      args: [id],
    })
  ).rows[0];
  await tx.execute({
    sql: "INSERT INTO WebsiteArticleRevision(id,articleId,revision,payload,stage,action,actor,createdAt) VALUES(?,?,?,?,?,?,?,?)",
    args: [
      randomUUID(),
      id,
      r.revision,
      r.payload,
      r.stage,
      action,
      actor,
      timestamp(),
    ],
  });
}
export async function transition(
  input: {
    id: string;
    revision: number;
    action: "advance" | "unpublish" | "restore";
    reviewerName?: string;
    credentials?: string;
    confirmed?: boolean;
    restoreRevision?: number;
    sourceReview?: Content["sourceReview"];
  },
  actor: string,
) {
  return transaction(async (tx) => {
    const raw = (
      await tx.execute({
        sql: "SELECT * FROM WebsiteArticle WHERE id=?",
        args: [input.id],
      })
    ).rows[0];
    if (!raw || Number(raw.revision) !== input.revision)
      throw new Error("This article changed. Reload before updating.");
    const row = decode(raw);
    let payload = row.payload;
    let stage: Stage = row.stage;
    let published = raw.publishedPayload;
    let publishedRevision = raw.publishedRevision;
    let publishedAt = raw.publishedAt;
    if (input.action === "unpublish") {
      stage = "draft";
      published = null;
      publishedRevision = null;
      publishedAt = null;
    } else if (input.action === "restore") {
      const historic = (
        await tx.execute({
          sql: "SELECT payload FROM WebsiteArticleRevision WHERE articleId=? AND revision=?",
          args: [row.id, input.restoreRevision ?? -1],
        })
      ).rows[0];
      if (!historic) throw new Error("Revision not found");
      payload = contentSchema.parse(JSON.parse(String(historic.payload)));
      payload.slug = row.slug;
      payload.kind = row.payload.kind;
      payload.review = null;
      payload.sourceReview = null;
      stage = "draft";
    } else {
      const next = stages[stages.indexOf(row.stage) + 1];
      if (!next)
        throw new Error("Already published. Save changes as a new draft.");
      stage = next;
      if (stage === "fact-checked") {
        if (input.sourceReview) {
          if (
            !input.confirmed ||
            input.sourceReview.contentHash !== contentReviewHash(payload)
          )
            throw new Error(
              "Source review must match the current article content",
            );
          payload.review = null;
          payload.sourceReview = { ...input.sourceReview, actorId: actor };
        } else {
          if (
            !input.confirmed ||
            !input.reviewerName?.trim() ||
            !input.credentials?.trim()
          )
            throw new Error(
              "Confirm source checking and enter the genuine reviewer name and role/qualifications",
            );
          payload.review = {
            name: input.reviewerName.trim(),
            credentials: input.credentials.trim(),
            actorId: actor,
            reviewedAt: timestamp().slice(0, 10),
          };
          payload.sourceReview = null;
        }
      }
      const issues = publicationIssues(payload, await images(tx), stage);
      if (issues.length) throw new Error(issues.join("\n"));
      if (stage === "seo-validated" || stage === "published") {
        const existing = await tx.execute({
          sql: "SELECT id,publishedPayload FROM WebsiteArticle WHERE publishedPayload IS NOT NULL AND id<>?",
          args: [row.id],
        });
        if (
          existing.rows.some((r) => {
            const p = contentSchema.parse(
              JSON.parse(String(r.publishedPayload)),
            );
            return (
              p.seoTitle.toLowerCase() === payload.seoTitle.toLowerCase() ||
              p.metaDescription.toLowerCase() ===
                payload.metaDescription.toLowerCase()
            );
          })
        )
          throw new Error(
            "SEO title and description must be unique among published articles",
          );
      }
      if (stage === "published") {
        published = JSON.stringify(payload);
        publishedRevision = row.revision + 1;
        publishedAt = timestamp();
      }
    }
    await tx.execute({
      sql: "UPDATE WebsiteArticle SET payload=?,stage=?,revision=revision+1,publishedPayload=?,publishedRevision=?,publishedAt=?,updatedAt=? WHERE id=? AND revision=?",
      args: [
        JSON.stringify(payload),
        stage,
        published,
        publishedRevision,
        publishedAt,
        timestamp(),
        row.id,
        row.revision,
      ],
    });
    await recordRevision(tx, row.id, input.action, actor);
  });
}
export async function revisions(id: string) {
  const rows = await websiteDb().execute({
    sql: "SELECT revision,stage,action,createdAt FROM WebsiteArticleRevision WHERE articleId=? ORDER BY revision DESC LIMIT 100",
    args: [id],
  });
  return rows.rows;
}
export async function saveImage(
  input: { id?: string; revision?: number; payload: unknown },
  actor: string,
) {
  const parsed = imageSchema.parse(input.payload);
  if (parsed.status === "approved") {
    const issues = imageIssues(parsed);
    if (issues.length) throw new Error(issues.join("\n"));
  }
  return transaction(async (tx) => {
    const id = input.id || randomUUID();
    if (input.id) {
      const result = await tx.execute({
        sql: "UPDATE WebsiteImageRights SET payload=?,revision=revision+1,approvedBy=?,updatedAt=? WHERE id=? AND revision=?",
        args: [
          JSON.stringify(parsed),
          parsed.status === "approved" ? actor : null,
          timestamp(),
          id,
          input.revision ?? -1,
        ],
      });
      if (result.rowsAffected !== 1)
        throw new Error("This image record changed. Reload before saving.");
    } else
      await tx.execute({
        sql: "INSERT INTO WebsiteImageRights(id,payload,approvedBy,updatedAt) VALUES(?,?,?,?)",
        args: [
          id,
          JSON.stringify(parsed),
          parsed.status === "approved" ? actor : null,
          timestamp(),
        ],
      });
    await audit(tx, id, "image-rights", actor, parsed);
    return id;
  });
}
export async function saveSettings(
  payload: unknown,
  revision: number,
  actor: string,
) {
  const parsed = settingsSchema.parse(payload);
  return transaction(async (tx) => {
    if (!revision)
      await tx.execute({
        sql: "INSERT INTO WebsiteEditorialSettings(id,payload,updatedAt) VALUES('site',?,?)",
        args: [JSON.stringify(parsed), timestamp()],
      });
    else {
      const result = await tx.execute({
        sql: "UPDATE WebsiteEditorialSettings SET payload=?,revision=revision+1,updatedAt=? WHERE id='site' AND revision=?",
        args: [JSON.stringify(parsed), timestamp(), revision],
      });
      if (result.rowsAffected !== 1)
        throw new Error("Settings changed. Reload before saving.");
    }
    await audit(tx, "site", "settings", actor, parsed);
  });
}
export async function importDraftBundle(
  bundle: { content: unknown }[],
  actor: string,
) {
  return transaction(async (tx) => {
    let imported = 0;
    for (const record of bundle) {
      const payload = contentSchema.parse(record.content);
      payload.review = null;
      payload.sourceReview = null;
      payload.imageIds = [];
      const existing = await tx.execute({
        sql: "SELECT id,stage,revision,payload,publishedPayload FROM WebsiteArticle WHERE kind=? AND slug=?",
        args: [payload.kind, payload.slug],
      });
      const prior = existing.rows[0];
      // Promote only untouched research placeholders. Never overwrite staff drafts.
      if (
        prior &&
        (prior.stage !== "research" ||
          Number(prior.revision) !== 1 ||
          prior.publishedPayload ||
          contentSchema.parse(JSON.parse(String(prior.payload))).sections
            .length)
      )
        continue;
      const id = prior ? String(prior.id) : randomUUID();
      if (prior)
        await tx.execute({
          sql: "UPDATE WebsiteArticle SET payload=?,stage='draft',revision=revision+1,updatedAt=? WHERE id=? AND stage='research' AND revision=1 AND publishedPayload IS NULL",
          args: [JSON.stringify(payload), timestamp(), id],
        });
      else
        await tx.execute({
          sql: "INSERT INTO WebsiteArticle(id,kind,slug,payload,stage,updatedAt) VALUES(?,?,?,?,'draft',?)",
          args: [
            id,
            payload.kind,
            payload.slug,
            JSON.stringify(payload),
            timestamp(),
          ],
        });
      await recordRevision(tx, id, "draft-bundle-import", actor);
      await audit(tx, id, "draft-bundle-import", actor, { slug: payload.slug });
      imported++;
    }
    return imported;
  });
}
export async function publicFeed(now = Date.now()): Promise<PublicFeed> {
  const db = websiteDb();
  const [rows, media, site] = await Promise.all([
    db.execute(
      "SELECT id,publishedPayload,publishedRevision,publishedAt FROM WebsiteArticle WHERE publishedPayload IS NOT NULL",
    ),
    images(db),
    settings(db),
  ]);
  const articles: PublicArticle[] = [];
  for (const row of rows.rows) {
    const result = contentSchema.safeParse(
      JSON.parse(String(row.publishedPayload)),
    );
    if (!result.success) continue;
    const content = result.data;
    if (content.sourceReview && !validSourceReview(content)) continue;
    if (
      publicationIssues(content, media).length ||
      (content.publishAt && Date.parse(content.publishAt) > now)
    )
      continue;
    // Actor ids and permission evidence are internal; projection is deliberate.
    articles.push({
      ...content,
      review: content.review ? { ...content.review, actorId: "" } : null,
      sourceReview: content.sourceReview
        ? { ...content.sourceReview, actorId: "" }
        : null,
      id: String(row.id),
      revision: Number(row.publishedRevision),
      publishedAt: String(row.publishedAt),
      updatedAt: String(row.publishedAt),
      images: media
        .filter((image) => content.imageIds.includes(image.id))
        .map((image) => ({ ...image, permissionEvidence: "" })),
    });
  }
  const value = site.payload;
  const homepageMedia = media
    .filter(
      (asset) =>
        [
          value.heroImageId,
          value.heroVideoId,
          value.brandImageId,
          ...value.galleryImageIds,
        ].includes(asset.id) &&
        asset.status === "approved" &&
        imageIssues(asset).length === 0,
    )
    .map((asset) => ({ ...asset, permissionEvidence: "" }));
  return {
    version: 1,
    articles,
    homepageMedia,
    settings: {
      ...value,
      heroImageId: homepageMedia.some((asset) => asset.id === value.heroImageId)
        ? value.heroImageId
        : "",
      heroVideoId: homepageMedia.some((asset) => asset.id === value.heroVideoId)
        ? value.heroVideoId
        : "",
      brandImageId: homepageMedia.some(
        (asset) => asset.id === value.brandImageId,
      )
        ? value.brandImageId
        : "",
      galleryImageIds: value.galleryImageIds.filter((id) =>
        homepageMedia.some((asset) => asset.id === id),
      ),
      featuredSlugs: value.featuredSlugs.filter((slug) =>
        articles.some(
          (article) => article.kind === "gemstones" && article.slug === slug,
        ),
      ),
      featuredGuideSlugs: value.featuredGuideSlugs.filter((slug) =>
        articles.some(
          (article) => article.kind === "guides" && article.slug === slug,
        ),
      ),
      contactEmail: value.contactVerified ? value.contactEmail : "",
      phone: value.contactVerified ? value.phone : "",
      whatsapp: value.contactVerified ? value.whatsapp : "",
      announcements: value.announcements.filter(
        (a) =>
          a.enabled &&
          (!a.startsAt || Date.parse(a.startsAt) <= now) &&
          (!a.endsAt || Date.parse(a.endsAt) > now),
      ),
    },
  };
}
export async function consumeLimit(
  key: string,
  maximum: number,
  windowSeconds: number,
) {
  return transaction(async (tx) => {
    const now = Date.now();
    await tx.execute({
      sql: "DELETE FROM WebsiteRequestLimit WHERE expiresAt<?",
      args: [now],
    });
    const result = await tx.execute({
      sql: "INSERT INTO WebsiteRequestLimit(key,count,expiresAt) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count",
      args: [key, now + windowSeconds * 1000],
    });
    return Number(result.rows[0].count) <= maximum;
  });
}
export async function saveEnquiry(data: {
  name: string;
  email: string;
  subject: string;
  message: string;
}) {
  const id = randomUUID(),
    now = timestamp();
  await websiteDb().execute({
    sql: "INSERT INTO WebsiteEnquiry(id,name,email,subject,message,consentAt,createdAt) VALUES(?,?,?,?,?,?,?)",
    args: [id, data.name, data.email, data.subject, data.message, now, now],
  });
  return id;
}
