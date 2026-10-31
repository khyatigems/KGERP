"use client";

import { useRef, useState, type RefObject } from "react";
import {
  ArrowLeft,
  Archive,
  Check,
  ChevronDown,
  CircleAlert,
  Copy,
  Download,
  Loader2,
  MoreHorizontal,
  Paperclip,
  Pin,
  RotateCcw,
  Share2,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
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
import { toast } from "@/lib/erp-feedback";
import type { KnowledgeNote } from "@/lib/notes";
import { noteAppearance } from "./note-library";

type Props = {
  note: KnowledgeNote;
  status: string;
  busy: boolean;
  categories: string[];
  contentRef: RefObject<HTMLTextAreaElement | null>;
  onBack: () => void;
  onEdit: (patch: Partial<KnowledgeNote>) => void;
  onSave: () => Promise<boolean>;
  onAction: (patch: object) => Promise<KnowledgeNote | undefined>;
  onCopy: (selected?: boolean, promptOnly?: boolean) => void;
  onDuplicate: () => void;
  onDownload: (format: string) => void;
  onAttach: (files: FileList | null) => Promise<void>;
  onReload: () => void;
};
export function NoteEditor({
  note,
  status,
  busy,
  categories,
  contentRef,
  onBack,
  onEdit,
  onSave,
  onAction,
  onCopy,
  onDuplicate,
  onDownload,
  onAttach,
  onReload,
}: Props) {
  const [shareOpen, setShareOpen] = useState(false),
    [recipient, setRecipient] = useState(""),
    [emailBusy, setEmailBusy] = useState(false);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const attachmentRef = useRef<HTMLInputElement>(null);
  const reusable = ["Prompt", "Template"].includes(note.kind);
  const placeholders = Array.from(
    new Set(
      Array.from(
        note.content.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g),
        (m) => m[1],
      ),
    ),
  );
  const { icon: Icon, className } = noteAppearance(note.kind);
  const failed = status.startsWith("Save failed"),
    saving = status === "Saving…";
  const copyPersonalised = async () => {
    const text = note.content.replace(
      /\{\{\s*([^{}]+?)\s*\}\}/g,
      (match, key) => variables[key] || match,
    );
    await navigator.clipboard.writeText(text);
    toast.success("Personalised prompt copied");
    await onAction({ used: true });
  };
  return (
    <div className="space-y-5 pb-8" data-note-editor>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <Button
          variant="ghost"
          className="-ml-3 gap-2"
          onClick={onBack}
          disabled={busy}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to notes
        </Button>
        <div className="flex items-center gap-2">
          <button
            className={`mr-1 flex items-center gap-1.5 text-xs ${failed ? "text-destructive" : "text-muted-foreground"}`}
            onClick={() => void onSave()}
            aria-live="polite"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : failed ? (
              <CircleAlert className="h-3.5 w-3.5" />
            ) : status === "All changes saved" ? (
              <Check className="h-3.5 w-3.5 text-primary" />
            ) : (
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            )}
            {status}
          </button>
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => setShareOpen(true)}
          >
            <Share2 className="mr-2 h-3.5 w-3.5" />
            Share
          </Button>
          <Button
            size="sm"
            disabled={busy}
            aria-label="Copy complete note"
            onClick={() => onCopy(false, reusable)}
          >
            <Copy className="mr-2 h-3.5 w-3.5" />
            {reusable ? "Copy prompt" : "Copy note"}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                aria-label="Note actions"
                variant="ghost"
                size="icon"
                disabled={busy}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onDuplicate}>
                <Copy />
                Duplicate note
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  void onAction({
                    state: note.state === "active" ? "archived" : "active",
                  })
                }
              >
                {note.state === "active" ? <Archive /> : <RotateCcw />}
                {note.state === "active" ? "Archive note" : "Restore note"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {["txt", "docx", "pdf"].map((format) => (
                <DropdownMenuItem
                  key={format}
                  onSelect={() => onDownload(format)}
                >
                  <Download />
                  Export {format.toUpperCase()}
                </DropdownMenuItem>
              ))}
              {note.state !== "trash" && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => void onAction({ state: "trash" })}
                  >
                    <Trash2 />
                    Move to trash
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      {failed && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm"
        >
          <p>
            Your changes are still in this editor. Retry saving, or copy your
            draft before reloading the saved version.
          </p>
          <div className="flex gap-3">
            <button
              className="font-medium underline"
              onClick={() => void onSave()}
            >
              Retry save
            </button>
            <button className="underline" onClick={onReload}>
              Reload saved note
            </button>
          </div>
        </div>
      )}
      {note.state !== "active" && (
        <div className="flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 text-sm">
          <p className="text-muted-foreground">
            This note is in {note.state === "trash" ? "Trash" : "Archive"}.
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            aria-label="Restore note"
            onClick={() => void onAction({ state: "active" })}
          >
            <RotateCcw className="mr-2 h-3.5 w-3.5" />
            Restore note
          </Button>
        </div>
      )}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_272px]">
        <section className="min-w-0 overflow-hidden rounded-xl border border-border/70 bg-card">
          <fieldset disabled={busy} className="min-w-0 p-5 md:p-8">
            <div className="mb-5 flex items-center justify-between gap-3">
              <span
                className={`inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium ${className}`}
              >
                <Icon className="h-3.5 w-3.5" />
                {note.kind}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-8 w-8 ${note.pinned ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
                  title={note.pinned ? "Unpin note" : "Pin note"}
                  aria-label="Pin note"
                  aria-pressed={note.pinned}
                  onClick={() => onEdit({ pinned: !note.pinned })}
                >
                  <Pin className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-8 w-8 ${note.favorite ? "text-amber-600 dark:text-amber-300" : "text-muted-foreground"}`}
                  title="Favourite"
                  aria-label="Favourite"
                  aria-pressed={note.favorite}
                  onClick={() => onEdit({ favorite: !note.favorite })}
                >
                  <Star
                    className={`h-4 w-4 ${note.favorite ? "fill-current" : ""}`}
                  />
                </Button>
              </div>
            </div>
            <Textarea
              style={{
                background: "transparent",
                boxShadow: "none",
                borderRadius: 0,
              }}
              aria-label="Note title"
              placeholder="Give this note a title…"
              value={note.title}
              maxLength={300}
              rows={2}
              onChange={(e) => onEdit({ title: e.target.value })}
              className="min-h-0 resize-none rounded-none border-0 bg-transparent p-0 text-2xl font-semibold leading-snug tracking-tight shadow-none focus-visible:ring-0 md:text-3xl"
            />
            <div className="mb-6 mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border/60 pb-5 text-xs text-muted-foreground">
              <span>{note.createdBy.name}</span>
              <span aria-hidden="true">·</span>
              <span>
                Updated{" "}
                {new Date(note.updatedAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
            <Textarea
              ref={contentRef}
              style={{
                background: "transparent",
                boxShadow: "none",
                borderRadius: 0,
              }}
              aria-label="Note content"
              placeholder={
                reusable
                  ? "Write your reusable prompt. Add {{variables}} to personalise each copy."
                  : "Write your note here…"
              }
              value={note.content}
              maxLength={200000}
              onChange={(e) => onEdit({ content: e.target.value })}
              className={`min-h-[48vh] resize-y rounded-none border-0 bg-transparent p-0 text-[15px] leading-7 shadow-none focus-visible:ring-0 md:text-[15px] ${note.kind === "Prompt" ? "font-mono" : ""}`}
            />
          </fieldset>
          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 px-5 py-3 text-xs text-muted-foreground md:px-8">
            <span>
              {note.content.trim()
                ? note.content.trim().split(/\s+/).length.toLocaleString()
                : 0}{" "}
              words <span className="mx-1.5">·</span>
              {note.content.length.toLocaleString()} characters
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCopy(true)}
              disabled={busy}
            >
              Copy selection
            </Button>
          </footer>
        </section>
        <aside className="min-w-0 space-y-4">
          {reusable && (
            <section className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <h2 className="text-sm font-semibold">
                Use this {note.kind.toLowerCase()}
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                {placeholders.length
                  ? "Fill in the details below. Your saved original stays as it is."
                  : "Copy the original, or duplicate it to create a variation."}
              </p>
              <div className="mt-4 space-y-3">
                {placeholders.map((key) => (
                  <label
                    key={key}
                    className="block space-y-1.5 text-xs font-medium"
                  >
                    {key}
                    <Input
                      value={variables[key] ?? ""}
                      placeholder={`Enter ${key}`}
                      onChange={(e) =>
                        setVariables((v) => ({ ...v, [key]: e.target.value }))
                      }
                    />
                  </label>
                ))}
              </div>
              <Button
                className="mt-3 w-full"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() =>
                  placeholders.length
                    ? void copyPersonalised().catch(() =>
                        toast.error("Unable to copy prompt"),
                      )
                    : onCopy(false, true)
                }
              >
                <Copy className="mr-2 h-3.5 w-3.5" />
                {placeholders.length
                  ? "Copy personalised prompt"
                  : "Copy prompt"}
              </Button>
            </section>
          )}
          <section className="rounded-xl border border-border/70 bg-card p-4">
            <h2 className="mb-4 text-sm font-semibold">Note details</h2>
            <fieldset disabled={busy} className="space-y-4">
              <label className="block space-y-1.5 text-xs font-medium">
                Type
                <Select
                  value={note.kind}
                  onValueChange={(kind) => onEdit({ kind })}
                  disabled={busy}
                >
                  <SelectTrigger aria-label="Note type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "Note",
                      "Prompt",
                      "Template",
                      "Documentation",
                      "Checklist",
                    ].map((k) => (
                      <SelectItem key={k} value={k}>
                        {k}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="block space-y-1.5 text-xs font-medium">
                Category
                <Input
                  aria-label="Note category"
                  list="note-categories"
                  value={note.category}
                  maxLength={100}
                  onChange={(e) => onEdit({ category: e.target.value })}
                />
                <datalist id="note-categories">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </label>
              <label className="block space-y-1.5 text-xs font-medium">
                Tags
                <Input
                  aria-label="Tags"
                  placeholder="e.g. ruby, photography"
                  value={note.tags}
                  maxLength={1000}
                  onChange={(e) => onEdit({ tags: e.target.value })}
                />
                <span className="block font-normal text-muted-foreground">
                  Separate tags with commas
                </span>
              </label>
            </fieldset>
          </section>
          <section className="rounded-xl border border-border/70 bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">
                Attachments{" "}
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  {note.attachments.length || ""}
                </span>
              </h2>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                aria-label="Add attachment"
                disabled={busy}
                onClick={() => attachmentRef.current?.click()}
              >
                <Paperclip className="h-3.5 w-3.5" />
              </Button>
            </div>
            {note.attachments.length === 0 ? (
              <p className="text-xs leading-relaxed text-muted-foreground">
                Keep reference images and documents with this note.
              </p>
            ) : (
              <div className="space-y-2">
                {note.attachments.map((a, i) => (
                  <div
                    key={`${a.name}-${i}`}
                    className="flex min-w-0 items-center gap-2 rounded-lg bg-muted/40 p-2 text-xs"
                  >
                    <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <a
                      className="min-w-0 flex-1 truncate underline underline-offset-2"
                      href={a.data}
                      download={a.name}
                    >
                      {a.name}
                    </a>
                    <button
                      disabled={busy}
                      aria-label={`Remove ${a.name}`}
                      onClick={() =>
                        onEdit({
                          attachments: note.attachments.filter(
                            (_, j) => j !== i,
                          ),
                        })
                      }
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input
              ref={attachmentRef}
              aria-label="Attach files"
              className="sr-only"
              type="file"
              multiple
              accept=".png,.jpg,.jpeg,.webp,.gif,.pdf,.txt,.docx,.xlsx,.csv"
              onChange={(e) => {
                void onAttach(e.target.files).catch(() =>
                  toast.error("Unable to read attachment"),
                );
                e.target.value = "";
              }}
            />
            <Button
              className="mt-3 w-full"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => attachmentRef.current?.click()}
            >
              Attach files
            </Button>
          </section>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                aria-label="Download note"
                variant="outline"
                className="w-full justify-between"
                disabled={busy}
              >
                <span className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Download note
                </span>
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {["txt", "docx", "pdf"].map((format) => (
                <DropdownMenuItem
                  key={format}
                  onSelect={() => onDownload(format)}
                >
                  {format.toUpperCase()}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">
            Shared with your ERP team. Changes save automatically.
          </p>
        </aside>
      </div>
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent>
          <DialogTitle>Share this note</DialogTitle>
          <div className="space-y-5">
            <section className="space-y-3">
              <h3 className="text-sm font-medium">Share a link</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Anyone with the link can read this note. Attachments are
                excluded. You can revoke access at any time.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={busy || note.state !== "active"}
                  onClick={() =>
                    void (async () => {
                      if (!(await onSave())) return;
                      const n = note.shareToken
                        ? note
                        : await onAction({ share: true });
                      if (n?.shareToken) {
                        await navigator.clipboard.writeText(
                          `${location.origin}/api/notes/share?token=${n.shareToken}`,
                        );
                        toast.success("Share link copied");
                      }
                    })().catch(() => toast.error("Could not copy link"))
                  }
                >
                  {note.shareToken ? "Copy link" : "Create public link"}
                </Button>
                {note.shareToken && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void onAction({ share: false })}
                  >
                    Revoke link
                  </Button>
                )}
              </div>
            </section>
            <form
              className="space-y-3 border-t pt-5"
              onSubmit={(e) => {
                e.preventDefault();
                if (emailBusy) return;
                void (async () => {
                  setEmailBusy(true);
                  try {
                    if (!(await onSave())) return;
                    const r = await fetch("/api/notes/email", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ id: note.id, to: recipient }),
                    });
                    const result = await r.json();
                    if (!r.ok) throw new Error(result.error);
                    toast.success("Email submitted for delivery");
                    setRecipient("");
                  } catch (e) {
                    toast.error((e as Error).message);
                  } finally {
                    setEmailBusy(false);
                  }
                })();
              }}
            >
              <label className="block space-y-2 text-sm font-medium">
                Send by email
                <Input
                  aria-label="Recipient email"
                  type="email"
                  required
                  placeholder="Recipient email address"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                />
              </label>
              <Button
                type="submit"
                variant="outline"
                size="sm"
                disabled={emailBusy || busy}
              >
                {emailBusy ? "Sending…" : "Send note"}
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
