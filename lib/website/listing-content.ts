import { buildEbayStaticDescription } from "@/lib/marketplace/ebay-description-html";
import sanitizeHtml from "sanitize-html";
export function websiteSlug(title:string,sku:string) {
  const part=(value:string)=>value.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
  return `${part(title).slice(0,135).replace(/-$/,'') || 'gemstone'}-${part(sku) || 'item'}`.slice(0,180).replace(/-$/,'');
}
export function sanitizeWebsiteDescription(html:string) { return buildEbayStaticDescription(html); }
// Product media belongs only in the listing gallery. This also cleans legacy HTML on read.
export function sanitizeWebsiteProductDescription(html:string){
  return sanitizeHtml(buildEbayStaticDescription(html),{allowedTags:sanitizeHtml.defaults.allowedTags.concat(['font','center']),allowedAttributes:{'*':['style','class','align'],a:['href','title','rel'],td:['colspan','rowspan'],th:['colspan','rowspan'],table:['width','cellpadding','cellspacing','border'],font:['color','size','face']},allowedSchemes:['https','mailto'],allowProtocolRelative:false}).replace(/<h[1-6][^>]*>[^<]*(?:📸\s*)?Product Photos[^<]*<\/h[1-6]>/gi,'');
}
export function websiteDescriptionText(html:string) {
  return sanitizeHtml(html,{allowedTags:[],allowedAttributes:{}}).replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim().slice(0,20000);
}
export function generateWebsiteContent(sku:string,attributes:Record<string,string>,html:string) {
  const variety=attributes.variety?.trim()||attributes.material?.trim();
  if(!variety)throw new Error("The saved gemstone name is missing. Enter Gemstone variety before generating content.");
  const title=[variety,attributes.carat?`${attributes.carat} ct`:attributes.weight,attributes.shape].filter(Boolean).join(' · ').slice(0,180);
  const descriptionHtml=sanitizeWebsiteProductDescription(html);
  const details=Object.entries(attributes).filter(([,value])=>value).map(([key,value])=>`${key}: ${value}`).join('. ');
  return {title,slug:websiteSlug(title,sku),description:websiteDescriptionText(descriptionHtml)||`${title}. ${details}.`,descriptionHtml,seoTitle:`${title} | KhyatiGems`.slice(0,180),metaDescription:`Explore ${title} at KhyatiGems. View photographs, measurements and recorded gemstone details.`.slice(0,160),imageAlt:`${title} — product photograph`.slice(0,250)};
}
