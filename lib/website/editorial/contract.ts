import { z } from "zod";

export const kinds = [
  "gemstones",
  "guides",
  "families",
  "birthstones",
  "care",
  "glossary",
  "comparisons",
  "pages",
] as const;
export const stages = [
  "research",
  "draft",
  "fact-checked",
  "image-approved",
  "seo-validated",
  "published",
] as const;
export const kindPaths = {
  gemstones: "gemstones",
  guides: "learn",
  families: "gemstone-families",
  birthstones: "birthstones",
  care: "gemstone-care",
  glossary: "glossary",
  comparisons: "compare",
  pages: "information",
} as const;
const text = (max: number) => z.string().trim().max(max);
export const secureUrl = z
  .string()
  .url()
  .refine((value) => {
    try {
      const u = new URL(value);
      return u.protocol === "https:" && !u.username && !u.password;
    } catch {
      return false;
    }
  }, "Use a public HTTPS URL");
const optionalUrl = z.union([secureUrl, z.literal("")]).default("");
export const contentSchema = z
  .object({
    kind: z.enum(kinds),
    title: text(180).min(1),
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(150),
    summary: text(1200).default(""),
    aliases: z.array(text(100)).max(60).default([]),
    family: text(100).default(""),
    material: text(100).default(""),
    colours: z.array(text(40)).max(30).default([]),
    parentSlug: text(150).default(""),
    properties: z
      .array(z.object({ name: text(100), value: text(500) }))
      .max(40)
      .default([]),
    sections: z
      .array(z.object({ heading: text(180).min(1), body: text(16000).min(1) }))
      .max(35)
      .default([]),
    faqs: z
      .array(
        z.object({ question: text(300).min(1), answer: text(2400).min(1) }),
      )
      .max(30)
      .default([]),
    sources: z
      .array(
        z.object({
          title: text(200).min(1),
          url: secureUrl,
          checkedAt: z.string().date(),
        }),
      )
      .max(40)
      .default([]),
    imageIds: z.array(z.string().min(1).max(100)).max(15).default([]),
    relatedSlugs: z.array(text(150)).max(30).default([]),
    seoTitle: text(100).default(""),
    metaDescription: text(220).default(""),
    review: z
      .object({
        name: text(150),
        credentials: text(250),
        reviewedAt: z.string().date(),
        actorId: text(150),
      })
      .nullable()
      .default(null),
    sourceReview: z
      .object({
        method: z.literal("ai-assisted-source-review"),
        tool: z.literal("OpenAI Codex"),
        authority: z.literal("owner-delegated-2026-10-16"),
        reviewedAt: z.string().date(),
        sourceUrls: z.array(secureUrl).min(1).max(40),
        contentHash: z.string().regex(/^[a-f0-9]{64}$/),
        actorId: text(150),
      })
      .strict()
      .nullable()
      .default(null),
    publishAt: z.union([z.string().datetime(), z.literal("")]).default(""),
  })
  .strict();
export type Content = z.infer<typeof contentSchema>;
export type Kind = Content["kind"];
export type Stage = (typeof stages)[number];
export const imageSchema = z
  .object({
    purpose: z.enum(["reference", "brand"]).default("reference"),
    mediaType: z.enum(["image", "video"]).default("image"),
    posterUrl: optionalUrl,
    cloudinaryPublicId: text(250).default(""),
    width: z.number().int().nonnegative().default(0),
    height: z.number().int().nonnegative().default(0),
    duration: z.number().nonnegative().default(0),
    transcript: text(16000).default(""),
    captionsVtt: text(60000).default(""),
    title: text(180).min(1),
    url: optionalUrl,
    alt: text(350).default(""),
    caption: text(1200).default(""),
    sourceUrl: optionalUrl,
    creator: text(180).default(""),
    license: text(150).default(""),
    licenseUrl: optionalUrl,
    attribution: text(600).default(""),
    commercialUse: z.boolean().default(false),
    modifications: text(600).default(""),
    specimen: text(200).default(""),
    verifiedAt: z.union([z.string().date(), z.literal("")]).default(""),
    permissionEvidence: text(1000).default(""),
    authenticPhoto: z.boolean().default(false),
    status: z.enum(["pending", "approved", "archived"]).default("pending"),
  })
  .strict();
export type ImageAsset = z.infer<typeof imageSchema> & {
  id: string;
  revision: number;
};
export const homeSections = [
  "discovery",
  "about",
  "featured",
  "learning",
  "guides",
  "help",
] as const;
const websitePath = z
  .string()
  .regex(/^\/(?!\/)[a-zA-Z0-9/\-#?=&%]*$/)
  .max(200);
export const settingsSchema = z
  .object({
    heading: text(180).min(1).default("Natural gemstones. Understood clearly."),
    introduction: text(700).default(
      "Explore gemstone properties, treatments, origins and care in the KhyatiGems Gemstone Encyclopedia.",
    ),
    heroImageId: text(100).default(""),
    heroVideoId: text(100).default(""),
    heroGalleryIds: z.array(text(100)).max(5).default([]),
    heroSlideSeconds: z.number().min(5).max(30).default(7.5),
    heroImagePositionX: z.number().min(0).max(100).default(50),
    heroImagePositionY: z.number().min(0).max(100).default(50),
    heroImageZoom: z.number().min(1).max(2).default(1),
    heroVideoPositionX: z.number().min(0).max(100).default(50),
    heroVideoPositionY: z.number().min(0).max(100).default(50),
    heroVideoStart: z.number().min(0).max(3600).default(0),
    heroVideoEnd: z.number().min(0).max(3600).default(0),
    announcementInterval: z.number().int().min(5).max(30).default(8),
    announcementAnimation: z.enum(["fade", "slide", "none"]).default("fade"),
    announcementAutoplay: z.boolean().default(true),
    featuredSlugs: z.array(text(150)).max(6).default([]),
    featuredGuideSlugs: z.array(text(150)).max(6).default([]),
    heroPrimaryLabel: text(60).min(1).default("Explore gemstones"),
    heroPrimaryPath: websitePath.default("/gemstones"),
    heroSecondaryLabel: text(60).min(1).default("About KhyatiGems"),
    heroSecondaryPath: websitePath.default("/about"),
    homepageSections: z
      .array(z.enum(homeSections))
      .max(6)
      .refine(
        (items) => new Set(items).size === items.length,
        "Each homepage section must be unique",
      )
      .default([...homeSections]),
    brandImageId: text(100).default(""),
    galleryImageIds: z.array(text(100)).max(30).default([]),
    companyName: text(180).default("Khyati Precious Gems Private Limited"),
    tagline: text(180).default("Precious Gems for your Precious Ones."),
    about: text(6000).default(""),
    contactEmail: z.union([z.string().email(), z.literal("")]).default(""),
    phone: text(40)
      .regex(/^[+0-9 ()-]*$/)
      .default(""),
    whatsapp: text(20)
      .regex(/^[0-9]*$/)
      .default(""),
    contactVerified: z.boolean().default(false),
    marketplaces: z
      .array(
        z.object({
          name: text(100).min(1),
          url: secureUrl,
          verifiedAt: z.string().date(),
        }),
      )
      .max(12)
      .default([]),
    announcements: z
      .array(
        z
          .object({
            text: text(500).min(1),
            href: z
              .string()
              .regex(/^\/(?!\/)[a-zA-Z0-9/\-#?=&]*$/)
              .default("/gemstones"),
            startsAt: z
              .union([z.string().datetime(), z.literal("")])
              .default(""),
            endsAt: z.union([z.string().datetime(), z.literal("")]).default(""),
            enabled: z.boolean().default(true),
            tone: z.enum(["brand", "gold", "neutral"]).default("brand"),
            linkLabel: text(60).default(""),
          })
          .refine(
            (a) =>
              !a.startsAt ||
              !a.endsAt ||
              Date.parse(a.endsAt) > Date.parse(a.startsAt),
            {
              message: "Announcement end must be after its start",
              path: ["endsAt"],
            },
          ),
      )
      .max(10)
      .default([]),
    googleVerification: text(150)
      .regex(/^[a-zA-Z0-9_-]*$/)
      .default(""),
    bingVerification: text(100)
      .regex(/^[a-zA-Z0-9_-]*$/)
      .default(""),
  })
  .strict()
  .refine(
    (site) =>
      site.heroVideoEnd === 0 || site.heroVideoEnd > site.heroVideoStart,
    {
      message: "Hero video end must be after its start",
      path: ["heroVideoEnd"],
    },
  );
export type SiteSettings = z.infer<typeof settingsSchema>;
export const defaultSettings = settingsSchema.parse({});
export type PublicArticle = Content & {
  id: string;
  revision: number;
  updatedAt: string;
  publishedAt: string;
  images: ImageAsset[];
};
export type PublicFeed = {
  version: 1;
  articles: PublicArticle[];
  settings: SiteSettings;
  homepageMedia?: ImageAsset[];
};
export function articlePath(content: Pick<Content, "kind" | "slug">) {
  return `/${kindPaths[content.kind]}/${content.slug}`;
}
export function imageIssues(image: z.infer<typeof imageSchema>): string[] {
  const issues: string[] = [];
  for (const key of [
    "url",
    "alt",
    "sourceUrl",
    "creator",
    "license",
    "licenseUrl",
    "attribution",
    "specimen",
    "verifiedAt",
    "permissionEvidence",
  ] as const)
    if (!image[key]) issues.push(`Image requires ${key}`);
  if (image.purpose === "reference" && !image.authenticPhoto)
    issues.push("Confirm this is authentic specimen photography");
  if (!image.commercialUse) issues.push("Confirm commercial reuse rights");
  if (
    image.verifiedAt &&
    image.verifiedAt > new Date().toISOString().slice(0, 10)
  )
    issues.push("Image verification date cannot be in the future");
  if (image.mediaType === "video" && (!image.posterUrl || !image.transcript))
    issues.push("Videos require a poster and descriptive transcript");
  if (
    image.mediaType === "video" &&
    (!image.captionsVtt.startsWith("WEBVTT") ||
      !image.captionsVtt.includes("-->"))
  )
    issues.push("Videos require WebVTT captions before publication");
  return issues;
}
export function publicationIssues(
  content: Content,
  images: ImageAsset[],
  stage: Stage = "published",
): string[] {
  const issues: string[] = [];
  const level = stages.indexOf(stage);
  if (level >= 2) {
    const automated = content.sourceReview;
    const validAutomated =
      automated &&
      automated.actorId &&
      automated.reviewedAt <= new Date().toISOString().slice(0, 10) &&
      content.sources.length > 0 &&
      content.sources.every(
        (source) =>
          source.checkedAt <= automated.reviewedAt &&
          automated.sourceUrls.includes(source.url),
      );
    if (
      !validAutomated &&
      (!content.review?.name ||
        !content.review.actorId ||
        !content.review.credentials)
    )
      issues.push(
        "A named reviewer, role/qualifications and recorded review are required",
      );
    if (!content.sources.length)
      issues.push("Record at least one source with its checked date");
    if (
      content.sources.some(
        (s) => s.checkedAt > new Date().toISOString().slice(0, 10),
      )
    )
      issues.push("Source checks cannot be dated in the future");
    if (content.summary.length < 80)
      issues.push("Write a substantive introduction");
    const words = content.sections
      .map((s) => s.body)
      .join(" ")
      .split(/\s+/)
      .filter(Boolean).length;
    if (words < (content.kind === "gemstones" ? 350 : 180))
      issues.push("The article needs more substantive content before review");
    if (!content.sections.length) issues.push("Add article sections");
    if (
      content.kind === "gemstones" &&
      (!content.family || !content.material || !content.properties.length)
    )
      issues.push("Complete gemstone taxonomy and properties");
  }
  if (level >= 3) {
    if (
      content.kind === "gemstones" &&
      !images.some(
        (i) =>
          content.imageIds.includes(i.id) &&
          i.mediaType === "image" &&
          i.purpose === "reference" &&
          i.authenticPhoto &&
          i.status === "approved",
      )
    )
      issues.push("Gemstone articles require an approved authentic photograph");
    for (const id of content.imageIds) {
      const asset = images.find((i) => i.id === id);
      if (!asset || asset.status !== "approved" || imageIssues(asset).length)
        issues.push(`Image ${id} is not approved for publication`);
    }
  }
  if (level >= 4) {
    if (content.seoTitle.length < 15)
      issues.push("Add a descriptive SEO title");
    if (content.metaDescription.length < 60)
      issues.push("Add a useful meta description");
  }
  return [...new Set(issues)];
}
