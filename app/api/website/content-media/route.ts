import {NextRequest,NextResponse} from 'next/server';
import {auth} from '@/lib/auth';
import {checkUserPermission,PERMISSIONS} from '@/lib/permissions';
import {saveWebsiteMedia,websiteEnabled} from '@/lib/website/store';
import {uploadWebsiteContent} from '@/lib/website/upload';
export const runtime='nodejs';export const maxDuration=60;
export async function POST(req:NextRequest){
 const session=await auth();if(!websiteEnabled()||req.headers.get('origin')!==req.nextUrl.origin||!session?.user||!await checkUserPermission(session.user.id,PERMISSIONS.SETTINGS_MANAGE))return NextResponse.json({error:'Unavailable'},{status:403});
 try{const form=await req.formData(),file=form.get('file'),section=String(form.get('section')||'');if(!['collections','offers','banners','announcements','checkout'].includes(section)||!(file instanceof File))throw new Error('Choose a website content file');const asset=await uploadWebsiteContent(file,section==='banners');await saveWebsiteMedia(`content:${section}`,asset.mediaUrl,asset.type,session.user.id);return NextResponse.json(asset);}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Upload failed'},{status:400});}
}
