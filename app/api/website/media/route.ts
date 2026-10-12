import {NextRequest,NextResponse} from 'next/server';
import {randomUUID} from 'node:crypto';
import {auth} from '@/lib/auth';
import {checkUserPermission,PERMISSIONS} from '@/lib/permissions';
import {websiteEnabled,saveWebsiteMedia} from '@/lib/website/store';
import {prisma} from '@/lib/prisma';
import {uploadToCloudinary} from '@/lib/cloudinary';
import sharp from 'sharp';
export const runtime='nodejs';export const maxDuration=60;
export async function POST(req:NextRequest){
 const session=await auth();if(!websiteEnabled()||req.headers.get('origin')!==req.nextUrl.origin||!session?.user||!await checkUserPermission(session.user.id,PERMISSIONS.LISTINGS_VIEW)||!await checkUserPermission(session.user.id,PERMISSIONS.INVENTORY_EDIT))return NextResponse.json({error:'Listing and inventory edit access required for media upload'},{status:403});
 try{const form=await req.formData(),file=form.get('file'),inventoryId=String(form.get('inventoryId')||'');
 if(!(file instanceof File))throw new Error('Choose an image or MP4 video');
 const video=file.type==='video/mp4';if(!video&&!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Use JPG, PNG, WebP or MP4');
 if(!file.size||file.size>(video?25:10)*1024*1024)throw new Error(video?'Video must be at most 25 MB':'Image must be at most 10 MB');
 if(!await prisma.inventory.findUnique({where:{id:inventoryId},select:{id:true}}))throw new Error('Inventory item not found');
 let buffer:Buffer=Buffer.from(await file.arrayBuffer());if(video){if(buffer.subarray(4,8).toString()!=='ftyp')throw new Error('Invalid MP4 file');}else buffer=await sharp(buffer,{limitInputPixels:40000000}).rotate().resize({width:2400,height:2400,fit:'inside',withoutEnlargement:true}).jpeg({quality:90}).toBuffer();
 const mediaUrl=await uploadToCloudinary(buffer,`website_${randomUUID()}.${video?'mp4':'jpg'}`);if(!mediaUrl.startsWith('https://'))throw new Error('Media hosting did not return a secure URL');
 const type=video?'VIDEO':'IMAGE';await saveWebsiteMedia(inventoryId,mediaUrl,type,session.user.id);return NextResponse.json({mediaUrl,type});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Upload failed'},{status:400});}
}
