import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { sections, type WebsiteSection } from "@/lib/website/contracts";
import { websiteEnabled, listRecords, saveRecord, manageProduct } from "@/lib/website/store";
import { z } from "zod";
import { loadWebsiteListingSource } from "@/lib/website/listing-source";
import { isSameRequestOrigin } from "@/lib/website/same-origin";
export const dynamic = "force-dynamic";
async function authorize() {
  if (!websiteEnabled()) return null;
  const session = await auth();
  if (!session?.user || !await checkUserPermission(session.user.id, PERMISSIONS.SETTINGS_MANAGE)) return null;
  return session.user.id;
}
export async function GET(req: NextRequest) {
  if (!await authorize()) return NextResponse.json({error:"Unavailable"},{status:403});
  const section = req.nextUrl.searchParams.get("section") as WebsiteSection;
  if (!sections.includes(section)) return NextResponse.json({error:"Invalid section"},{status:400});
  try { return NextResponse.json({records:await listRecords(section)},{headers:{"Cache-Control":"no-store"}}); }
  catch { return NextResponse.json({error:"Website database is not ready. Apply the website-only migration."},{status:503}); }
}
export async function POST(req: NextRequest) {
  // Prevent cross-origin use of session cookies for management writes.
  if (!isSameRequestOrigin(req)) return NextResponse.json({error:"Invalid origin"},{status:403});
  const actor = await authorize();
  if (!actor) return NextResponse.json({error:"Unavailable"},{status:403});
  try {
    const body = await req.json();
    if (!sections.includes(body.section)) throw new Error("Invalid section");
    if(body.section==="products")throw new Error("Create website listings through Marketplace Create Listings; use product actions here.");
    const id = await saveRecord(body.section,body.payload,actor,body.id,body.revision);
    return NextResponse.json({id});
  } catch(error) { return NextResponse.json({error:error instanceof Error ? error.message : "Save failed"},{status:400}); }
}
export async function PATCH(req:NextRequest){
  if(!isSameRequestOrigin(req))return NextResponse.json({error:"Invalid origin"},{status:403});
  const actor=await authorize();if(!actor)return NextResponse.json({error:"Unavailable"},{status:403});
  try{const input=z.object({id:z.string().min(1),revision:z.number().int().positive(),action:z.enum(["activate","deactivate","delete","collections"]),collectionIds:z.array(z.string()).max(100).default([])}).strict().parse(await req.json());let verifiedPricing;if(input.action==="activate"){const listing=(await listRecords("products")).find(p=>p.id===input.id);if(!listing)throw new Error("Listing not found");const source=await loadWebsiteListingSource(String(listing.payload.inventoryId),true);if(source.sku!==listing.payload.sku||source.quantity<Number(listing.payload.quantity))throw new Error("Listing quantity exceeds the matching ready inventory");verifiedPricing={cost:source.cost,charges:source.charges};}await manageProduct(input.id,input.revision,input.action,input.collectionIds,actor,verifiedPricing);return NextResponse.json({success:true});}
  catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Update failed"},{status:400});}
}
