"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Search, Loader2, Package, ReceiptText, FileText, ShoppingBag, Users, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SearchResult {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  href: string;
}

interface SearchResponse {
  results: SearchResult[];
  hasMore: boolean;
  page: number;
}

const resultTypes = [
  { name: "Inventory", icon: Package },
  { name: "Invoice", icon: ReceiptText },
  { name: "Quotation", icon: FileText },
  { name: "Purchase", icon: ShoppingBag },
  { name: "Customer", icon: Users },
  { name: "Vendor", icon: Truck },
];

export function SearchResultsPage({
  initialQuery,
  initialPage,
}: {
  initialQuery: string;
  initialPage: number;
}) {
  const router = useRouter();
  const [input, setInput] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [page, setPage] = useState(initialPage);
  const [data, setData] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    setInput(initialQuery);
    setQuery(initialQuery);
    setPage(initialPage);
  }, [initialQuery, initialPage]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setData(null);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setError(false);
    fetch(`/api/search?q=${encodeURIComponent(query.trim())}&limit=10&page=${page}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Search failed (${response.status})`);
        return await response.json() as SearchResponse;
      })
      .then((response) => setData(response))
      .catch((searchError: unknown) => {
        if (controller.signal.aborted) return;
        console.error("Search results page failed:", searchError);
        setError(true);
        setData(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [query, page]);

  const groupedResults = useMemo(() => {
    const groups = new Map<string, SearchResult[]>();
    for (const result of data?.results || []) {
      const items = groups.get(result.type) || [];
      items.push(result);
      groups.set(result.type, items);
    }
    return groups;
  }, [data]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextQuery = input.trim().slice(0, 100);
    if (nextQuery.length < 2) return;
    setQuery(nextQuery);
    setPage(0);
    router.push(`/search?q=${encodeURIComponent(nextQuery)}`);
  };

  const goToPage = (nextPage: number) => {
    setPage(nextPage);
    router.replace(`/search?q=${encodeURIComponent(query.trim())}&page=${nextPage}`);
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/" className="mb-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">ERP Search</h1>
          <p className="mt-1 text-sm text-muted-foreground">Find matching records across your ERP workspace.</p>
        </div>
      </div>

      <form className="flex gap-2" onSubmit={submitSearch}>
        <div className="relative flex-1">
          <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search ERP records"
            autoFocus
            className="h-11 pl-10"
            onChange={(event) => setInput(event.target.value)}
            placeholder="Search SKU, gemstone, invoice, quotation, purchase, customer..."
            value={input}
          />
        </div>
        <Button disabled={input.trim().length < 2 || isLoading} type="submit">
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
          Search
        </Button>
      </form>

      {query.trim().length < 2 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <Search className="mx-auto h-8 w-8 text-muted-foreground/60" />
          <p className="mt-3 font-medium">Search your ERP records</p>
          <p className="mt-1 text-sm text-muted-foreground">Enter at least two characters to search inventory, invoices, quotations, purchases, customers and vendors.</p>
        </div>
      ) : isLoading && !data ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border p-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Searching for “{query}”...
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/30 p-8 text-center">
          <p className="font-medium text-destructive">Search could not be completed.</p>
          <p className="mt-1 text-sm text-muted-foreground">Please check your connection and try again.</p>
          <Button className="mt-4" onClick={() => setPage((current) => current)} variant="outline">Retry</Button>
        </div>
      ) : data?.results.length ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              Results for <span className="font-medium text-foreground">“{query}”</span>
              <span className="ml-2">· Page {page + 1} · up to 10 results per category</span>
            </p>
          </div>

          <div className="space-y-6">
            {resultTypes.map(({ name, icon: Icon }) => {
              const items = groupedResults.get(name);
              if (!items?.length) return null;
              return (
                <section aria-labelledby={`search-group-${name}`} className="overflow-hidden rounded-xl border bg-card" key={name}>
                  <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-3">
                    <Icon className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-semibold" id={`search-group-${name}`}>{name}</h2>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{items.length}</span>
                  </div>
                  <div className="divide-y">
                    {items.map((result) => (
                      <Link
                        className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-muted/40"
                        href={result.href}
                        key={result.id}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{result.title}</span>
                          {result.subtitle && <span className="mt-0.5 block truncate text-xs text-muted-foreground">{result.subtitle}</span>}
                        </span>
                        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </Link>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
          {(page > 0 || data.hasMore) && (
            <div className="flex items-center justify-between border-t pt-4">
              <Button disabled={page === 0 || isLoading} onClick={() => goToPage(page - 1)} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" /> Previous
              </Button>
              <span className="text-xs text-muted-foreground">Page {page + 1}</span>
              <Button disabled={!data.hasMore || isLoading} onClick={() => goToPage(page + 1)} variant="outline">
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <Search className="mx-auto h-8 w-8 text-muted-foreground/60" />
          <p className="mt-3 font-medium">No matching records</p>
          <p className="mt-1 text-sm text-muted-foreground">No records matched “{query}”. Check the spelling or try a SKU, document number, phone or customer name.</p>
        </div>
      )}
    </div>
  );
}
