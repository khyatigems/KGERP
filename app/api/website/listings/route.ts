import { NextRequest,NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkUserPermission,PERMISSIONS } from "@/lib/permissions";
import { productSchema } from "@/lib/website/contracts";
import { websiteEnabled,saveRecord,listRecords } from "@/lib/website/store";
import { websiteChannel } from "@/lib/website/channel";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { loadWebsiteListingSource } from "@/lib/website/listing-source";
import { websiteSlug } from "@/lib/website/listing-content";
import { isSameRequestOrigin } from "@/lib/website/same-origin";
export async function GET(req:NextRequest){
 if(!websiteEnabled())return NextResponse.json({error:"Unavailable"},{status:403});
 const session=await auth();if(!session?.user||!await checkUserPermission(session.user.id,PERMISSIONS.LISTINGS_VIEW)||!await checkUserPermission(session.user.id,PERMISSIONS.INVENTORY_VIEW_COST))return NextResponse.json({error:"Listing and cost access required"},{status:403});
 const record=(await listRecords("products")).find(r=>r.id===req.nextUrl.searchParams.get("id"));if(!record)return NextResponse.json({error:"Listing not found"},{status:404});return NextResponse.json({record},{headers:{"Cache-Control":"no-store"}});
}
export async function POST(req:NextRequest){
  if(!websiteEnabled()||!isSameRequestOrigin(req))return NextResponse.json({error:"Unavailable"},{status:403});
  const session=await auth();if(!session?.user||!await checkUserPermission(session.user.id,PERMISSIONS.LISTINGS_VIEW)||!await checkUserPermission(session.user.id,PERMISSIONS.INVENTORY_VIEW_COST))return NextResponse.json({error:"Listing and inventory cost permissions required"},{status:403});
  try{const input=z.object({marketplace:z.literal("WEBSITE"),shopId:z.literal(websiteChannel.shopId),payload:productSchema,id:z.string().optional(),revision:z.number().int().positive().optional()}).strict().parse(await req.json());
    const item=await prisma.inventory.findUnique({where:{id:input.payload.inventoryId},select:{sku:true,costPrice:true,status:true,pieces:true}});
    if(!item||item.sku!==input.payload.sku)throw new Error("Inventory reference and SKU do not match");
    if(input.payload.status==="deleted")throw new Error("Use Website Management to remove listings");
    if(input.payload.status==="published"&&item.status!=="IN_STOCK")throw new Error("Only in-stock inventory can be published");
    if(input.id){const existing=(await listRecords("products")).find(p=>p.id===input.id);if(!existing||existing.payload.status==="deleted"||existing.payload.inventoryId!==input.payload.inventoryId)throw new Error("Existing listing reference does not match");}
    const source=await loadWebsiteListingSource(input.payload.inventoryId,Boolean(input.id));
    if(input.payload.images.some(url=>!source.mediaAssets.some(a=>a.type==='IMAGE'&&a.mediaUrl===url))||input.payload.videos.some(url=>!source.mediaAssets.some(a=>a.type==='VIDEO'&&a.mediaUrl===url)))throw new Error("Select media from this inventory item or its website media library");
    if(input.payload.quantity>item.pieces)throw new Error("Listing quantity cannot exceed the ERP stock quantity");
    const tiers=[...input.payload.volumeTiers].sort((a,b)=>a.quantity-b.quantity);let previous=input.payload.price;for(const tier of tiers){if(tier.quantity>input.payload.quantity)throw new Error("Volume threshold exceeds the available listing quantity");if(tier.unitPrice>previous)throw new Error("A volume price must not exceed the preceding price");previous=tier.unitPrice;}
    const id=await saveRecord("products",{...input.payload,slug:websiteSlug(input.payload.title,item.sku),cost:source.cost,charges:source.charges},session.user.id,input.id,input.revision);return NextResponse.json({id,marketplace:"WEBSITE",shopName:websiteChannel.shopName});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Listing failed"},{status:400});}
}
