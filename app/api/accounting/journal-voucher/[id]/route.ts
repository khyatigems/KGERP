import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateJournalVoucherPDF } from '@/lib/journal-voucher-pdf';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    if (!id) {
      return new NextResponse('Journal Entry ID is required', { status: 400 });
    }

    const journalEntry = await prisma.journalEntry.findUnique({
      where: { id },
      include: {
        lines: {
          include: {
            account: true,
          },
          orderBy: { debit: 'desc' }, // Debits first, then Credits
        },
        createdBy: { select: { name: true } },
      },
    });

    if (!journalEntry) {
      return new NextResponse('Journal Entry not found', { status: 404 });
    }

    const companySettings = await prisma.companySettings.findFirst();

    if (!companySettings) {
      return new NextResponse('Company settings not found', { status: 500 });
    }

    const pdfData = {
      id: journalEntry.id,
      date: journalEntry.date,
      description: journalEntry.description,
      referenceType: journalEntry.referenceType,
      referenceId: journalEntry.referenceId,
      createdBy: journalEntry.createdBy.name,
      companyName: companySettings.companyName,
      companyAddress: companySettings.address || companySettings.addressLine1 || '',
      companyPhone: companySettings.phone,
      companyEmail: companySettings.email,
      logoUrl: companySettings.logoUrl, // Assuming logoUrl exists in CompanySettings
      lines: journalEntry.lines.map(line => ({
        accountName: line.account.name,
        accountCode: line.account.code,
        description: line.description,
        debit: line.debit,
        credit: line.credit,
      })),
      // Assuming `isReversed` field exists on JournalEntry if it's a concept to be displayed.
      // For now, let's assume it doesn't exist and we'll add it if needed.
      // For now, if the JournalEntry description contains 'reversal' or 'reversed', we'll mark it as reversed.
      isReversed: journalEntry.description.toLowerCase().includes('reversal') || journalEntry.description.toLowerCase().includes('reversed'),
    };

    const pdfBlob = await generateJournalVoucherPDF(pdfData);

    return new NextResponse(pdfBlob, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="JournalVoucher-${journalEntry.id.substring(0, 8).toUpperCase()}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating journal voucher PDF:', error);
    return new NextResponse('Failed to generate PDF', { status: 500 });
  }
}
