-- Additive only. Original DashboardNote records and content are preserved.
CREATE TABLE IF NOT EXISTS "NoteDetails" (
 "noteId" TEXT NOT NULL PRIMARY KEY,
 "title" TEXT NOT NULL DEFAULT '', "category" TEXT NOT NULL DEFAULT 'General',
 "tags" TEXT NOT NULL DEFAULT '', "kind" TEXT NOT NULL DEFAULT 'Note',
 "pinned" BOOLEAN NOT NULL DEFAULT false, "favorite" BOOLEAN NOT NULL DEFAULT false,
 "state" TEXT NOT NULL DEFAULT 'active', "uses" INTEGER NOT NULL DEFAULT 0,
 "shareToken" TEXT, "attachments" TEXT NOT NULL DEFAULT '[]'
);
