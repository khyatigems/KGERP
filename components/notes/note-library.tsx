"use client";

import { useState } from "react";
import {
  Archive,
  ArrowUpRight,
  BookOpen,
  CheckSquare,
  ChevronDown,
  Copy,
  FileText,
  LayoutGrid,
  List,
  Loader2,
  MoreHorizontal,
  Pin,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { KnowledgeNote } from "@/lib/notes";

export const noteCategories = [
  "General",
  "Gemstone photography",
  "AI & prompts",
  "SEO & marketplaces",
  "Business strategy",
  "Operations",
  "Technical documentation",
];
const filters = [
  { name: "All notes", icon: BookOpen },
  { name: "Pinned", icon: Pin },
  { name: "Favourites", icon: Star },
  { name: "Prompts & templates", icon: Sparkles },
  { name: "Archive", icon: Archive },
  { name: "Trash", icon: Trash2 },
];
export function noteAppearance(kind: string) {
  if (kind === "Prompt")
    return { icon: Sparkles, className: "bg-primary/10 text-primary" };
  if (kind === "Template")
    return {
      icon: Copy,
      className: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    };
  if (kind === "Documentation")
    return {
      icon: FileText,
      className: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
    };
  if (kind === "Checklist")
    return {
      icon: CheckSquare,
      className: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
    };
  return { icon: BookOpen, className: "bg-muted text-muted-foreground" };
}
export function noteTitle(note: KnowledgeNote) {
  if (note.title) return note.title;
  const firstLine = note.content
    .split("\n")
    .find((line) => line.trim())
    ?.trim();
  return firstLine
    ? firstLine.length > 140
      ? `${firstLine.slice(0, 140)}�`
      : firstLine
    : "Untitled note";
}
function updatedLabel(date: string) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

type Props = {
  notes: KnowledgeNote[];
  isLoading: boolean;
  error: unknown;
  pendingId: string | null;
  onRetry: () => void;
  onCreate: (kind?: string) => void;
  onOpen: (note: KnowledgeNote) => void;
  onCopy: (note: KnowledgeNote) => void;
  onUpdate: (note: KnowledgeNote, patch: Partial<KnowledgeNote>) => void;
  onDuplicate: (note: KnowledgeNote) => void;
};
export function NoteLibrary({
  notes,
  isLoading,
  error,
  pendingId,
  onRetry,
  onCreate,
  onOpen,
  onCopy,
  onUpdate,
  onDuplicate,
}: Props) {
  const [view, setView] = useState("All notes"),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState(""),
    [sort, setSort] = useState("updated");
  const [layout, setLayout] = useState("grid");
  const allCategories = Array.from(
    new Set([...noteCategories, ...notes.map((n) => n.category)]),
  );
  const matchesView = (n: KnowledgeNote, filter: string) => {
    if (
      n.state !==
      (filter === "Archive"
        ? "archived"
        : filter === "Trash"
          ? "trash"
          : "active")
    )
      return false;
    return filter === "Pinned"
      ? n.pinned
      : filter === "Favourites"
        ? n.favorite
        : filter === "Prompts & templates"
          ? ["Prompt", "Template"].includes(n.kind)
          : true;
  };
  const visible = notes
    .filter(
      (n) =>
        matchesView(n, view) &&
        (!category || n.category === category) &&
        `${n.title} ${n.content} ${n.tags} ${n.category}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
    )
    .sort((a, b) =>
      sort === "used"
        ? b.uses - a.uses
        : sort === "title"
          ? noteTitle(a).localeCompare(noteTitle(b))
          : new Date(sort === "created" ? b.createdAt : b.updatedAt).getTime() -
            new Date(sort === "created" ? a.createdAt : a.updatedAt).getTime(),
    );
  const pinned = view === "All notes" ? visible.filter((n) => n.pinned) : [];
  const rest =
    view === "All notes" ? visible.filter((n) => !n.pinned) : visible;
  const hasFilters = !!query || !!category;
  const clear = () => {
    setQuery("");
    setCategory("");
  };
  const card = (note: KnowledgeNote) => {
    const { icon: Icon, className } = noteAppearance(note.kind);
    const pending = pendingId === note.id;
    return (
      <article
        key={note.id}
        data-note-card={note.id}
        className={`group relative min-w-0 overflow-hidden rounded-xl border border-border/70 bg-card transition-[border-color,box-shadow] hover:border-primary/40 hover:shadow-sm ${layout === "list" ? "flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3" : "flex flex-col"}`}
      >
        <button
          disabled={pending}
          onClick={() => onOpen(note)}
          aria-label={`Open ${noteTitle(note)}`}
          className={`min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${layout === "list" ? "flex flex-1 items-center gap-4" : "flex-1 p-5 pb-4"}`}
        >
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${className} ${layout === "grid" ? "mb-4" : ""}`}
          >
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex min-w-0 items-center gap-2 text-[11px] font-medium text-muted-foreground">
              <span>{note.kind}</span>
              <span aria-hidden="true">/</span>
              <span className="truncate">{note.category || "General"}</span>
              {note.pinned && (
                <Pin className="ml-auto h-3 w-3 shrink-0 text-primary" />
              )}
            </div>
            <h2
              className={`break-words font-semibold leading-snug tracking-tight text-foreground ${layout === "list" ? "line-clamp-1 text-sm" : "line-clamp-2 text-base"}`}
            >
              {noteTitle(note)}
            </h2>
            <p
              className={`mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground ${layout === "list" ? "line-clamp-1" : "line-clamp-4 min-h-[5.7rem]"}`}
            >
              {note.content || "This note is ready for your ideas."}
            </p>
            {layout === "grid" && (
              <div className="mt-4 flex min-h-5 flex-wrap gap-1.5">
                {Array.from(
                  new Set(
                    note.tags
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean),
                  ),
                )
                  .slice(0, 3)
                  .map((tag) => (
                    <span
                      key={tag}
                      className="max-w-full truncate rounded-md bg-muted/70 px-2 py-0.5 text-[10px] text-muted-foreground"
                    >
                      #{tag}
                    </span>
                  ))}
              </div>
            )}
          </div>
        </button>
        <div
          className={`flex items-center gap-1 ${layout === "list" ? "ml-auto" : "mx-5 border-t border-border/60 py-3"}`}
        >
          <div className="mr-auto min-w-0 pr-2 text-[11px] text-muted-foreground">
            <span className="block truncate" title={note.createdBy.name}>
              Updated {updatedLabel(note.updatedAt)}
            </span>
            {layout === "grid" && (
              <span className="mt-0.5 block truncate text-[10px]">
                {note.createdBy.name}
                {note.uses > 0 ? ` · Copied ${note.uses}×` : ""}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            title={
              ["Prompt", "Template"].includes(note.kind)
                ? "Copy prompt"
                : "Copy note"
            }
            aria-label={`Copy ${noteTitle(note)}`}
            disabled={pending}
            onClick={() => onCopy(note)}
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 shrink-0 ${note.favorite ? "text-amber-600 dark:text-amber-300" : "text-muted-foreground"}`}
            aria-label={`${note.favorite ? "Unfavourite" : "Favourite"} ${noteTitle(note)}`}
            aria-pressed={note.favorite}
            title="Favourite"
            disabled={pending}
            onClick={() => onUpdate(note, { favorite: !note.favorite })}
          >
            <Star
              className={`h-3.5 w-3.5 ${note.favorite ? "fill-current" : ""}`}
            />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                aria-label={`More actions for ${noteTitle(note)}`}
                disabled={pending}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onOpen(note)}>
                <ArrowUpRight />
                Open note
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => onUpdate(note, { pinned: !note.pinned })}
              >
                <Pin />
                {note.pinned ? "Unpin note" : "Pin note"}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onDuplicate(note)}>
                <Copy />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() =>
                  onUpdate(note, {
                    state: note.state === "active" ? "archived" : "active",
                  })
                }
              >
                {note.state === "active" ? <Archive /> : <RotateCcw />}
                {note.state === "active" ? "Archive" : "Restore note"}
              </DropdownMenuItem>
              {note.state !== "trash" && (
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => onUpdate(note, { state: "trash" })}
                >
                  <Trash2 />
                  Move to trash
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </article>
    );
  };
  const group = (items: KnowledgeNote[]) => (
    <div
      className={
        layout === "grid"
          ? "grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3"
          : "space-y-2"
      }
    >
      {items.map(card)}
    </div>
  );
  return (
    <div className="space-y-6 pb-8" data-notes-library>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            <BookOpen className="h-4 w-4" />
            TEAM KNOWLEDGE
          </div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Notes
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Keep useful ideas close. Find the right words, prompt or plan when
            you need it.
          </p>
        </div>
        <div className="flex shrink-0">
          <Button
            className="rounded-r-none"
            onClick={() => onCreate()}
            disabled={!!pendingId}
          >
            <Plus className="mr-2 h-4 w-4" />
            New note
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="rounded-l-none border-l border-primary-foreground/25 px-2.5"
                aria-label="Choose note type"
                disabled={!!pendingId}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {["Prompt", "Template", "Documentation", "Checklist"].map(
                (kind) => {
                  const Icon = noteAppearance(kind).icon;
                  return (
                    <DropdownMenuItem
                      key={kind}
                      onSelect={() => onCreate(kind)}
                    >
                      <Icon />
                      New {kind.toLowerCase()}
                    </DropdownMenuItem>
                  );
                },
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <div className="space-y-4">
        <nav
          aria-label="Notes views"
          className="flex gap-1 overflow-x-auto border-b border-border pb-3"
        >
          {filters.map(({ name, icon: Icon }) => (
            <button
              key={name}
              aria-current={view === name ? "page" : undefined}
              onClick={() => setView(name)}
              className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition-colors sm:text-sm ${name === "Archive" ? "sm:ml-auto" : ""} ${view === name ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
            >
              <Icon className="h-3.5 w-3.5" />
              {name}
              <span
                className={`ml-0.5 rounded px-1.5 py-0.5 text-[10px] tabular-nums ${view === name ? "bg-primary/10" : "bg-muted"}`}
              >
                {notes.filter((n) => matchesView(n, name)).length}
              </span>
            </button>
          ))}
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-full flex-1 sm:min-w-[180px] sm:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              aria-label="Search notes"
              placeholder="Search notes, prompts or tags…"
              className="h-10 bg-card pl-9 pr-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                aria-label="Clear search"
                className="absolute right-3 top-3 text-muted-foreground"
                onClick={() => setQuery("")}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Select
            value={category || "all"}
            onValueChange={(v) => setCategory(v === "all" ? "" : v)}
          >
            <SelectTrigger
              aria-label="Filter category"
              className="h-10 min-w-0 flex-1 bg-card sm:w-48 sm:flex-none"
            >
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {allCategories.filter(Boolean).map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger
              aria-label="Sort notes"
              className="h-10 min-w-0 flex-1 bg-card sm:ml-auto sm:w-44 sm:flex-none"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated">Recently updated</SelectItem>
              <SelectItem value="created">Recently created</SelectItem>
              <SelectItem value="used">Most copied</SelectItem>
              <SelectItem value="title">Title A–Z</SelectItem>
            </SelectContent>
          </Select>
          <div
            className="flex h-10 items-center rounded-lg border bg-card p-1"
            role="group"
            aria-label="Note layout"
          >
            {[
              { value: "grid", Icon: LayoutGrid, label: "Card view" },
              { value: "list", Icon: List, label: "List view" },
            ].map(({ value, Icon, label }) => (
              <button
                key={value}
                aria-label={label}
                aria-pressed={layout === value}
                onClick={() => setLayout(value)}
                className={`rounded-md p-1.5 ${layout === value ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>
      </div>
      {view === "Trash" && (
        <p className="rounded-lg border border-border/70 bg-card px-4 py-3 text-sm text-muted-foreground">
          Deleted notes stay here until you restore them. Public links are
          revoked when a note is deleted.
        </p>
      )}
      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-card p-6 text-sm"
        >
          We couldn’t load your notes.{" "}
          <button className="ml-2 underline" onClick={onRetry}>
            Try again
          </button>
        </div>
      ) : isLoading ? (
        <div
          aria-label="Loading notes"
          className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3"
        >
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-64 animate-pulse rounded-xl border bg-muted/40"
            />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed bg-card/40 p-8 text-center">
          <BookOpen className="mb-4 h-7 w-7 text-muted-foreground" />
          <h2 className="text-lg font-semibold">
            {hasFilters
              ? "No matching notes"
              : view === "All notes"
                ? "Start with something worth keeping"
                : `No ${view.toLowerCase()} yet`}
          </h2>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
            {hasFilters
              ? "Try a different word or category to find what you saved."
              : view === "All notes"
                ? "Save an idea, a business reference or your next reusable prompt."
                : "Your notes will appear here as you organise them."}
          </p>
          <Button
            variant="outline"
            className="mt-5"
            onClick={hasFilters ? clear : () => onCreate()}
          >
            {hasFilters ? "Clear filters" : "Create a note"}
          </Button>
        </div>
      ) : (
        <div className="space-y-7">
          {pinned.length > 0 && (
            <section aria-label="Pinned notes">
              <div className="mb-3 flex items-center gap-2">
                <Pin className="h-3.5 w-3.5 text-primary" />
                <h2 className="text-xs font-semibold uppercase tracking-wider">
                  Pinned
                </h2>
                <span className="text-xs text-muted-foreground">
                  {pinned.length}
                </span>
              </div>
              {group(pinned)}
            </section>
          )}
          {rest.length > 0 && (
            <section
              aria-label={view === "All notes" ? "All other notes" : view}
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider">
                  {view === "All notes"
                    ? pinned.length
                      ? "Other notes"
                      : "Your notes"
                    : view}
                </h2>
                <span className="text-xs text-muted-foreground">
                  {rest.length} {rest.length === 1 ? "note" : "notes"}
                  {hasFilters ? " found" : ""}
                </span>
              </div>
              {group(rest)}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
