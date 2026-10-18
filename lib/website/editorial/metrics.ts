import { websiteDb } from "./database";
import { publicFeed } from "./store";
import { articlePath } from "./contract";
export async function recordMetric(
  kind: "view" | "marketplace" | "enquiry",
  path: string,
  target?: string,
) {
  const feed = await publicFeed();
  const allowed = [
    "/",
    "/gemstones",
    "/search",
    "/gemstone-families",
    "/birthstones",
    "/glossary",
    "/compare",
    "/learn",
    "/gemstone-care",
    "/about",
    "/where-to-buy",
    "/contact",
    "/ask",
    "/privacy",
    "/image-credits",
    "/photography",
    "/certification",
    "/services",
    "/faq",
    "/lookbook",
    "/editorial-policy",
    ...feed.articles.map(articlePath),
  ];
  if (!allowed.includes(path)) throw new Error("Unknown public path");
  if (
    kind === "marketplace" &&
    !feed.settings.marketplaces.some((store) => store.url === target)
  )
    throw new Error("Unknown storefront");
  await websiteDb().execute({
    sql: "INSERT INTO WebsiteUsageMetric(day,kind,path,total) VALUES(?,?,?,1) ON CONFLICT(day,kind,path) DO UPDATE SET total=total+1",
    args: [new Date().toISOString().slice(0, 10), kind, path],
  });
}
