import {NextRequest,NextResponse} from 'next/server';
import {auth} from '@/lib/auth';
import {checkUserPermission,PERMISSIONS} from '@/lib/permissions';
import {prisma} from '@/lib/prisma';
import type {Prisma} from '@prisma/client';
import {buildReadyToSellWhere} from '@/lib/inventory-ready-to-sell';
import {listRecords,websiteEnabled} from '@/lib/website/store';
export const dynamic='force-dynamic';
export async function GET(req:NextRequest){
 const session=await auth();if(!websiteEnabled()||!session?.user||!await checkUserPermission(session.user.id,PERMISSIONS.INVENTORY_VIEW)||!await checkUserPermission(session.user.id,PERMISSIONS.LISTINGS_VIEW))return NextResponse.json({error:'Unavailable'},{status:403});
 try{
 const sp=req.nextUrl.searchParams,records=await listRecords('products');
 const exclusions=records.filter(r=>r.payload.status!=='deleted').map(r=>String(r.payload.inventoryId));
 const where:Prisma.InventoryWhereInput={AND:[buildReadyToSellWhere()],id:{notIn:exclusions}};
 const q=(sp.get('q')||'').trim();if(q)where.OR=[{sku:{contains:q}},{itemName:{contains:q}},{gemType:{contains:q}}];
 for(const key of ['category','gemType','color'] as const){const value=sp.get(key);if(value)where[key]=value;}
 if(sp.get('status')&&sp.get('status')!=='IN_STOCK')return NextResponse.json({items:[],total:0,page:1});
 const numeric=(key:string)=>{const v=sp.get(key);return v&&Number.isFinite(Number(v))?Number(v):undefined;};
 const min=numeric('minPrice'),max=numeric('maxPrice');if(min!==undefined||max!==undefined)where.sellingPrice={gte:min,lte:max};
 const date=(key:string)=>{const v=sp.get(key);return v&&!Number.isNaN(Date.parse(v))?new Date(v):undefined;};const from=date('createdFrom'),to=date('createdTo');if(from||to)where.createdAt={gte:from,lte:to};
 const page=Math.max(1,Math.floor(numeric('page')||1)),pageSize=Math.min(100,Math.max(10,Math.floor(numeric('pageSize')||25)));
 const orders:Record<string,Prisma.InventoryOrderByWithRelationInput>={sku_asc:{sku:'asc'},sku_desc:{sku:'desc'},name_asc:{itemName:'asc'},price_asc:{sellingPrice:'asc'},price_desc:{sellingPrice:'desc'},createdAt_asc:{createdAt:'asc'}};
 const [total,items]=await Promise.all([prisma.inventory.count({where}),prisma.inventory.findMany({where,orderBy:orders[sp.get('sort')||'']||{createdAt:'desc'},skip:(page-1)*pageSize,take:pageSize,select:{id:true,sku:true,itemName:true,category:true,gemType:true,color:true,shape:true,etsyDescription:true,imageUrl:true,sellingPrice:true,weightValue:true,weightUnit:true,status:true,createdAt:true,media:{where:{type:'IMAGE'},orderBy:{isPrimary:'desc'},take:1,select:{mediaUrl:true}}}})]);
 return NextResponse.json({items:items.map(({media,...item})=>({...item,imageUrl:item.imageUrl||media[0]?.mediaUrl||null})),total,page,pageSize},{headers:{'Cache-Control':'no-store'}});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Inventory search unavailable'},{status:503});}
}
