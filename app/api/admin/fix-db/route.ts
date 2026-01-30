import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Check if column exists
    try {
      // Use $queryRaw for SQLite compatibility check
      const result = await prisma.$queryRaw`PRAGMA table_info(LabelPrintJobItem);` as any[];
      const hasColumn = result.some((col: any) => col.name === 'internalName');

      if (hasColumn) {
        return NextResponse.json({ 
          status: 'success', 
          message: 'Column internalName already exists. No action needed.',
          columns: result.map(c => c.name)
        });
      }

      // 2. Add column if missing
      console.log('Column internalName missing. Attempting to add...');
      await prisma.$executeRawUnsafe(`ALTER TABLE "LabelPrintJobItem" ADD COLUMN "internalName" TEXT;`);
      
      return NextResponse.json({ 
        status: 'success', 
        message: 'Successfully added internalName column to LabelPrintJobItem table.' 
      });

    } catch (dbError: any) {
      console.error('Database operation failed:', dbError);
      return NextResponse.json({ 
        error: 'Database operation failed', 
        details: dbError.message 
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Fix DB Route Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
