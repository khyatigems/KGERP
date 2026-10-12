import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { listWebsiteOrders, saveWebsiteOrder, websiteEnabled } from "@/lib/website/store";

export const dynamic = "force-dynamic";
const lineSchema=z.object({id:z.string().min(1).max(100),sku:z.string().min(1).max(100),title:z.string().min(1).max(180),quantity:z.number().int().min(1).max(100000),unitPricePaise:z.number().int().positive(),amountPaise:z.number().int().positive()}).strict();
const customerSchema=z.object({name:z.string().trim().min(2).max(160),email:z.string().trim().email().max(254),phone:z.string().trim().min(6).max(40),address1:z.string().trim().min(3).max(180),address2:z.string().trim().max(180).default(''),city:z.string().trim().min(2).max(100),state:z.string().trim().min(2).max(100),postalCode:z.string().trim().min(3).max(20),country:z.literal('IN'),companyName:z.string().trim().max(160).default(''),taxId:z.string().trim().max(40).default('')}).strict();
const pendingSchema=z.object({action:z.literal('pending'),id:z.string().uuid(),razorpayOrderId:z.string().regex(/^order_[A-Za-z0-9]+$/).max(40),mode:z.literal('test'),amountPaise:z.number().int().positive().max(10000000000),currency:z.literal('INR'),customer:customerSchema,items:z.array(lineSchema).min(1).max(100)}).strict();
const paidSchema=z.object({action:z.literal('paid'),id:z.string().uuid(),razorpayOrderId:z.string().regex(/^order_[A-Za-z0-9]+$/).max(40),razorpayPaymentId:z.string().regex(/^pay_[A-Za-z0-9]+$/).max(40),mode:z.literal('test'),amountPaise:z.number().int().positive().max(10000000000),currency:z.literal('INR')}).strict();
function authorized(req:NextRequest){const expected=process.env.WEBSITE_FEED_TOKEN;const supplied=req.headers.get('authorization')?.replace(/^Bearer /,'')||'';return Boolean(websiteEnabled()&&expected&&expected.length>=32&&Buffer.byteLength(supplied)===Buffer.byteLength(expected)&&timingSafeEqual(Buffer.from(supplied),Buffer.from(expected)));}

export async function GET(){
  if(!websiteEnabled())return NextResponse.json({error:'Unavailable'},{status:503});
  const session=await auth();if(!session?.user||!await checkUserPermission(session.user.id,PERMISSIONS.SETTINGS_MANAGE))return NextResponse.json({error:'Unavailable'},{status:403});
  try{return NextResponse.json({orders:await listWebsiteOrders()},{headers:{'Cache-Control':'no-store'}});}catch{return NextResponse.json({error:'Website order storage is not ready.'},{status:503});}
}

export async function POST(req:NextRequest){
  if(!authorized(req))return NextResponse.json({error:'Unavailable'},{status:403});
  try{
    const input=await req.json();const data=input?.action==='pending'?pendingSchema.parse(input):paidSchema.parse(input);
    if(data.action==='pending'&&(data.items.some(item=>item.amountPaise!==item.unitPricePaise*item.quantity)||data.items.reduce((sum,item)=>sum+item.amountPaise,0)!==data.amountPaise))throw new Error('Order line totals do not match the payment amount');
    const {action,...order}=data;
    await saveWebsiteOrder({...order,status:action,payload:action==='pending'?{currency:data.currency,customer:data.customer,items:data.items,receipt:data.id}:{}});
    return NextResponse.json({saved:true});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Unable to store website order'},{status:400});}
}
