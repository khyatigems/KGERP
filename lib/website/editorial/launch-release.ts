import { randomUUID } from "node:crypto";
import first from "./first-drafts.json";
import supporting from "./supporting-drafts.json";
import expanded from "./expanded-library-drafts.json";
import media from "./release-media.json";
import evidence from "./source-review-evidence.json";
import { contentSchema, imageSchema, imageIssues } from "./contract";
import { articles, images, saveArticle, saveImage, transition } from "./store";
import { contentReviewHash } from "./source-review";
import { websiteDb } from "./database";
/** Authenticated, five-article batches. Existing publications and edited drafts are preserved. */
export async function importReviewedRelease(actor: string, offset = 0) {
  const db = websiteDb();
  if (offset === 0) {
    const snapshot: Record<string, unknown> = {};
    const tx = await db.transaction("read");
    try {
      const tables = await tx.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'Website%'",
      );
      for (const row of tables.rows) {
        const name = String(row.name);
        if (
          !/^Website[A-Za-z0-9_]+$/.test(name) ||
          [
            "WebsiteEditorialBackup",
            "WebsiteRequestLimit",
            "WebsiteUploadGrant",
          ].includes(name)
        )
          continue;
        snapshot[name] = (await tx.execute(`SELECT * FROM "${name}"`)).rows;
      }
      await tx.commit();
    } catch (e) {
      await tx.rollback();
      throw e;
    } finally {
      tx.close();
    }
    await db.execute({
      sql: "INSERT INTO WebsiteEditorialBackup(id,payload,createdAt) VALUES(?,?,?)",
      args: [
        randomUUID(),
        JSON.stringify(snapshot, (_, value) =>
          typeof value === "bigint" ? String(value) : value,
        ),
        new Date().toISOString(),
      ],
    });
  }
  const all = [...first, ...supporting, ...expanded];
  const batch = all.slice(offset, offset + 5);
  let imported = 0;
  const preserved: string[] = [];
  for (const record of batch) {
    const raw = contentSchema.parse(record.content);
    const existing = (await articles()).find(
      (a) => a.kind === raw.kind && a.slug === raw.slug,
    );
    if (existing?.publishedAt) {
      preserved.push(raw.slug);
      continue;
    }
    const content = contentSchema.parse(raw);
    for (const source of content.sources) {
      const check = evidence.sources.find((s) => s.url === source.url);
      if (
        !check ||
        check.status !== 200 ||
        !check.finalUrl.startsWith("https://www.gia.edu/")
      )
        throw new Error("Release source requires review");
      source.checkedAt = evidence.checkedAt.slice(0, 10);
    }
    const requested =
      content.kind === "gemstones"
        ? [content.slug]
        : content.relatedSlugs
            .filter((slug) => media.some((m) => m.slug === slug))
            .slice(0, 3);
    content.imageIds = [];
    for (const slug of requested) {
      const item = media.find((m) => m.slug === slug);
      if (!item) throw new Error("Release image requires review");
      const asset = imageSchema.parse(item.asset);
      const known = (await images()).find(
        (m) =>
          m.url === asset.url &&
          m.sourceUrl === asset.sourceUrl &&
          m.creator === asset.creator &&
          m.license === asset.license &&
          m.status === "approved" &&
          !imageIssues(m).length,
      );
      content.imageIds.push(
        known?.id || (await saveImage({ payload: asset }, actor)),
      );
    }
    if (
      existing &&
      !(
        existing.stage === "research" &&
        existing.revision === 1 &&
        !existing.payload.sections.length
      ) &&
      ![contentReviewHash(raw), contentReviewHash(content)].includes(
        contentReviewHash(existing.payload),
      )
    ) {
      preserved.push(raw.slug);
      continue;
    }
    const id = await saveArticle(
      {
        ...(existing ? { id: existing.id, revision: existing.revision } : {}),
        payload: content,
      },
      actor,
    );
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
      const row = (await articles()).find((a) => a.id === id)!;
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
    imported++;
  }
  return {
    imported,
    preserved,
    total: all.length,
    nextOffset:
      offset + batch.length < all.length ? offset + batch.length : null,
  };
}
