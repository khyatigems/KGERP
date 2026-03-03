import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  if (token !== 'KHYATI_MEDIA_SYNC_SECRET_2026') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const skus = await prisma.inventory.findMany({ select: { sku: true }, where: { sku: { not: undefined } }, orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ skus: skus.map(i => i.sku).filter(Boolean) });
}