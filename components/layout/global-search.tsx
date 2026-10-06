"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";

interface SearchResult {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  href: string;
}

export function GlobalSearch() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const normalizedQuery = query.trim();

  useEffect(() => {
    if (normalizedQuery.length < 2) {
      setResults([]);
      setIsLoading(false);
      setError(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsLoading(true);
      setError(false);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(normalizedQuery)}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) throw new Error(`Search failed (${response.status})`);
        const data: unknown = await response.json();
        if (!data || typeof data !== "object" || !("results" in data) || !Array.isArray(data.results)) {
          throw new Error("Search returned an invalid response");
        }
        setResults(data.results as SearchResult[]);
        setActiveIndex(-1);
      } catch (searchError) {
        if (controller.signal.aborted) return;
        console.error("Global ERP search failed:", searchError);
        setResults([]);
        setError(true);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [normalizedQuery]);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  const chooseResult = (result: SearchResult) => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
    router.push(result.href);
  };

  const openAllResults = () => {
    if (normalizedQuery.length < 2) return;
    setIsOpen(false);
    router.push(`/search?q=${encodeURIComponent(normalizedQuery)}`);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setIsOpen(false);
      return;
    }
    if (event.key === "Enter" && isOpen && normalizedQuery.length >= 2) {
      event.preventDefault();
      openAllResults();
      return;
    }
    if (!isOpen || results.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => current <= 0 ? results.length - 1 : current - 1);
    }
  };

  return (
    <div
      className="relative mx-auto min-w-0 w-full max-w-xl flex-1"
      ref={containerRef}
    >
      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-activedescendant={activeIndex >= 0 ? `global-search-result-${activeIndex}` : undefined}
          aria-autocomplete="list"
          aria-controls="global-search-results"
          aria-expanded={isOpen && normalizedQuery.length >= 2}
          aria-label="Search ERP records"
          autoComplete="off"
          className="h-10 rounded-xl border-border/80 bg-card/80 pl-10 pr-16 shadow-sm transition-shadow focus-visible:ring-primary/30"
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search inventory, invoices, customers..."
          role="combobox"
          value={query}
        />
        <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 text-[10px] text-muted-foreground">
          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : query
            ? <button
                aria-label="Clear search"
                className="pointer-events-auto rounded p-0.5 hover:bg-muted"
                onClick={() => {
                  setQuery("");
                  setIsOpen(true);
                }}
                type="button"
              ><X className="h-3.5 w-3.5" /></button>
            : null}
        </div>
      </div>

      {isOpen && normalizedQuery.length >= 2 && (
        <div
          className="absolute inset-x-0 top-full z-50 mt-2 max-h-[min(70vh,28rem)] overflow-y-auto rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-xl"
          id="global-search-results"
          role="listbox"
        >
          {isLoading && results.length === 0 ? (
            <div className="flex items-center gap-2 px-3 py-5 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Searching ERP records...
            </div>
          ) : error ? (
            <p className="px-3 py-5 text-sm text-destructive">Search is temporarily unavailable. Please try again.</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-5 text-sm text-muted-foreground">No matching records found.</p>
          ) : (
            <div className="space-y-0.5">
              {results.map((result, index) => (
                <Link
                  aria-selected={activeIndex === index}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-accent hover:text-accent-foreground ${
                    activeIndex === index ? "bg-accent text-accent-foreground" : ""
                  }`}
                  href={result.href}
                  id={`global-search-result-${index}`}
                  key={result.id}
                  onClick={() => {
                    setQuery("");
                    setIsOpen(false);
                  }}
                  role="option"
                >
                  <span className="min-w-20 rounded-md bg-primary/10 px-2 py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-primary">
                    {result.type}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{result.title}</span>
                    {result.subtitle && <span className="block truncate text-xs text-muted-foreground">{result.subtitle}</span>}
                  </span>
                </Link>
              ))}
            </div>
          )}
          <button
            className="mt-1 flex w-full items-center justify-between border-t px-3 py-2.5 text-left text-sm font-medium text-primary transition-colors hover:bg-accent"
            onClick={openAllResults}
            type="button"
          >
            <span>View all results for “{normalizedQuery}”</span>
            <span className="text-xs text-muted-foreground">Enter ↵</span>
          </button>
        </div>
      )}
    </div>
  );
}
