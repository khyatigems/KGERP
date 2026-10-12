import { prisma } from "@/lib/prisma";
import { buildReadyToSellWhere } from "@/lib/inventory-ready-to-sell";
import { resolvePurchaseCost } from "@/lib/pricing/engine";
import { websiteEbayHtml } from "./ebay-content";
import { generateWebsiteContent } from "./listing-content";
import { listRecords, listWebsiteMedia } from "./store";
import type { WebsiteProduct } from "./contracts";
export async function loadWebsiteListingSource(inventoryId:string,allowExisting=false) {
  const [item,profiles,records,uploads]=await Promise.all([
    prisma.inventory.findFirst({where:{AND:[{id:inventoryId},buildReadyToSellWhere()]},include:{gemstoneCode:{select:{name:true}},media:{where:{type:{in:['IMAGE','VIDEO']}},orderBy:[{isPrimary:'desc'},{createdAt:'asc'}]}}}),
    // Read-only counterpart of marketplace getDefaultProfile(): no schema ensure or settings writes.
    prisma.marketplaceProfile.findMany({where:{isActive:true},include:{charges:{orderBy:[{sortOrder:'asc'},{createdAt:'asc'}]}}}),
    listRecords('products'),listWebsiteMedia(inventoryId)
  ]);
  if(!item)throw new Error("Select Ready to Sell inventory: in stock with saved image, certificate, description and HSN details.");
  if(!allowExisting&&records.some(r=>r.payload.inventoryId===inventoryId&&r.payload.status!=='deleted'))throw new Error("This SKU already has a website listing or draft. Edit it from Website Management.");
  const profile=profiles.find(p=>p.isDefault)??profiles[0];
  if(!profile)throw new Error("Configure an active ERP pricing profile before creating a website listing. MSP cannot be calculated without it.");
  const cost=resolvePurchaseCost(item);
  const charges:WebsiteProduct['charges']=profile.charges.filter(c=>c.enabled).map(c=>({name:c.name,basis:c.amountType==='PERCENT'?'cost-percent':'flat',value:Number(c.amount)||0}));
  const attributes=Object.fromEntries(Object.entries({variety:item.gemType?.trim()||item.gemstoneCode?.name||item.stoneType||'',carat:item.carats>0?String(item.carats):item.weightValue&&/^(ct|cts|carat|carats)$/i.test(item.weightUnit||'')?String(item.weightValue):'',weight:item.weightValue?`${item.weightValue} ${item.weightUnit||'cts'}`:'',colour:item.color,shape:item.shape,cuttingStyle:item.cut,clarity:item.clarityGrade||item.clarity,treatment:item.treatment,transparency:item.transparency,dimensions:item.dimensionsMm||item.measurements,origin:item.originCountry||item.origin}).filter(([,v])=>v).map(([k,v])=>[k,String(v)]));
  const assets=[...(item.imageUrl?[{mediaUrl:item.imageUrl,type:'IMAGE'}]:[]),...item.media,...(item.videoUrl?[{mediaUrl:item.videoUrl,type:'VIDEO'}]:[]),...uploads].filter((a,i,all)=>all.findIndex(v=>v.mediaUrl===a.mediaUrl)===i).filter(a=>/^https:\/\//.test(a.mediaUrl)||/^\/[^/]/.test(a.mediaUrl));
  // Use the same inventory-driven HTML builder as eBay, excluding private report identifiers.
  const html=await websiteEbayHtml(item.sku,attributes,assets.filter(a=>a.type==='IMAGE').slice(0,14).map(a=>a.mediaUrl));
  const content=attributes.variety?generateWebsiteContent(item.sku,attributes,html):{descriptionHtml:html};
  return {inventoryId:item.id,sku:item.sku,cost,charges,quantity:item.pieces,attributes,images:assets.filter(a=>a.type==='IMAGE').slice(0,14).map(a=>a.mediaUrl),videos:assets.filter(a=>a.type==='VIDEO').slice(0,1).map(a=>a.mediaUrl),mediaAssets:assets,pricingProfile:profile.displayName,...content};
}
