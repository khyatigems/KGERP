import { createClient, type Client } from "@libsql/client";
import { randomUUID } from "node:crypto";
import { schemas, type WebsiteSection, type WebsiteProduct, productSchema, offerSchema, offerProductIds, validatePriceFloor } from "./contracts";
import { sanitizeWebsiteDescription,sanitizeWebsiteProductDescription,websiteDescriptionText } from "./listing-content";
import { collectionSlug } from './presentation';

let client: Client | undefined;
export function websiteEnabled() { return process.env.WEBSITE_MANAGEMENT_ENABLED === "true"; }
export function websiteDb() {
  if (!websiteEnabled()) throw new Error("Website management is disabled");
  const url = process.env.WEBSITE_DATABASE_URL;
  if (!url) throw new Error("Configure a separate WEBSITE_DATABASE_URL");
  const productionUrls = [process.env.DATABASE_URL, process.env.TURSO_DATABASE_URL, process.env.TURSO_URL].filter(Boolean).map(v => v!.split("?")[0]);
  if (productionUrls.includes(url.split("?")[0])) throw new Error("Website database must be separate from the ERP database");
  return client ??= createClient({ url, authToken: process.env.WEBSITE_DATABASE_AUTH_TOKEN });
}
export interface WebsiteRecord { id: string; section: WebsiteSection; payload: Record<string, unknown>; revision: number; }
export interface WebsiteOrder { id: string; razorpayOrderId: string; razorpayPaymentId: string|null; status: 'pending'|'paid'; mode: 'test'|'live'; amountPaise: number; payload: Record<string, unknown>; createdAt: string; updatedAt: string; }
export async function saveWebsiteOrder(input:{id:string;razorpayOrderId:string;razorpayPaymentId?:string;status:'pending'|'paid';mode:'test'|'live';amountPaise:number;payload:Record<string,unknown>}) {
  const db=websiteDb();
  if(input.status==='pending') {
    const result=await db.execute({sql:`INSERT INTO WebsiteOrder(id,razorpayOrderId,status,mode,amountPaise,payload) VALUES(?,?,'pending',?,?,?) ON CONFLICT(razorpayOrderId) DO NOTHING`,args:[input.id,input.razorpayOrderId,input.mode,input.amountPaise,JSON.stringify(input.payload)]});
    if(result.rowsAffected===1)return;
    const existing=await db.execute({sql:'SELECT id,amountPaise FROM WebsiteOrder WHERE razorpayOrderId=?',args:[input.razorpayOrderId]});
    if(!existing.rows[0]||String(existing.rows[0].id)!==input.id||Number(existing.rows[0].amountPaise)!==input.amountPaise)throw new Error('Order reference conflict');
    return;
  }
  if(!input.razorpayPaymentId)throw new Error('Payment reference missing');
  const tx=await db.transaction('write');
  try {
    const result=await tx.execute({sql:'SELECT id,amountPaise,status,razorpayPaymentId,payload FROM WebsiteOrder WHERE razorpayOrderId=?',args:[input.razorpayOrderId]});
    const row=result.rows[0];if(!row||String(row.id)!==input.id||Number(row.amountPaise)!==input.amountPaise)throw new Error('Pending website order not found');
    if(row.status==='paid') {if(row.razorpayPaymentId!==input.razorpayPaymentId)throw new Error('Order is already paid with a different payment');await tx.commit();return;}
    const original=JSON.parse(String(row.payload)) as Record<string,unknown>;
    const payload={...original,paymentId:input.razorpayPaymentId,paidAt:new Date().toISOString()};
    await tx.execute({sql:"UPDATE WebsiteOrder SET status='paid',razorpayPaymentId=?,payload=?,updatedAt=CURRENT_TIMESTAMP WHERE razorpayOrderId=? AND status='pending'",args:[input.razorpayPaymentId,JSON.stringify(payload),input.razorpayOrderId]});
    await tx.commit();
  }catch(error){await tx.rollback();throw error;}finally{tx.close();}
}
export async function listWebsiteOrders():Promise<WebsiteOrder[]> {
  const rows=await websiteDb().execute('SELECT id,razorpayOrderId,razorpayPaymentId,status,mode,amountPaise,payload,createdAt,updatedAt FROM WebsiteOrder ORDER BY createdAt DESC LIMIT 500');
  return rows.rows.map(row=>({id:String(row.id),razorpayOrderId:String(row.razorpayOrderId),razorpayPaymentId:row.razorpayPaymentId?String(row.razorpayPaymentId):null,status:String(row.status) as WebsiteOrder['status'],mode:String(row.mode) as WebsiteOrder['mode'],amountPaise:Number(row.amountPaise),payload:JSON.parse(String(row.payload)),createdAt:String(row.createdAt),updatedAt:String(row.updatedAt)}));
}
export async function listRecords(section: WebsiteSection): Promise<WebsiteRecord[]> {
  const result = await websiteDb().execute({ sql: "SELECT id, section, payload, revision FROM WebsiteRecord WHERE section = ? ORDER BY updatedAt DESC", args: [section] });
  return result.rows.map(row => {const payload=JSON.parse(String(row.payload));if(section==='products')payload.descriptionHtml=sanitizeWebsiteProductDescription(payload.descriptionHtml||'');if(section==='collections')payload.descriptionHtml=sanitizeWebsiteDescription(payload.descriptionHtml||'');return { id: String(row.id), section, payload, revision: Number(row.revision) };});
}
export async function saveRecord(section: WebsiteSection, payload: unknown, actor: string, id?: string, revision?: number) {
  if(section==='collections'){const p=payload as Record<string,unknown>;payload={...p,slug:collectionSlug(String(p.title||''))};}
  const parsed = schemas[section].parse(payload);
  if(section==='products') (parsed as {descriptionHtml:string}).descriptionHtml=sanitizeWebsiteProductDescription((parsed as {descriptionHtml:string}).descriptionHtml);
  if(section==='collections'){const c=parsed as {descriptionHtml:string;description:string;descriptionFormat:string};c.descriptionHtml=sanitizeWebsiteDescription(c.descriptionHtml);if(c.descriptionFormat==='html')c.description=websiteDescriptionText(c.descriptionHtml).slice(0,3000);}
  const tx = await websiteDb().transaction("write");
  try {
    // Validate all affected products inside the same write transaction as the change.
    const result = await tx.execute("SELECT id,section,payload FROM WebsiteRecord WHERE section IN ('products','offers','collections')");
    const recordId = id || randomUUID();
    const rows = result.rows.filter(r => String(r.id) !== recordId).map(r => ({ id: String(r.id), section: String(r.section), payload: JSON.parse(String(r.payload)) }));
    rows.push({ id: recordId, section, payload: parsed });
    const products = rows.filter(r => r.section === "products").map(r => ({ id: r.id, product: productSchema.parse(r.payload) }));
    if(section==='collections'&&rows.some(r=>r.section==='collections'&&r.id!==recordId&&r.payload.slug===(parsed as {slug:string}).slug))throw new Error('A collection with this title/URL already exists. Use a different title.');
    for (const { product } of products) if(product.status !== "deleted") validatePriceFloor(product);
    for (const row of rows.filter(r => r.section === "offers")) {
      const offer = offerSchema.parse(row.payload);
      if (!offer.enabled) continue;
      if(offer.collectionIds.some(id=>!rows.some(r=>r.section==='collections'&&r.id===id)))throw new Error('Offer references an unknown collection');
      for (const productId of offerProductIds(offer,rows.filter(r=>r.section==='products'),rows.filter(r=>r.section==='collections'))) {
        const match = products.find(p => p.id === productId);
        if (!match) throw new Error("Offer references an unknown website product");
        if(match.product.status !== "deleted") validatePriceFloor(match.product, offer.percent, offer.stackWithVolume);
      }
    }
    if (section === "products") {
      const p = productSchema.parse(parsed);
      if (products.some(r => r.id !== recordId && r.product.status !== "deleted" && (r.product.slug === p.slug || r.product.sku === p.sku))) throw new Error("Website SKU and URL must be unique");
      if (p.status === "published" && !p.images.some(Boolean)) throw new Error("Publishing requires an actual product photograph");
    }
    if(section === "collections") {
      const membership = (parsed as {productIds:string[]}).productIds;
      if(membership.some(member=>!products.some(p=>p.id===member && p.product.status!=="deleted"))) throw new Error("Collection references an unavailable website product");
      for(const {id:productId,product} of products) {
        const next=product.collections.filter(value=>value!==recordId);
        if(membership.includes(productId)) next.push(recordId);
        if(JSON.stringify(next)===JSON.stringify(product.collections)) continue;
        product.collections=next;
        await tx.execute({sql:"UPDATE WebsiteRecord SET payload=?,revision=revision+1,updatedAt=CURRENT_TIMESTAMP WHERE id=?",args:[JSON.stringify(product),productId]});
        await tx.execute({sql:"INSERT INTO WebsiteAudit(id,recordId,actor,payload) VALUES(?,?,?,?)",args:[randomUUID(),productId,actor,JSON.stringify(product)]});
      }
    }
    if (id) {
      const updated = await tx.execute({ sql: "UPDATE WebsiteRecord SET payload=?, revision=revision+1, updatedAt=CURRENT_TIMESTAMP WHERE id=? AND section=? AND revision=?", args: [JSON.stringify(parsed), id, section, revision ?? -1] });
      if (updated.rowsAffected !== 1) throw new Error("This record changed. Reload before saving.");
    } else {
      await tx.execute({ sql: "INSERT INTO WebsiteRecord(id,section,payload,revision) VALUES(?,?,?,1)", args: [recordId,section,JSON.stringify(parsed)] });
    }
    await tx.execute({ sql: "INSERT INTO WebsiteAudit(id,recordId,actor,payload) VALUES(?,?,?,?)", args: [randomUUID(),recordId,actor,JSON.stringify(parsed)] });
    await tx.commit();
    return recordId;
  } catch(error) { await tx.rollback(); throw error; }
  finally { tx.close(); }
}

export async function listWebsiteMedia(inventoryId:string):Promise<{mediaUrl:string;type:'IMAGE'|'VIDEO'}[]> {
  const rows=await websiteDb().execute({sql:"SELECT payload FROM WebsiteRecord WHERE section='media'",args:[]});
  return rows.rows.map(r=>JSON.parse(String(r.payload))).filter(p=>p.inventoryId===inventoryId).map(p=>({mediaUrl:p.mediaUrl,type:p.type}));
}
export async function saveWebsiteMedia(inventoryId:string,mediaUrl:string,type:'IMAGE'|'VIDEO',actor:string) {
  const id=randomUUID(),payload=JSON.stringify({inventoryId,mediaUrl,type});const tx=await websiteDb().transaction('write');
  try{await tx.execute({sql:"INSERT INTO WebsiteRecord(id,section,payload,revision) VALUES(?,'media',?,1)",args:[id,payload]});await tx.execute({sql:"INSERT INTO WebsiteAudit(id,recordId,actor,payload) VALUES(?,?,?,?)",args:[randomUUID(),id,actor,payload]});await tx.commit();}catch(error){await tx.rollback();throw error;}finally{tx.close();}
}

export async function manageProduct(id:string,revision:number,action:"activate"|"deactivate"|"delete"|"collections",collectionIds:string[],actor:string,verifiedPricing?:Pick<WebsiteProduct,'cost'|'charges'>) {
  const tx=await websiteDb().transaction("write");
  try {
    const result=await tx.execute({sql:"SELECT payload,revision FROM WebsiteRecord WHERE id=? AND section='products'",args:[id]});
    if(!result.rows[0]||Number(result.rows[0].revision)!==revision)throw new Error("This listing changed. Reload before updating.");
    const product=productSchema.parse(JSON.parse(String(result.rows[0].payload)));
    if(product.status==="deleted")throw new Error("This listing has been removed. Create a new listing from Marketplace Create Listings.");
    if(action==='activate'&&verifiedPricing){product.cost=verifiedPricing.cost;product.charges=verifiedPricing.charges;}
    if(action==="activate") {if(!product.images.some(Boolean))throw new Error("A product photograph is required");validatePriceFloor(product);const offers=await tx.execute("SELECT payload FROM WebsiteRecord WHERE section='offers'");for(const row of offers.rows){const offer=offerSchema.parse(JSON.parse(String(row.payload)));if(offer.enabled&&offer.productIds.includes(id))validatePriceFloor(product,offer.percent,offer.stackWithVolume);}product.status="published";}
    if(action==="deactivate")product.status="paused";
    if(action==="delete"){product.status="deleted";collectionIds=[];}
    if(action==="collections"||action==="delete"){
      const collections=await tx.execute("SELECT id,payload FROM WebsiteRecord WHERE section='collections'");
      if(collectionIds.some(id=>!collections.rows.some(r=>r.id===id)))throw new Error("Collection not found");
      product.collections=[...new Set(collectionIds)];
      for(const row of collections.rows){const payload=JSON.parse(String(row.payload));const previous=payload.productIds as string[];const next=previous.filter(p=>p!==id);if(collectionIds.includes(String(row.id)))next.push(id);if(JSON.stringify(previous)!==JSON.stringify(next)){payload.productIds=next;await tx.execute({sql:"UPDATE WebsiteRecord SET payload=?,revision=revision+1,updatedAt=CURRENT_TIMESTAMP WHERE id=?",args:[JSON.stringify(payload),String(row.id)]});await tx.execute({sql:"INSERT INTO WebsiteAudit(id,recordId,actor,payload) VALUES(?,?,?,?)",args:[randomUUID(),String(row.id),actor,JSON.stringify(payload)]});}}
    }
    await tx.execute({sql:"UPDATE WebsiteRecord SET payload=?,revision=revision+1,updatedAt=CURRENT_TIMESTAMP WHERE id=?",args:[JSON.stringify(product),id]});
    if(action==='collections'||action==='activate'){
      const result=await tx.execute("SELECT id,section,payload FROM WebsiteRecord WHERE section IN ('products','offers','collections')");const rows=result.rows.map(r=>({id:String(r.id),section:String(r.section),payload:JSON.parse(String(r.payload))}));
      for(const row of rows.filter(r=>r.section==='offers')){const offer=offerSchema.parse(row.payload);if(!offer.enabled)continue;const ids=offerProductIds(offer,rows.filter(r=>r.section==='products'),rows.filter(r=>r.section==='collections'));if(ids.includes(id))validatePriceFloor(product,offer.percent,offer.stackWithVolume);}
    }
    await tx.execute({sql:"INSERT INTO WebsiteAudit(id,recordId,actor,payload) VALUES(?,?,?,?)",args:[randomUUID(),id,actor,JSON.stringify(product)]});
    await tx.commit();
  }catch(error){await tx.rollback();throw error;}finally{tx.close();}
}
