'use server';

import { postJournalEntry, JournalLineInput } from '@/lib/accounting';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

interface ManualJournalEntryInput {
  date: string;
  description: string;
  referenceType?: string;
  referenceId?: string;
  lines: Array<{
    accountId: string; // This will be the UUID from the client
    debit: number;
    credit: number;
    description?: string;
  }>;
}

export async function createManualJournalEntry(input: ManualJournalEntryInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "Unauthorized", entryId: null };
  }

  try {
    const journalLines: JournalLineInput[] = [];
    for (const line of input.lines) {
      // Validate that the accountId (UUID) exists
      const account = await prisma.account.findUnique({
        where: { id: line.accountId, isActive: true },
      });
      if (!account) {
        throw new Error(`Account with ID ${line.accountId} not found or is inactive.`);
      }

      journalLines.push({
        accountId: line.accountId, // Use the UUID directly
        debit: line.debit || 0,
        credit: line.credit || 0,
        description: line.description,
      });
    }

    const entry = await postJournalEntry({
      date: new Date(input.date),
      description: input.description,
      referenceType: input.referenceType || "MANUAL",
      referenceId: input.referenceId || undefined,
      lines: journalLines,
      userId: session.user.id,
    });

    return { success: true, message: "Manual journal entry created successfully.", entryId: entry.id };
  } catch (error: any) {
    console.error("Failed to create manual journal entry:", error);
    return { success: false, message: error.message || "Failed to create manual journal entry.", entryId: null };
  }
}
