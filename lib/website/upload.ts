import sharp from 'sharp';
import {randomUUID} from 'node:crypto';
import {uploadToCloudinary} from '@/lib/cloudinary';
export async function uploadWebsiteContent(file:File,allowVideo:boolean){
 const video=file.type==='video/mp4';if(video&&!allowVideo)throw new Error('This field accepts images only');if(!video&&!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Use JPG, PNG, WebP or MP4');
 if(!file.size||file.size>(video?25:10)*1024*1024)throw new Error(video?'Video must be at most 25 MB':'Image must be at most 10 MB');
 let buffer:Buffer=Buffer.from(await file.arrayBuffer());if(video){if(buffer.subarray(4,8).toString()!=='ftyp')throw new Error('Invalid MP4 file');}else buffer=await sharp(buffer,{limitInputPixels:40000000}).rotate().resize({width:2400,height:2400,fit:'inside',withoutEnlargement:true}).jpeg({quality:90}).toBuffer();
 const mediaUrl=await uploadToCloudinary(buffer,`website_content_${randomUUID()}.${video?'mp4':'jpg'}`);if(!mediaUrl.startsWith('https://'))throw new Error('Media hosting did not return a secure URL');return {mediaUrl,type:video?'VIDEO' as const:'IMAGE' as const};
}
