"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import {
  Plus,
  Search,
  StickyNote,
  Pin,
  Star,
  Copy,
  Archive,
  Trash2,
  RotateCcw,
  Download,
  Share2,
  Mail,
  Paperclip,
  X,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/erp-feedback";
import type { KnowledgeNote } from "@/lib/notes";
const endpoint = "/api/dashboard/notes";
export async function notesRequest(
  body: object,
  method = "PUT",
): Promise<KnowledgeNote> {
  const r = await fetch(endpoint, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Unable to save");
  return data;
}
const fetcher = async (url: string) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error("Unable to load notes");
  return r.json() as Promise<KnowledgeNote[]>;
};
const categories = [
  "General",
  "Gemstone photography",
  "AI & prompts",
  "SEO & marketplaces",
  "Business strategy",
  "Operations",
  "Technical documentation",
];
const views = [
  "All notes",
  "Pinned",
  "Favourites",
  "Prompts & templates",
  "Archive",
  "Trash",
];
export function NotesWorkspace() {
  const {
    data: notes = [],
    error,
    isLoading,
    mutate,
  } = useSWR(endpoint, fetcher, { refreshInterval: 15000 });
  const [draft, setDraft] = useState<KnowledgeNote | null>(null);
  const draftRef = useRef(draft);
  const dirty = useRef(false);
  const running = useRef<Promise<boolean> | null>(null);
  const [status, setStatus] = useState("All changes saved");
  const [revision, setRevision] = useState(0);
  const [view, setView] = useState("All notes");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("updated");
  const [shareOpen, setShareOpen] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [busy, setBusy] = useState(false);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const contentRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const current = draftRef.current;
    const remote = notes.find((n) => n.id === current?.id);
    if (
      !current ||
      !remote ||
      dirty.current ||
      running.current ||
      remote.updatedAt === current.updatedAt
    )
      return;
    let cancelled = false;
    void fetch(`${endpoint}?id=${encodeURIComponent(current.id)}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json() as Promise<KnowledgeNote>;
      })
      .then((fresh) => {
        if (
          !cancelled &&
          !dirty.current &&
          !running.current &&
          draftRef.current?.id === current.id &&
          draftRef.current.updatedAt === current.updatedAt
        ) {
          draftRef.current = fresh;
          setDraft(fresh);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [notes]);
  const save = useCallback(async (): Promise<boolean> => {
    if (running.current) return running.current;
    const work = async () => {
      while (dirty.current && draftRef.current) {
        const snapshot = draftRef.current;
        dirty.current = false;
        setStatus("Saving…");
        try {
          const saved = await notesRequest({
            ...snapshot,
            expectedUpdatedAt: snapshot.updatedAt,
          });
          await mutate();
          if (draftRef.current === snapshot) {
            draftRef.current = saved;
            setDraft(saved);
          } else if (draftRef.current) {
            draftRef.current = {
              ...draftRef.current,
              updatedAt: saved.updatedAt,
            };
            setDraft(draftRef.current);
          }
        } catch (e) {
          dirty.current = true;
          setStatus("Save failed — retry");
          toast.error((e as Error).message);
          return false;
        }
      }
      setStatus("All changes saved");
      return true;
    };
    running.current = work();
    try {
      return await running.current;
    } finally {
      running.current = null;
    }
  }, [mutate]);
  useEffect(
    () => () => {
      void save();
    },
    [save],
  );
  useEffect(() => {
    if (!dirty.current) return;
    const t = setTimeout(() => void save(), 800);
    return () => clearTimeout(t);
  }, [revision, save]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty.current || running.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  const edit = (patch: Partial<KnowledgeNote>) => {
    const next = { ...draftRef.current!, ...patch };
    draftRef.current = next;
    setDraft(next);
    dirty.current = true;
    setStatus("Unsaved changes");
    setRevision((r) => r + 1);
  };
  const select = async (note: KnowledgeNote) => {
    if (!(await save())) return;
    try {
      const r = await fetch(`${endpoint}?id=${encodeURIComponent(note.id)}`);
      if (!r.ok) throw new Error();
      const fresh = (await r.json()) as KnowledgeNote;
      draftRef.current = fresh;
      setDraft(fresh);
      setShareOpen(false);
      setVariables({});
    } catch {
      toast.error("Unable to open note");
    }
  };
  const create = async (kind = "Note") => {
    if (!(await save())) return;
    try {
      const n = await notesRequest(
        { title: "", content: "", kind, category: category || "General" },
        "POST",
      );
      await mutate();
      setView("All notes");
      setQuery("");
      draftRef.current = n;
      setDraft(n);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const action = async (patch: object) => {
    if (!draftRef.current || !(await save())) return;
    setBusy(true);
    try {
      const n = await notesRequest({
        id: draftRef.current.id,
        expectedUpdatedAt: draftRef.current.updatedAt,
        ...patch,
      });
      draftRef.current = n;
      setDraft(n);
      await mutate();
      return n;
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const copy = async (selected = false, promptOnly = false) => {
    if (!draft) return;
    const el = contentRef.current;
    const text =
      selected && el
        ? draft.content.slice(el.selectionStart, el.selectionEnd)
        : !promptOnly && draft.title
          ? `${draft.title}\n\n${draft.content}`
          : draft.content;
    if (!text) {
      toast.error("Select some text in the editor first");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success(selected ? "Selection copied" : "Note copied");
      await action({ used: true });
    } catch {
      toast.error("Copy failed. Use your device copy command.");
    }
  };
  const download = async (format: string) => {
    if (!draft || !(await save())) return;
    const name =
      (draft.title || "Untitled note")
        .replace(/[^\p{L}\p{N} _-]/gu, "")
        .slice(0, 100) || "Note";
    let blob: Blob;
    if (format === "docx") {
      const { Document, Packer, Paragraph, TextRun, HeadingLevel } =
        await import("docx");
      blob = await Packer.toBlob(
        new Document({
          sections: [
            {
              children: [
                new Paragraph({
                  text: draft.title || "Untitled note",
                  heading: HeadingLevel.TITLE,
                }),
                ...draft.content
                  .split("\n")
                  .map(
                    (text) => new Paragraph({ children: [new TextRun(text)] }),
                  ),
              ],
            },
          ],
        }),
      );
    } else if (format === "pdf") {
      // Browser printing preserves Unicode text and supports the installed system fonts.
      const w = window.open("", "_blank");
      if (!w) {
        toast.error("Allow popups to export PDF");
        return;
      }
      w.document.title = name;
      const h = w.document.createElement("h1");
      h.textContent = draft.title || "Untitled note";
      const p = w.document.createElement("pre");
      p.textContent = draft.content;
      p.style.cssText =
        "white-space:pre-wrap;font:14px/1.7 system-ui;overflow-wrap:anywhere";
      w.document.body.style.cssText =
        "max-width:800px;margin:40px auto;padding:24px;font-family:system-ui";
      w.document.body.append(h, p);
      w.print();
      return;
    } else
      blob = new Blob(
        [draft.title ? `${draft.title}\n\n${draft.content}` : draft.content],
        { type: "text/plain;charset=utf-8" },
      );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}.${format}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const attach = async (files: FileList | null) => {
    if (!files || !draft) return;
    const additions: KnowledgeNote["attachments"] = [];
    for (const f of Array.from(files)) {
      if (
        f.size > 2000000 ||
        !/\.(png|jpg|jpeg|webp|gif|pdf|txt|docx|xlsx|csv)$/i.test(f.name)
      ) {
        toast.error("Use images, PDF, TXT, DOCX, XLSX or CSV files up to 2 MB");
        return;
      }
      const data = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = reject;
        r.readAsDataURL(f);
      });
      additions.push({ name: f.name, type: f.type, data });
    }
    const all = [...draft.attachments, ...additions];
    if (all.length > 5 || JSON.stringify(all).length > 3000000) {
      toast.error("Maximum 5 attachments and 3 MB encoded data per note");
      return;
    }
    edit({ attachments: all });
  };
  const visible = notes
    .filter((n) => {
      if (
        n.state !==
        (view === "Archive"
          ? "archived"
          : view === "Trash"
            ? "trash"
            : "active")
      )
        return false;
      if (
        (view === "Pinned" && !n.pinned) ||
        (view === "Favourites" && !n.favorite) ||
        (view === "Prompts & templates" &&
          !["Prompt", "Template"].includes(n.kind))
      )
        return false;
      return (
        (!category || n.category === category) &&
        `${n.title} ${n.content} ${n.tags} ${n.category}`
          .toLowerCase()
          .includes(query.toLowerCase())
      );
    })
    .sort(
      (a, b) =>
        Number(b.pinned) - Number(a.pinned) ||
        (sort === "used"
          ? b.uses - a.uses
          : sort === "title"
            ? a.title.localeCompare(b.title)
            : new Date(
                sort === "created" ? b.createdAt : b.updatedAt,
              ).getTime() -
              new Date(
                sort === "created" ? a.createdAt : a.updatedAt,
              ).getTime()),
    );
  const allCategories = Array.from(
    new Set([...categories, ...notes.map((n) => n.category)]),
  );
  const placeholders = Array.from(
    new Set(
      Array.from(
        (draft?.content ?? "").matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g),
        (m) => m[1],
      ),
    ),
  );
  const tool = (
    label: string,
    Icon: typeof Copy,
    onClick: () => void,
    active = false,
  ) => (
    <Button
      key={label}
      aria-label={label}
      title={label}
      disabled={busy}
      size="sm"
      variant={active ? "secondary" : "ghost"}
      onClick={onClick}
    >
      <Icon className="h-4 w-4" />
      <span className="sr-only">{label}</span>
    </Button>
  );
  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-primary">
            <BookOpen className="h-4 w-4" />
            Khyati Gems knowledge
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Notes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your ideas, prompts and business knowledge. One shared workspace.
          </p>
        </div>
        <Button onClick={() => void create()}>
          <Plus className="mr-2 h-4 w-4" />
          New note
        </Button>
      </header>
      <div className="grid min-h-[70vh] gap-4 xl:grid-cols-[190px_300px_minmax(0,1fr)]">
        <aside className="space-y-5 rounded-xl border bg-card p-3">
          <nav className="flex flex-wrap gap-1 xl:flex-col">
            {views.map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded-lg px-3 py-2 text-left text-sm transition-colors ${view === v ? "bg-primary/10 font-semibold text-primary" : "text-muted-foreground hover:bg-muted"}`}
              >
                {v}
              </button>
            ))}
          </nav>
          <div className="border-t pt-4">
            <label
              htmlFor="notes-category"
              className="mb-2 block px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Categories
            </label>
            <select
              id="notes-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-md border bg-background p-2 text-sm"
            >
              <option value="">All categories</option>
              {allCategories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="rounded-lg bg-primary/5 p-3 text-xs leading-relaxed text-muted-foreground">
            <Sparkles className="mb-2 h-4 w-4 text-primary" />
            Save prompts as templates. Use {"{{gemstone}}"} or {"{{platform}}"}{" "}
            as placeholders to customise a copy.
          </div>
        </aside>
        <section className="flex min-w-0 flex-col rounded-xl border bg-card">
          <div className="space-y-3 border-b p-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                aria-label="Search notes"
                placeholder="Search knowledge…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {visible.length} notes
              </span>
              <select
                aria-label="Sort notes"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="bg-background text-xs"
              >
                <option value="updated">Recently updated</option>
                <option value="created">Recently created</option>
                <option value="used">Frequently used</option>
                <option value="title">Title A–Z</option>
              </select>
            </div>
          </div>
          <div className="max-h-[70vh] overflow-auto p-2">
            {error ? (
              <div className="p-4 text-sm text-destructive">
                Could not load notes.{" "}
                <button onClick={() => void mutate()} className="underline">
                  Retry
                </button>
              </div>
            ) : isLoading ? (
              <p className="p-5 text-sm text-muted-foreground">
                Loading knowledge…
              </p>
            ) : visible.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                <StickyNote className="mx-auto mb-3 h-7 w-7" />
                No notes here yet. Create a note or adjust your filters.
              </div>
            ) : (
              visible.map((n) => (
                <button
                  key={n.id}
                  onClick={() => void select(n)}
                  className={`mb-1 w-full rounded-lg border p-3 text-left transition-colors ${draft?.id === n.id ? "border-primary/30 bg-primary/5" : "border-transparent hover:bg-muted/60"}`}
                >
                  <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                    <span>
                      {n.kind} · {n.category}
                    </span>
                    {n.pinned && (
                      <Pin className="ml-auto h-3 w-3 text-primary" />
                    )}
                    {n.favorite && <Star className="h-3 w-3 text-amber-500" />}
                  </div>
                  <h2 className="truncate text-sm font-semibold">
                    {n.title || n.content.split("\n")[0] || "Untitled note"}
                  </h2>
                  <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                    {n.content || "Start writing…"}
                  </p>
                  <p className="mt-3 text-[10px] text-muted-foreground">
                    {new Date(n.updatedAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}{" "}
                    · {n.createdBy.name}
                    {n.uses > 0 ? ` · Used ${n.uses}×` : ""}
                  </p>
                </button>
              ))
            )}
          </div>
        </section>
        <section className="min-w-0 rounded-xl border bg-card">
          {!draft ? (
            <div className="flex h-full min-h-80 flex-col items-center justify-center p-10 text-center">
              <div className="mb-5 rounded-2xl bg-primary/10 p-5">
                <BookOpen className="h-9 w-9 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">A home for what matters</h2>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                Open a note to continue, or capture an idea, reusable prompt or
                piece of business knowledge.
              </p>
              <div className="mt-6 flex gap-2">
                <Button variant="outline" onClick={() => void create("Prompt")}>
                  New prompt
                </Button>
                <Button onClick={() => void create()}>New note</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
                <div className="flex flex-wrap gap-1">
                  {tool(
                    "Pin note",
                    Pin,
                    () => edit({ pinned: !draft.pinned }),
                    draft.pinned,
                  )}
                  {tool(
                    "Favourite",
                    Star,
                    () => edit({ favorite: !draft.favorite }),
                    draft.favorite,
                  )}
                  {tool("Copy complete note", Copy, () => void copy())}
                  {tool("Share and email", Share2, () =>
                    setShareOpen(!shareOpen),
                  )}
                  {tool(
                    "Duplicate note",
                    Plus,
                    () =>
                      void (async () => {
                        if (!(await save())) return;
                        const n = await notesRequest(
                          {
                            ...draft,
                            title: `${draft.title || "Untitled note"} (copy)`,
                            state: "active",
                            pinned: false,
                            favorite: false,
                          },
                          "POST",
                        );
                        await mutate();
                        await select(n);
                      })().catch(() => toast.error("Unable to duplicate note")),
                  )}
                  {tool(
                    draft.state === "active" ? "Archive note" : "Restore note",
                    draft.state === "active" ? Archive : RotateCcw,
                    () =>
                      void action({
                        state: draft.state === "active" ? "archived" : "active",
                      }),
                  )}
                  {draft.state !== "trash" &&
                    tool(
                      "Move to trash",
                      Trash2,
                      () => void action({ state: "trash" }),
                    )}
                </div>
                <button
                  onClick={() => void save()}
                  className={`text-xs ${status.startsWith("Save failed") ? "text-destructive" : "text-muted-foreground"}`}
                  aria-live="polite"
                >
                  {status}
                </button>
              </div>
              {shareOpen && (
                <div className="space-y-3 border-b bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">
                    Anyone with a public link can read this note. Attachments
                    are excluded. Revoke access at any time.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={draft.state !== "active"}
                      onClick={() =>
                        void (async () => {
                          const n = draft.shareToken
                            ? draft
                            : await action({ share: true });
                          if (n?.shareToken) {
                            await navigator.clipboard.writeText(
                              `${location.origin}/api/notes/share?token=${n.shareToken}`,
                            );
                            toast.success("Share link copied");
                          }
                        })().catch(() => toast.error("Could not copy link"))
                      }
                    >
                      <Share2 className="mr-2 h-3 w-3" />
                      {draft.shareToken ? "Copy link" : "Create public link"}
                    </Button>
                    {draft.shareToken && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void action({ share: false })}
                      >
                        Revoke link
                      </Button>
                    )}
                  </div>
                  <form
                    className="flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void (async () => {
                        if (!(await save())) return;
                        const r = await fetch("/api/notes/email", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ id: draft.id, to: recipient }),
                        });
                        const result = await r.json();
                        if (!r.ok) throw new Error(result.error);
                        toast.success("Email submitted for delivery");
                        setRecipient("");
                      })().catch((e) => toast.error(e.message));
                    }}
                  >
                    <Input
                      aria-label="Recipient email"
                      type="email"
                      required
                      placeholder="Recipient email"
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                    />
                    <Button type="submit" variant="outline" size="sm">
                      <Mail className="mr-2 h-3 w-3" />
                      Send
                    </Button>
                  </form>
                </div>
              )}
              <fieldset
                disabled={busy}
                className="min-w-0 space-y-4 p-4 md:p-6"
              >
                {status.startsWith("Save failed") && (
                  <div
                    role="alert"
                    className="rounded-lg border border-destructive/30 p-3 text-xs"
                  >
                    Your draft is retained. Copy it before reloading if another
                    user changed this note.{" "}
                    <button
                      className="underline"
                      onClick={() => {
                        if (
                          confirm(
                            "Discard unsaved changes and reload this note?",
                          )
                        ) {
                          dirty.current = false;
                          void select(draft);
                          setStatus("All changes saved");
                        }
                      }}
                    >
                      Reload saved note
                    </button>
                  </div>
                )}
                <Input
                  aria-label="Note title"
                  placeholder="Untitled note"
                  value={draft.title}
                  onChange={(e) => edit({ title: e.target.value })}
                  maxLength={300}
                  className="border-0 px-0 text-xl font-semibold shadow-none focus-visible:ring-0"
                />
                <div className="grid grid-cols-2 gap-3">
                  <label className="space-y-1 text-xs text-muted-foreground">
                    Type
                    <select
                      value={draft.kind}
                      onChange={(e) => edit({ kind: e.target.value })}
                      className="block w-full rounded-md border bg-background p-2 text-foreground"
                    >
                      {[
                        "Note",
                        "Prompt",
                        "Template",
                        "Documentation",
                        "Checklist",
                      ].map((k) => (
                        <option key={k}>{k}</option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1 text-xs text-muted-foreground">
                    Category
                    <Input
                      list="note-categories"
                      value={draft.category}
                      maxLength={100}
                      onChange={(e) => edit({ category: e.target.value })}
                    />
                    <datalist id="note-categories">
                      {allCategories.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </label>
                </div>
                <Input
                  aria-label="Tags"
                  placeholder="Tags, separated by commas"
                  value={draft.tags}
                  maxLength={1000}
                  onChange={(e) => edit({ tags: e.target.value })}
                />
                {["Prompt", "Template"].includes(draft.kind) && (
                  <div className="flex items-center justify-between rounded-lg bg-primary/5 p-3 text-xs text-muted-foreground">
                    <span>
                      Reusable {draft.kind.toLowerCase()} · keep your master
                      copy here
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void copy(false, true)}
                    >
                      Copy prompt
                    </Button>
                  </div>
                )}
                {["Prompt", "Template"].includes(draft.kind) &&
                  placeholders.length > 0 && (
                    <div className="space-y-3 rounded-lg border p-3">
                      <p className="text-xs font-medium">Personalise a copy</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {placeholders.map((key) => (
                          <label
                            key={key}
                            className="space-y-1 text-xs text-muted-foreground"
                          >
                            {key}
                            <Input
                              value={variables[key] ?? ""}
                              placeholder={`Enter ${key}`}
                              onChange={(e) =>
                                setVariables((v) => ({
                                  ...v,
                                  [key]: e.target.value,
                                }))
                              }
                            />
                          </label>
                        ))}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          void (async () => {
                            const text = draft.content.replace(
                              /\{\{\s*([^{}]+?)\s*\}\}/g,
                              (match, key) => variables[key] || match,
                            );
                            await navigator.clipboard.writeText(text);
                            toast.success("Personalised prompt copied");
                            await action({ used: true });
                          })().catch(() => toast.error("Unable to copy prompt"))
                        }
                      >
                        Copy personalised prompt
                      </Button>
                    </div>
                  )}
                <Textarea
                  ref={contentRef}
                  aria-label="Note content"
                  placeholder="Write something worth keeping…"
                  value={draft.content}
                  maxLength={200000}
                  onChange={(e) => edit({ content: e.target.value })}
                  className={`min-h-[360px] resize-y border-0 p-0 text-sm leading-7 shadow-none focus-visible:ring-0 ${draft.kind === "Prompt" ? "font-mono" : ""}`}
                />
                <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
                  <span>
                    {draft.content.length.toLocaleString()} characters ·{" "}
                    {draft.content.trim()
                      ? draft.content.trim().split(/\s+/).length
                      : 0}{" "}
                    words
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void copy(true)}
                  >
                    Copy selection
                  </Button>
                </div>
                <div className="space-y-2">
                  {draft.attachments.map((a, i) => (
                    <div
                      key={`${a.name}-${i}`}
                      className="flex items-center gap-2 rounded-lg border p-2 text-xs"
                    >
                      <Paperclip className="h-3 w-3" />
                      <a
                        className="min-w-0 flex-1 truncate underline"
                        href={a.data}
                        download={a.name}
                      >
                        {a.name}
                      </a>
                      <button
                        aria-label={`Remove ${a.name}`}
                        onClick={() =>
                          edit({
                            attachments: draft.attachments.filter(
                              (_, j) => j !== i,
                            ),
                          })
                        }
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <footer className="flex flex-wrap items-center gap-2 border-t pt-4">
                  <label className="cursor-pointer rounded-md border px-3 py-2 text-xs hover:bg-muted">
                    <Paperclip className="mr-1 inline h-3 w-3" />
                    Attach files
                    <input
                      aria-label="Attach files"
                      className="sr-only"
                      type="file"
                      multiple
                      accept=".png,.jpg,.jpeg,.webp,.gif,.pdf,.txt,.docx,.xlsx,.csv"
                      onChange={(e) => {
                        void attach(e.target.files).catch(() =>
                          toast.error("Unable to read attachment"),
                        );
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <div className="ml-auto flex items-center gap-1">
                    <Download className="mr-1 h-3 w-3 text-muted-foreground" />
                    {["txt", "docx", "pdf"].map((f) => (
                      <Button
                        key={f}
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          void download(f).catch(() =>
                            toast.error("Export failed"),
                          )
                        }
                      >
                        {f.toUpperCase()}
                      </Button>
                    ))}
                  </div>
                </footer>
                <p className="text-[10px] text-muted-foreground">
                  Shared with your ERP team · PDF opens your browser’s Save as
                  PDF dialog · Deleted notes remain recoverable in Trash.
                </p>
              </fieldset>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
