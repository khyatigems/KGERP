import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { listRecords, websiteEnabled } from "@/lib/website/store";
import { productSchema, publicProduct, offerSchema, offerProductIds,calculatePrice,collectionSchema,bannerSchema,announcementSchema,checkoutSchema } from "@/lib/website/contracts";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const expected = process.env.WEBSITE_FEED_TOKEN;
  const provided = req.headers.get("authorization")?.replace(/^Bearer /, "") || "";
  if (!websiteEnabled() || !expected || expected.length < 32 || Buffer.byteLength(provided) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(provided),Buffer.from(expected))) return NextResponse.json({error:"Unavailable"},{status:403});
  try {
    const [products,collections,banners,announcements,offers,checkout] = await Promise.all([listRecords("products"),listRecords("collections"),listRecords("banners"),listRecords("announcements"),listRecords("offers"),listRecords('checkout')]);
    const now = Date.now();
    const active = (r: {payload: Record<string,unknown>}) => r.payload.enabled && (!r.payload.startsAt || Date.parse(String(r.payload.startsAt)) <= now) && (!r.payload.endsAt || Date.parse(String(r.payload.endsAt)) > now);
    const automaticOffers=offers.map(r=>({id:r.id,...offerSchema.parse(r.payload)})).filter(o=>o.enabled&&!o.code&&Date.parse(o.startsAt)<=now&&Date.parse(o.endsAt)>now);
    const publicProducts=products.map(r=>({id:r.id,p:productSchema.parse(r.payload)})).filter(r=>r.p.status === "published").map(({id,p})=>{
      const eligible=automaticOffers.filter(o=>offerProductIds(o,products,collections).includes(id));
      const priceAt=(quantity:number)=>Math.min(calculatePrice(p,quantity).unitPrice,...eligible.filter(o=>quantity>=o.minimumQuantity).map(o=>calculatePrice(p,quantity,o.percent,o.stackWithVolume).unitPrice));
      const thresholds=[...new Set([...p.volumeTiers.map(t=>t.quantity),...eligible.filter(o=>o.minimumQuantity>1&&o.minimumQuantity<=p.quantity).map(o=>o.minimumQuantity)])].sort((a,b)=>a-b);
      return {...publicProduct(id,p),price:priceAt(1),volumeTiers:thresholds.map(quantity=>({quantity,unitPrice:priceAt(quantity)}))};
    });
    return NextResponse.json({products:publicProducts,collections:collections.filter(r=>r.payload.published).map(r=>({id:r.id,...collectionSchema.parse(r.payload)})).sort((a,b)=>a.sortOrder-b.sortOrder),banners:banners.filter(active).map(r=>({id:r.id,...bannerSchema.parse(r.payload)})).sort((a,b)=>a.sortOrder-b.sortOrder),announcements:announcements.filter(active).map(r=>({id:r.id,revision:r.revision,...announcementSchema.parse(r.payload)})).sort((a,b)=>a.sortOrder-b.sortOrder),offers:automaticOffers.filter(o=>o.showOnShop).map(o=>({id:o.id,title:o.title,text:o.text,image:o.image,imageAlt:o.imageAlt,link:o.link,percent:o.percent,minimumQuantity:o.minimumQuantity,startsAt:o.startsAt,endsAt:o.endsAt})),checkout:checkout[0]?checkoutSchema.parse(checkout[0].payload):null,checkoutEnabled:false},{headers:{"Cache-Control":"no-store"}});
  } catch { return NextResponse.json({error:"Catalogue temporarily unavailable"},{status:503}); }
}
