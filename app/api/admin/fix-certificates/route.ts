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

    const logs = [];

    // 1. Create CertificateCode table
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "CertificateCode" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "name" TEXT NOT NULL,
            "code" TEXT NOT NULL,
            "remarks" TEXT,
            "status" TEXT NOT NULL DEFAULT 'ACTIVE',
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" DATETIME NOT NULL
        );
      `);
      logs.push("Checked/Created CertificateCode table");
    } catch (e: any) {
      logs.push(`Error creating CertificateCode table: ${e.message}`);
    }

    // 2. Create _CertificateCodeToInventory table
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "_CertificateCodeToInventory" (
            "A" TEXT NOT NULL,
            "B" TEXT NOT NULL
        );
      `);
      logs.push("Checked/Created _CertificateCodeToInventory table");
    } catch (e: any) {
      logs.push(`Error creating _CertificateCodeToInventory table: ${e.message}`);
    }

    // 3. Create Indices
    const indices = [
      `CREATE UNIQUE INDEX IF NOT EXISTS "CertificateCode_name_key" ON "CertificateCode"("name");`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "CertificateCode_code_key" ON "CertificateCode"("code");`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "_CertificateCodeToInventory_AB_unique" ON "_CertificateCodeToInventory"("A", "B");`,
      `CREATE INDEX IF NOT EXISTS "_CertificateCodeToInventory_B_index" ON "_CertificateCodeToInventory"("B");`
    ];

    for (const idxSql of indices) {
      try {
        await prisma.$executeRawUnsafe(idxSql);
        logs.push(`Executed index: ${idxSql.substring(0, 50)}...`);
      } catch (e: any) {
        logs.push(`Error creating index: ${e.message}`);
      }
    }

    // 4. Verify
    const tables = await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table' AND name IN ('CertificateCode', '_CertificateCodeToInventory');`;

    return NextResponse.json({
      status: 'success',
      message: 'Database schema update attempted',
      logs,
      tables
    });

  } catch (error: any) {
    console.error('Fix DB Route Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
