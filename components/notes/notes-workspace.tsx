"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { NoteLibrary, noteCategories } from "./note-library";
import { NoteEditor } from "./note-editor";
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
  const [busy, setBusy] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const libraryScroll = useRef(0);
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
    if (pendingId || busy || !(await save())) return;
    libraryScroll.current = window.scrollY;
    setPendingId(note.id);
    try {
      const r = await fetch(`${endpoint}?id=${encodeURIComponent(note.id)}`);
      if (!r.ok) throw new Error();
      const fresh = (await r.json()) as KnowledgeNote;
      if (!fresh) throw new Error();
      draftRef.current = fresh;
      setDraft(fresh);
      window.scrollTo(0, 0);
    } catch {
      toast.error("Unable to open note");
    } finally {
      setPendingId(null);
    }
  };
  const create = async (kind = "Note") => {
    if (pendingId || busy || !(await save())) return;
    libraryScroll.current = window.scrollY;
    setPendingId("new");
    try {
      const n = await notesRequest(
        { title: "", content: "", kind, category: "General" },
        "POST",
      );
      await mutate();
      draftRef.current = n;
      setDraft(n);
      window.scrollTo(0, 0);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPendingId(null);
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

  const back = async () => {
    if (busy || !(await save())) return;
    draftRef.current = null;
    setDraft(null);
    requestAnimationFrame(() => window.scrollTo(0, libraryScroll.current));
  };
  const updateLibraryNote = async (note: KnowledgeNote, patch: object) => {
    if (pendingId) return;
    setPendingId(note.id);
    try {
      await notesRequest({
        id: note.id,
        expectedUpdatedAt: note.updatedAt,
        ...patch,
      });
      await mutate();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPendingId(null);
    }
  };
  const copyLibraryNote = async (note: KnowledgeNote) => {
    try {
      await navigator.clipboard.writeText(
        ["Prompt", "Template"].includes(note.kind) || !note.title
          ? note.content
          : `${note.title}\n\n${note.content}`,
      );
      toast.success("Note copied");
      await updateLibraryNote(note, { used: true });
    } catch {
      toast.error("Unable to copy note");
    }
  };
  const duplicate = async (note: KnowledgeNote) => {
    if (pendingId || busy || !(await save())) return;
    setPendingId(note.id);
    try {
      const response = await fetch(
        `${endpoint}?id=${encodeURIComponent(note.id)}`,
      );
      if (!response.ok) throw new Error();
      const source = (await response.json()) as KnowledgeNote;
      if (!source) throw new Error();
      const created = await notesRequest(
        {
          ...source,
          title: `${source.title || "Untitled note"} (copy)`,
          state: "active",
          pinned: false,
          favorite: false,
        },
        "POST",
      );
      await mutate();
      if (!draftRef.current) libraryScroll.current = window.scrollY;
      draftRef.current = created;
      setDraft(created);
      window.scrollTo(0, 0);
    } catch {
      toast.error("Unable to duplicate note");
    } finally {
      setPendingId(null);
    }
  };
  const allCategories = Array.from(
    new Set([...noteCategories, ...notes.map((n) => n.category)]),
  );
  return (
    <div className="p-4 md:p-6">
      <div hidden={!!draft}>
        <NoteLibrary
          notes={notes}
          isLoading={isLoading}
          error={error}
          pendingId={pendingId}
          onRetry={() => void mutate()}
          onCreate={(kind) => void create(kind)}
          onOpen={(note) => void select(note)}
          onCopy={(note) => void copyLibraryNote(note)}
          onUpdate={(note, patch) => void updateLibraryNote(note, patch)}
          onDuplicate={(note) => void duplicate(note)}
        />
      </div>
      {draft && (
        <NoteEditor
          key={draft.id}
          note={draft}
          status={status}
          busy={busy || !!pendingId}
          categories={allCategories}
          contentRef={contentRef}
          onBack={() => void back()}
          onEdit={edit}
          onSave={save}
          onAction={action}
          onCopy={(selected, promptOnly) => void copy(selected, promptOnly)}
          onDuplicate={() => void duplicate(draft)}
          onDownload={(format) =>
            void download(format).catch(() => toast.error("Export failed"))
          }
          onAttach={attach}
          onReload={() => {
            if (confirm("Discard unsaved changes and reload this note?")) {
              dirty.current = false;
              void select(draft);
              setStatus("All changes saved");
            }
          }}
        />
      )}
    </div>
  );
}
