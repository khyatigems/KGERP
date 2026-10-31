"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSWRConfig } from "swr";
import { StickyNote, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/erp-feedback";
export function QuickCapture() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const { mutate } = useSWRConfig();
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === "n"
      ) {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  return (
    <div className="fixed bottom-5 right-5 z-40 sm:right-28">
      {open && (
        <section
          role="dialog"
          aria-label="Quick capture"
          className="mb-3 w-[min(360px,calc(100vw-40px))] space-y-3 rounded-xl border bg-card p-4 shadow-xl"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Capture a note</h2>
            <button aria-label="Close capture" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </button>
          </div>
          <Textarea
            autoFocus
            aria-label="Quick note content"
            placeholder="An idea, a prompt, a useful detail…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={200000}
          />
          <div className="flex items-center justify-between">
            <Link
              href="/notes"
              className="text-xs text-primary"
              onClick={() => setOpen(false)}
            >
              Open Notes
            </Link>
            <Button
              size="sm"
              disabled={busy || !text.trim()}
              onClick={() =>
                void (async () => {
                  setBusy(true);
                  try {
                    const r = await fetch("/api/dashboard/notes", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ content: text }),
                    });
                    if (!r.ok) throw new Error();
                    await mutate("/api/dashboard/notes");
                    setText("");
                    setOpen(false);
                    toast.success("Saved to Notes");
                  } catch {
                    toast.error("Unable to save. Your draft is still here.");
                  } finally {
                    setBusy(false);
                  }
                })()
              }
            >
              {busy ? "Saving…" : "Save note"}
            </Button>
          </div>
        </section>
      )}
      <Button
        variant="outline"
        className="h-11 rounded-full bg-card shadow-lg"
        onClick={() => setOpen(!open)}
        title="Quick note (Ctrl+Shift+N)"
      >
        <StickyNote className="mr-2 h-4 w-4" />
        Quick note
      </Button>
    </div>
  );
}
