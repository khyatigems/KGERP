import { SearchResultsPage } from "@/components/search/search-results-page";

export const dynamic = "force-dynamic";

interface SearchPageProps {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.slice(0, 100) : "";
  const parsedPage = Number.parseInt(params.page || "0", 10);
  const page = Number.isFinite(parsedPage) ? Math.max(0, Math.min(1000, parsedPage)) : 0;

  return <SearchResultsPage initialQuery={query} initialPage={page} />;
}
