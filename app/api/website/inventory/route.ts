import {NextRequest,NextResponse} from 'next/server';
import {auth} from '@/lib/auth';
import {checkUserPermission,PERMISSIONS} from '@/lib/permissions';
import {websiteEnabled} from '@/lib/website/store';
import {prisma} from '@/lib/prisma';
import {loadWebsiteListingSource} from '@/lib/website/listing-source';
export const dynamic='force-dynamic';
export async function GET(req:NextRequest){
 const session=await auth();if(!websiteEnabled()||!session?.user||!await checkUserPermission(session.user.id,PERMISSIONS.LISTINGS_VIEW)||!await checkUserPermission(session.user.id,PERMISSIONS.INVENTORY_VIEW_COST))return NextResponse.json({error:'Listing and inventory cost access required'},{status:403});
 try{const sku=req.nextUrl.searchParams.get('sku')?.trim();if(!sku||sku.length>100)throw new Error('Enter an exact SKU');const item=await prisma.inventory.findUnique({where:{sku},select:{id:true}});if(!item)throw new Error('SKU not found');return NextResponse.json(await loadWebsiteListingSource(item.id,req.nextUrl.searchParams.get('edit')==='1'),{headers:{'Cache-Control':'no-store'}});}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Inventory facts unavailable'},{status:400});}
}
