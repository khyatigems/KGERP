import {NextRequest,NextResponse} from 'next/server';
import {auth} from '@/lib/auth';
import {checkUserPermission,PERMISSIONS} from '@/lib/permissions';
import {websiteEnabled} from '@/lib/website/store';
import {loadWebsiteListingSource} from '@/lib/website/listing-source';
import {generateWebsiteContent} from '@/lib/website/listing-content';
import {websiteEbayHtml} from '@/lib/website/ebay-content';
import {z} from 'zod';
export async function POST(req:NextRequest){
 const session=await auth();if(!websiteEnabled()||req.headers.get('origin')!==req.nextUrl.origin||!session?.user||!await checkUserPermission(session.user.id,PERMISSIONS.LISTINGS_VIEW)||!await checkUserPermission(session.user.id,PERMISSIONS.INVENTORY_VIEW_COST))return NextResponse.json({error:'Unavailable'},{status:403});
 try{const input=z.object({inventoryId:z.string().min(1),attributes:z.record(z.string().max(100),z.string().max(500)),images:z.array(z.string()).max(14)}).parse(await req.json());const source=await loadWebsiteListingSource(input.inventoryId,true);const a=input.attributes;
 const html=await websiteEbayHtml(source.sku,a,input.images);
 return NextResponse.json(generateWebsiteContent(source.sku,a,html));
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Content generation failed'},{status:400});}
}
