import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';

const LEGACY_DESKTOP_APP_TOKEN = 'KHYATI_MEDIA_SYNC_SECRET_2026';

function getDesktopAppToken() {
  return process.env.KHYATI_MEDIA_SYNC_TOKEN || process.env.MEDIA_UPLOAD_TOKEN || LEGACY_DESKTOP_APP_TOKEN;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  if (token !== getDesktopAppToken()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const inventoryItems = await prisma.inventory.findMany({
      select: {
        sku: true,
        imageUrl: true,
        updatedAt: true,
        media: {
          select: {
            mediaUrl: true,
            type: true,
            isPrimary: true,
            createdAt: true
          },
          orderBy: [
            { isPrimary: 'desc' },
            { createdAt: 'asc' }
          ]
        }
      },
      where: { 
        sku: { not: undefined },
        status: 'IN_STOCK' // Correct status from schema
      },
      orderBy: { createdAt: 'desc' }
    });

  const items = inventoryItems
    .filter(item => Boolean(item.sku))
    .map(item => {
      const imageMedia = item.media.filter(media => String(media.type).toUpperCase() === 'IMAGE');
      const videoMedia = item.media.filter(media => String(media.type).toUpperCase() === 'VIDEO');
      const primaryImage = imageMedia.find(media => media.isPrimary)?.mediaUrl || imageMedia[0]?.mediaUrl || item.imageUrl || null;

      return {
        sku: item.sku,
        erpImageCount: imageMedia.length + (item.imageUrl && !imageMedia.some(media => media.mediaUrl === item.imageUrl) ? 1 : 0),
        erpVideoCount: videoMedia.length,
        erpThumbnailUrl: primaryImage,
        erpSyncStatus: primaryImage ? 'synced' : 'pending',
        lastSyncTimestamp: imageMedia[0]?.createdAt?.toISOString() || item.updatedAt?.toISOString() || null
      };
    });

  return NextResponse.json({
    skus: items.map(item => item.sku),
    items
  });
}
