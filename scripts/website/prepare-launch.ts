/** Builds a separate, reversible local release candidate. Never touches production. */
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createClient } from "@libsql/client";
import first from "../../lib/website/editorial/first-drafts.json";
import supporting from "../../lib/website/editorial/supporting-drafts.json";
import expanded from "../../lib/website/editorial/expanded-library-drafts.json";
import media from "../../lib/website/editorial/release-media.json";
import evidence from "../../lib/website/editorial/source-review-evidence.json";
async function main() {
  const folder = path.resolve("tmp/website-development");
  fs.mkdirSync(folder, { recursive: true });
  const target = path.join(folder, `launch-candidate-${randomUUID()}.db`);
  process.env.WEBSITE_MANAGEMENT_ENABLED = "true";
  process.env.WEBSITE_DATABASE_URL = "file:" + target.replaceAll("\\", "/");
  delete process.env.WEBSITE_DATABASE_AUTH_TOKEN;
  const db = createClient({ url: process.env.WEBSITE_DATABASE_URL });
  const { editorialSql } = await import("../../lib/website/editorial/schema");
  for (const sql of editorialSql
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean))
    await db.execute(sql);
  const { contentSchema, imageSchema, publicationIssues } =
    await import("../../lib/website/editorial/contract");
  const { saveImage, saveArticle, articles, transition, publicFeed } =
    await import("../../lib/website/editorial/store");
  const { contentReviewHash } =
    await import("../../lib/website/editorial/source-review");
  const actor = "system:owner-delegated-ai-review:2026-10-16";
  const imageIds = new Map<string, string>();
  for (const record of media) {
    const asset = imageSchema.parse(record.asset);
    imageIds.set(record.slug, await saveImage({ payload: asset }, actor));
  }
  const records = [...first, ...supporting, ...expanded];
  const approved = [];
  for (const record of records) {
    const content = contentSchema.parse(record.content);
    for (const source of content.sources) {
      const checked = evidence.sources.find((s) => s.url === source.url);
      if (
        !checked ||
        checked.status !== 200 ||
        !checked.finalUrl.startsWith("https://www.gia.edu/")
      )
        throw new Error("Unverified source: " + source.url);
      source.checkedAt = evidence.checkedAt.slice(0, 10);
    }
    content.imageIds =
      content.kind === "gemstones"
        ? [imageIds.get(content.slug)!]
        : content.relatedSlugs
            .flatMap((slug) =>
              imageIds.has(slug) ? [imageIds.get(slug)!] : [],
            )
            .slice(0, 3);
    if (content.imageIds.some((id) => !id))
      throw new Error("Missing image: " + content.slug);
    const id = await saveArticle({ payload: content }, actor);
    const sourceReview = {
      method: "ai-assisted-source-review" as const,
      tool: "OpenAI Codex" as const,
      authority: "owner-delegated-2026-10-16" as const,
      reviewedAt: evidence.checkedAt.slice(0, 10),
      sourceUrls: content.sources.map((s) => s.url),
      contentHash: contentReviewHash(content),
      actorId: actor,
    };
    for (let step = 0; step < 4; step++) {
      const row = (await articles()).find((r) => r.id === id)!;
      await transition(
        {
          id,
          revision: row.revision,
          action: "advance",
          confirmed: true,
          ...(step === 0 ? { sourceReview } : {}),
        },
        actor,
      );
    }
    approved.push({
      id,
      contentHash: sourceReview.contentHash,
      kind: content.kind,
      slug: content.slug,
    });
  }
  const feed = await publicFeed();
  if (feed.articles.length !== records.length)
    throw new Error("Public projection mismatch");
  if (feed.articles.some((a) => a.review !== null || a.sourceReview?.actorId))
    throw new Error("Public review attribution mismatch");
  const report = {
    preparedAt: new Date().toISOString(),
    databaseUrl: process.env.WEBSITE_DATABASE_URL,
    publishedCount: feed.articles.length,
    imageCount: media.length,
    reviewMethod:
      "AI-assisted source review, owner delegated; no named gemologist claimed",
    articles: approved,
  };
  fs.writeFileSync(
    path.join(folder, "latest-launch-candidate.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  fs.writeFileSync(
    path.join(folder, "launch-public-feed.json"),
    JSON.stringify(feed, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      databaseUrl: report.databaseUrl,
      publishedCount: report.publishedCount,
      imageCount: report.imageCount,
      productionTouched: false,
    }),
  );
  db.close();
}
main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Release preparation failed",
  );
  process.exitCode = 1;
});
