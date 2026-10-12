import { prisma } from '@/lib/prisma';
import { buildEbayHtmlDescription } from '@/lib/ebay-description';
import type {WebsiteProduct} from './contracts';
export async function websiteEbayHtml(sku:string,a:WebsiteProduct['attributes'],images:string[]){
 const settings=await prisma.ebaySettings.findFirst();
 const json=(value:string|null|undefined,fallback:unknown)=>{try{return value?JSON.parse(value):fallback;}catch{return fallback;}};
 return buildEbayHtmlDescription({sku,itemName:a.variety||a.material,category:'Loose Gemstones',gemType:a.variety,color:a.colour,shape:a.shape,weightValue:a.carat?Number(a.carat):undefined,weightUnit:'ct',dimensionsMm:a.dimensions,treatment:a.treatment,origin:a.origin,transparency:a.transparency,mediaUrls:[]}, {includeCertificate:false,settings:{companyName:settings?.companyName||'KhyatiGems',tagline:settings?.tagline||undefined,brandLogoUrl:settings?.brandLogoUrl||'/assets/khyati-gems-logo-color-cropped.png',globalBannerImages:json(settings?.globalBannerImages,[]) as string[],categoryImageUrls:json(settings?.categoryImageUrls,{}) as Record<string,string[]>,categoryGemtypeImageUrls:json(settings?.categoryGemtypeImageUrls,{}) as Record<string,string[]>}});
}
