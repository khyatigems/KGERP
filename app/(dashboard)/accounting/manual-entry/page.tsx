import { ManualJournalEntryClientPage } from "./manual-journal-entry-client-page";
import { prisma } from "@/lib/prisma";

export default async function ManualJournalEntryPage() {
  const accounts = await prisma.account.findMany({ where: { isActive: true }, orderBy: { code: "asc" } });

  return (
    <div className="flex flex-col flex-1 space-y-8 p-8">
      <h1 className="text-3xl font-bold tracking-tight">Manual Journal Entry</h1>
      <ManualJournalEntryClientPage accounts={accounts} />
    </div>
  );
}
