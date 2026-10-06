"use client";

import { useState } from "react";
import useSWR from "swr";
import { StickyNote, Plus, Edit3, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Note {
  id: string;
  content: string;
  color: string;
  position: number;
  createdBy: { name: string };
  createdAt: string;
}

const fetcher = async (url: string): Promise<Note[]> => {
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Failed to load notes (HTTP ${response.status})`);
  const data: unknown = await response.json();
  if (!Array.isArray(data)) throw new Error("The notes response was invalid");
  return data as Note[];
};

const colorMap: Record<string, { darkBg: string; darkBorder: string; darkText: string; lightBg: string; lightBorder: string; lightText: string }> = {
  yellow: { darkBg: "dark:bg-amber-900/20", darkBorder: "dark:border-amber-700/30", darkText: "dark:text-amber-200", lightBg: "bg-amber-50", lightBorder: "border-amber-200", lightText: "text-amber-800" },
  blue: { darkBg: "dark:bg-primary/10", darkBorder: "dark:border-primary/20", darkText: "dark:text-primary", lightBg: "bg-primary/10", lightBorder: "border-primary/20", lightText: "text-primary" },
  green: { darkBg: "dark:bg-emerald-900/20", darkBorder: "dark:border-emerald-700/30", darkText: "dark:text-emerald-200", lightBg: "bg-emerald-50", lightBorder: "border-emerald-200", lightText: "text-emerald-800" },
  purple: { darkBg: "dark:bg-purple-900/20", darkBorder: "dark:border-purple-700/30", darkText: "dark:text-purple-200", lightBg: "bg-purple-50", lightBorder: "border-purple-200", lightText: "text-purple-800" },
  pink: { darkBg: "dark:bg-pink-900/20", darkBorder: "dark:border-pink-700/30", darkText: "dark:text-pink-200", lightBg: "bg-pink-50", lightBorder: "border-pink-200", lightText: "text-pink-800" },
};

export function QuickNotes() {
  const { data: notes, error, isLoading, mutate } = useSWR<Note[]>("/api/dashboard/notes", fetcher);
  const [isAdding, setIsAdding] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [selectedColor, setSelectedColor] = useState("yellow");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const noteColors = ["yellow", "blue", "green", "purple", "pink"];

  const handleAddNote = async () => {
    if (!newNoteContent.trim()) return;
    try {
      const response = await fetch("/api/dashboard/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newNoteContent, color: selectedColor, position: notes ? notes.length : 0 })
      });
      if (!response.ok) throw new Error("Failed to create note");
      setNewNoteContent("");
      setIsAdding(false);
      mutate();
      toast.success("Note added");
    } catch {
      toast.error("Failed to save note");
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      const response = await fetch(`/api/dashboard/notes?id=${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete note");
      mutate();
      toast.success("Note deleted");
    } catch {
      toast.error("Failed to delete note");
    }
  };

  const handleEditNote = async (id: string) => {
    if (!editContent.trim()) return;
    try {
      const response = await fetch("/api/dashboard/notes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, content: editContent })
      });
      if (!response.ok) throw new Error("Failed to update note");
      setEditingId(null);
      setEditContent("");
      mutate();
      toast.success("Note updated");
    } catch {
      toast.error("Failed to update note");
    }
  };

  const sortedNotes = notes ? [...notes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : [];

  return (
    <div className="rounded-xl border border-border bg-card p-4 sass-enter gem-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 dark:text-amber-400">
            <StickyNote className="h-3.5 w-3.5" />
          </div>
          <h2 className="text-sm font-semibold text-foreground">Quick Notes</h2>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setIsAdding(!isAdding)} className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {error ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
          <p className="text-xs text-destructive">Quick Notes couldn&apos;t load. Check your connection and try again.</p>
          <Button size="sm" variant="outline" onClick={() => void mutate()} className="h-7 shrink-0 gap-1.5 text-xs">
            <RefreshCw className="h-3 w-3" /> Retry
          </Button>
        </div>
      ) : isLoading ? (
        <p className="py-3 text-center text-xs text-muted-foreground">Loading notes...</p>
      ) : (
        <div className="space-y-2">
          {isAdding && (
            <div className="rounded-lg border border-border bg-muted/50 p-2.5 space-y-2">
              <Textarea
                placeholder="Write a note..."
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                className="min-h-[48px] text-sm bg-transparent border-0 text-foreground placeholder:text-muted-foreground resize-none focus-visible:ring-0 p-0"
                autoFocus
              />
              <div className="flex items-center justify-between">
                <div className="flex gap-1.5">
                  {noteColors.map((c) => (
                    <button
                      key={c}
                      className={`h-4 w-4 rounded-full bg-${c}-500/40 transition-transform hover:scale-110 ${selectedColor === c ? "ring-2 ring-primary ring-offset-1 ring-offset-background scale-110" : ""}`}
                      onClick={() => setSelectedColor(c)}
                    />
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="ghost" onClick={() => { setIsAdding(false); setNewNoteContent(""); }} className="h-6 px-2 text-[10px] text-muted-foreground">Cancel</Button>
                  <Button size="sm" onClick={handleAddNote} className="h-6 px-2.5 text-[10px]">Add</Button>
                </div>
              </div>
            </div>
          )}

          {sortedNotes.length === 0 && !isAdding && (
            <div className="flex items-center gap-3 rounded-lg border border-dashed border-border/80 bg-muted/20 px-3 py-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                <StickyNote className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-medium text-foreground">No notes yet</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Select + to add a note for your team.</p>
              </div>
            </div>
          )}

          {sortedNotes.map((note) => {
            const colorStyle = colorMap[note.color] || colorMap.yellow;
            const isEditing = editingId === note.id;
            return (
              <div
                key={note.id}
                className={`group relative rounded-lg border p-2.5 transition-all duration-200 hover:shadow-md ${colorStyle.darkBg} ${colorStyle.darkBorder} ${colorStyle.lightBg} ${colorStyle.lightBorder}`}
              >
                {isEditing ? (
                  <div className="space-y-1.5">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="min-h-[40px] text-sm bg-transparent border-0 text-foreground resize-none focus-visible:ring-0 p-0"
                      autoFocus
                    />
                    <div className="flex justify-end gap-1.5">
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-6 px-2 text-[10px] text-muted-foreground">Cancel</Button>
                      <Button size="sm" onClick={() => handleEditNote(note.id)} className="h-6 px-2.5 text-[10px]">Save</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className={`text-sm whitespace-pre-wrap pr-6 ${colorStyle.darkText} ${colorStyle.lightText}`}>{note.content}</p>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(note.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                      </span>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setEditingId(note.id); setEditContent(note.content); }}
                          className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          <Edit3 className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="rounded p-1 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
