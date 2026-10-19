import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createClient } from "@libsql/client";

async function run() {
  const target = path.resolve(
    "tmp/website-development",
    `qa-editorial-${randomUUID()}.db`,
  );
  fs.mkdirSync(path.dirname(target), { recursive: true });
  process.env.WEBSITE_DATABASE_URL = "file:" + target.replaceAll("\\", "/");
  process.env.WEBSITE_MANAGEMENT_ENABLED = "true";
  const db = createClient({ url: process.env.WEBSITE_DATABASE_URL });
  for (const statement of fs
    .readFileSync("scripts/website/editorial.sql", "utf8")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean))
    await db.execute(statement);
  const { contentSchema, imageSchema, defaultSettings } =
    await import("../../lib/website/editorial/contract");
  const {
    saveArticle,
    transition,
    articles,
    publicFeed,
    saveImage,
    saveSettings,
    consumeLimit,
    saveEnquiry,
    revisions,
  } = await import("../../lib/website/editorial/store");
  const now = new Date().toISOString().slice(0, 10);
  const payload = contentSchema.parse({
    kind: "gemstones",
    title: "QA Ruby",
    slug: "qa-ruby",
    summary:
      "This is a QA-only article fixture. It tests editorial publication and is never imported into a live website database.",
    family: "QA family",
    material: "QA material",
    properties: [{ name: "QA property", value: "QA value" }],
    sections: [
      { heading: "QA test text", body: Array(360).fill("fixture").join(" ") },
    ],
    sources: [
      {
        title: "QA source",
        url: "https://example.org/reference",
        checkedAt: now,
      },
    ],
    seoTitle: "QA Ruby publishing fixture",
    metaDescription:
      "A test fixture for the isolated website editorial database, optimistic revisions and source-grounded publication.",
  });
  const id = await saveArticle({ payload }, "qa-actor");
  assert.equal((await publicFeed()).articles.length, 0);
  let row = (await articles()).find((a) => a.id === id)!;
  await assert.rejects(
    () =>
      transition({ id, revision: row.revision, action: "advance" }, "qa-actor"),
    /reviewer|Confirm/,
  );
  await transition(
    {
      id,
      revision: row.revision,
      action: "advance",
      reviewerName: "QA fixture reviewer",
      credentials: "Automated test fixture",
      confirmed: true,
    },
    "qa-actor",
  );
  row = (await articles()).find((a) => a.id === id)!;
  await assert.rejects(
    () =>
      transition({ id, revision: row.revision, action: "advance" }, "qa-actor"),
    /photograph/,
  );
  const imagePayload = imageSchema.parse({
    title: "QA fixture photograph",
    url: "https://example.org/photo.jpg",
    alt: "QA fixture only",
    sourceUrl: "https://example.org/source",
    creator: "QA creator",
    license: "QA permission",
    licenseUrl: "https://example.org/license",
    attribution: "QA attribution",
    specimen: "QA material",
    commercialUse: true,
    authenticPhoto: true,
    permissionEvidence: "INTERNAL QA EVIDENCE",
    verifiedAt: now,
    status: "approved",
  });
  const imageId = await saveImage({ payload: imagePayload }, "qa-actor");
  await saveArticle(
    {
      id,
      revision: row.revision,
      payload: { ...payload, imageIds: [imageId] },
    },
    "qa-actor",
  );
  row = (await articles()).find((a) => a.id === id)!;
  await assert.rejects(
    () => saveArticle({ id, revision: 1, payload }, "qa-actor"),
    /changed/,
  );
  for (let i = 0; i < 4; i++) {
    row = (await articles()).find((a) => a.id === id)!;
    await transition(
      {
        id,
        revision: row.revision,
        action: "advance",
        reviewerName: "QA fixture reviewer",
        credentials: "Automated test fixture",
        confirmed: true,
      },
      "qa-actor",
    );
  }
  let feed = await publicFeed();
  assert.equal(feed.articles.length, 1);
  assert.equal(feed.articles[0].images[0].permissionEvidence, "");
  assert.equal(feed.articles[0].review?.actorId, "");
  const liveRevision = feed.articles[0].revision;
  row = (await articles()).find((a) => a.id === id)!;
  await saveArticle(
    {
      id,
      revision: row.revision,
      payload: { ...row.payload, title: "Unapproved edit" },
    },
    "qa-actor",
  );
  feed = await publicFeed();
  assert.equal(feed.articles[0].title, "QA Ruby");
  assert.equal(feed.articles[0].revision, liveRevision);
  row = (await articles()).find((a) => a.id === id)!;
  await assert.rejects(
    () =>
      saveArticle(
        {
          id,
          revision: row.revision,
          payload: { ...row.payload, slug: "changed-url" },
        },
        "qa-actor",
      ),
    /stable/,
  );
  await saveImage(
    {
      id: imageId,
      revision: 1,
      payload: { ...imagePayload, status: "pending" },
    },
    "qa-actor",
  );
  assert.equal(
    (await publicFeed()).articles.length,
    0,
    "revoked image hides its dependent publication",
  );
  await saveImage(
    { id: imageId, revision: 2, payload: imagePayload },
    "qa-actor",
  );
  assert.equal((await publicFeed()).articles.length, 1);
  row = (await articles()).find((a) => a.id === id)!;
  await transition(
    { id, revision: row.revision, action: "restore", restoreRevision: 1 },
    "qa-actor",
  );
  assert.equal((await publicFeed()).articles[0].title, "QA Ruby");
  assert.equal(
    (await articles()).find((a) => a.id === id)!.payload.review,
    null,
  );
  assert.ok((await revisions(id)).length >= 8);
  await saveSettings(
    {
      ...defaultSettings,
      contactEmail: "private@example.org",
      heroImageId: imageId,
      featuredSlugs: ["qa-ruby"],
    },
    0,
    "qa-actor",
  );
  assert.equal((await publicFeed()).settings.contactEmail, "");
  assert.equal((await publicFeed()).homepageMedia?.length, 1);
  assert.equal((await publicFeed()).homepageMedia?.[0].permissionEvidence, "");
  await saveImage(
    {
      id: imageId,
      revision: 3,
      payload: { ...imagePayload, status: "pending" },
    },
    "qa-actor",
  );
  assert.equal(
    (await publicFeed()).homepageMedia?.length,
    0,
    "revoked hero asset is removed",
  );
  assert.equal(
    (await publicFeed()).settings.heroImageId,
    "",
    "pending placement IDs are private",
  );
  await saveImage(
    { id: imageId, revision: 4, payload: imagePayload },
    "qa-actor",
  );
  await assert.rejects(() => saveSettings(defaultSettings, 0, "qa-actor"));
  await saveSettings(
    {
      ...defaultSettings,
      contactEmail: "approved@example.org",
      contactVerified: true,
      heroImageId: imageId,
    },
    1,
    "qa-actor",
  );
  assert.equal(
    (await publicFeed()).settings.contactEmail,
    "approved@example.org",
  );
  assert.equal(await consumeLimit("qa-rate", 2, 60), true);
  assert.equal(await consumeLimit("qa-rate", 2, 60), true);
  assert.equal(await consumeLimit("qa-rate", 2, 60), false);
  const enquiryId = await saveEnquiry({
    name: "QA fixture",
    email: "qa@example.org",
    subject: "QA fixture only",
    message: "This is an isolated test enquiry.",
  });
  assert.ok(enquiryId);
  const { enquiryReference } =
    await import("../../lib/website/editorial/enquiry-reference");
  const reference = await enquiryReference(enquiryId);
  assert.match(reference, /^KG-ENQ-\d{8}-\d{5,}$/);
  assert.equal(await enquiryReference(enquiryId), reference);
  const { saveEnquiryFollowup } =
    await import("../../lib/website/editorial/enquiry-followup");
  await saveEnquiryFollowup(
    enquiryId,
    {
      owner: "QA team",
      notes: "Call after reviewing the question",
      nextContact: "2026-10-20",
      revision: 0,
    },
    "qa",
  );
  await assert.rejects(
    () =>
      saveEnquiryFollowup(
        enquiryId,
        { owner: "Other", notes: "Stale", nextContact: "", revision: 0 },
        "qa",
      ),
    /changed/,
  );
  assert.equal(
    (
      await db.execute({
        sql: "SELECT owner,nextContact FROM WebsiteEnquiryFollowup WHERE enquiryId=?",
        args: [enquiryId],
      })
    ).rows[0].owner,
    "QA team",
  );
  const { importDraftBundle } =
    await import("../../lib/website/editorial/store");
  const placeholder = contentSchema.parse({
    kind: "gemstones",
    slug: "qa-untouched",
    title: "QA placeholder",
  });
  await db.execute({
    sql: "INSERT INTO WebsiteArticle(id,kind,slug,payload,stage,updatedAt) VALUES('qa-untouched','gemstones','qa-untouched',?,'research',?)",
    args: [JSON.stringify(placeholder), new Date().toISOString()],
  });
  const bundle = [
    {
      content: {
        ...placeholder,
        sections: [
          { heading: "Research draft", body: "Original QA fixture draft." },
        ],
      },
    },
  ];
  assert.equal(await importDraftBundle(bundle, "qa"), 1);
  assert.equal(await importDraftBundle(bundle, "qa"), 0);
  assert.equal(
    (await articles()).find((a) => a.id === "qa-untouched")?.revision,
    2,
  );
  assert.equal(
    (await db.execute("SELECT COUNT(*) AS total FROM WebsiteEnquiry")).rows[0]
      .total,
    1,
  );
  const { acknowledgeEnquiry } =
    await import("../../lib/website/editorial/enquiry-email");
  let sends = 0;
  const services = {
    template: async () => ({ isActive: 1 }),
    send: async (input: any) => {
      sends++;
      assert.equal(input.to, "qa@example.org");
      assert.match(input.variables.enquiry_reference, /^KG-ENQ-\d{8}-\d{5,}$/);
      return { success: true, logId: "qa-mail-log", status: "SENT" };
    },
  };
  assert.equal(await acknowledgeEnquiry(enquiryId, services), "sent");
  assert.equal(await acknowledgeEnquiry(enquiryId, services), "sent");
  assert.equal(sends, 1);
  const failedId = await saveEnquiry({
    name: "QA failed mail",
    email: "qa@example.org",
    subject: "QA failure",
    message: "A provider failure must not discard this enquiry.",
  });
  assert.equal(
    await acknowledgeEnquiry(failedId, {
      template: async () => ({ isActive: 1 }),
      send: async () => {
        throw new Error("QA provider unavailable");
      },
    }),
    "failed",
  );
  assert.equal(
    (
      await db.execute({
        sql: "SELECT id FROM WebsiteEnquiry WHERE id=?",
        args: [failedId],
      })
    ).rows.length,
    1,
  );
  assert.equal(
    await acknowledgeEnquiry(failedId, {
      template: async () => ({ isActive: 0 }),
      send: services.send,
    }),
    "disabled",
  );
  assert.equal(sends, 1);
  assert.equal(
    await acknowledgeEnquiry(failedId, {
      template: async () => ({ isActive: 1 }),
      send: async () => ({
        success: true,
        logId: "qa-queued",
        status: "QUEUED",
      }),
    }),
    "queued",
  );
  await assert.rejects(
    () => acknowledgeEnquiry("missing", services),
    /Enquiry not found/,
  );
  const staleId = await saveEnquiry({
    name: "Stale claim",
    email: "qa@example.org",
    subject: "Recovery",
    message: "Isolated sending recovery fixture",
  });
  await db.execute({
    sql: "INSERT INTO WebsiteEnquiryEmail(enquiryId,status,updatedAt) VALUES(?,'sending',?)",
    args: [staleId, new Date().toISOString()],
  });
  assert.equal(await acknowledgeEnquiry(staleId, services), "sending");
  assert.equal(sends, 1);
  await db.execute({
    sql: "UPDATE WebsiteEnquiryEmail SET updatedAt=? WHERE enquiryId=?",
    args: [new Date(Date.now() - 16 * 60 * 1000).toISOString(), staleId],
  });
  assert.equal(await acknowledgeEnquiry(staleId, services), "sent");
  assert.equal(sends, 2);
  const { listEnquiries } =
    await import("../../lib/website/editorial/enquiries");
  assert.equal(
    (await listEnquiries({ query: "QA failed mail" })).enquiries.length,
    1,
  );
  assert.equal(
    (await listEnquiries({ query: "%" })).enquiries.length,
    0,
    "LIKE wildcards must be literal",
  );
  const todayDue = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  await db.execute({
    sql: "INSERT INTO WebsiteEnquiryFollowup(enquiryId,owner,nextContact,updatedAt,updatedBy) VALUES(?,?,?,?,?) ON CONFLICT(enquiryId) DO UPDATE SET nextContact=excluded.nextContact",
    args: [failedId, "QA due team", todayDue, new Date().toISOString(), "qa"],
  });
  assert.equal(
    (await listEnquiries({ due: true, query: "QA failed mail" })).enquiries
      .length,
    1,
  );
  assert.equal(
    (await listEnquiries({ query: "QA due team" })).enquiries.length,
    1,
  );
  const targetRef = String(
    (await listEnquiries({ query: "QA failed mail" })).enquiries[0].reference,
  );
  assert.equal(
    (await listEnquiries({ query: targetRef })).enquiries[0].id,
    failedId,
  );
  const tx = await db.transaction("write");
  try {
    for (let n = 0; n < 205; n++)
      await tx.execute({
        sql: "INSERT INTO WebsiteEnquiry(id,name,email,subject,message,consentAt,createdAt) VALUES(?,?,?,?,?,?,?)",
        args: [
          "pagination-" + n,
          "Pagination " + n,
          "qa@example.org",
          "QA pagination",
          "Private fixture",
          new Date().toISOString(),
          new Date(Date.now() + n * 1000).toISOString(),
        ],
      });
    await tx.commit();
  } finally {
    tx.close();
  }
  assert.equal((await listEnquiries()).enquiries.length, 50);
  assert.equal(
    (await listEnquiries({ query: targetRef })).enquiries[0].id,
    failedId,
    "Search reaches beyond newest 200 records",
  );
  assert((await listEnquiries({ page: 4 })).enquiries.length > 0);
  await db.execute({
    sql: "UPDATE WebsiteEnquiry SET status='resolved' WHERE id=?",
    args: [failedId],
  });
  assert.equal(
    (await listEnquiries({ status: "resolved", query: targetRef })).enquiries
      .length,
    1,
  );
  assert.equal(
    (await listEnquiries({ status: "new", query: targetRef })).enquiries.length,
    0,
  );
  row = (await articles()).find((a) => a.id === id)!;
  await transition(
    { id, revision: row.revision, action: "unpublish" },
    "qa-actor",
  );
  assert.equal((await publicFeed()).articles.length, 0);
  row = (await articles()).find((a) => a.id === id)!;
  await assert.rejects(
    () =>
      saveArticle(
        {
          id,
          revision: row.revision,
          payload: { ...row.payload, slug: "changed-after-unpublish" },
        },
        "qa-actor",
      ),
    /stable/,
  );
  const { recordMetric } = await import("../../lib/website/editorial/metrics");
  await recordMetric("view", "/");
  await recordMetric("view", "/");
  assert.equal(
    (await db.execute("SELECT total FROM WebsiteUsageMetric WHERE path='/'"))
      .rows[0].total,
    2,
  );
  await assert.rejects(() => recordMetric("view", "/private-draft"), /Unknown/);
  const { importReviewedRelease } =
    await import("../../lib/website/editorial/launch-release");
  const release = await importReviewedRelease("qa-delegated-release", 0);
  assert.equal(release.imported, 5);
  const approved = await publicFeed();
  assert.equal(approved.articles.length, 5);
  assert(
    approved.articles.every(
      (a) => a.review === null && a.sourceReview?.actorId === "",
    ),
  );
  const again = await importReviewedRelease("qa-delegated-release", 0);
  assert.equal(again.imported, 0);
  assert.equal(again.preserved.length, 5);
  const interrupted = (await articles()).find((a) => a.slug === "emerald")!;
  await db.execute({
    sql: "UPDATE WebsiteArticle SET publishedAt=NULL,publishedPayload=NULL,publishedRevision=NULL,stage='fact-checked' WHERE id=?",
    args: [interrupted.id],
  });
  const resumed = await importReviewedRelease("qa-resume", 0);
  assert.equal(
    resumed.imported,
    1,
    "An interrupted matching release can resume",
  );
  assert.equal(resumed.preserved.length, 4);
  const reviewedTarget = (await articles()).find((a) => a.slug === "ruby")!;
  const stored = (
    await db.execute({
      sql: "SELECT publishedPayload FROM WebsiteArticle WHERE id=?",
      args: [reviewedTarget.id],
    })
  ).rows[0].publishedPayload;
  const tampered = JSON.parse(String(stored));
  tampered.summary += " Unreviewed alteration.";
  await db.execute({
    sql: "UPDATE WebsiteArticle SET publishedPayload=? WHERE id=?",
    args: [JSON.stringify(tampered), reviewedTarget.id],
  });
  assert.equal(
    (await publicFeed()).articles.length,
    4,
    "modified publication cannot reuse stale source review",
  );
  await db.execute({
    sql: "UPDATE WebsiteArticle SET publishedPayload=? WHERE id=?",
    args: [String(stored), reviewedTarget.id],
  });
  await saveArticle(
    {
      id: reviewedTarget.id,
      revision: reviewedTarget.revision,
      payload: {
        ...reviewedTarget.payload,
        summary: reviewedTarget.payload.summary + " New draft.",
      },
    },
    "qa",
  );
  assert.equal(
    (await articles()).find((a) => a.id === reviewedTarget.id)?.payload
      .sourceReview,
    null,
  );
  db.close();
  console.log(
    "PASS: isolated editorial database, approval gates, published snapshots, revoked media, stable URLs, stale writes, revision restoration, contact privacy, rate limits, enquiries and unpublishing.",
  );
}
run().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
