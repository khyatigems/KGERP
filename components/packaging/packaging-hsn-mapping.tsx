"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { getPackagingCategoryHsnSettings, upsertPackagingCategoryHsns } from "@/app/erp/packaging/actions";

type Row = { category: string; hsnCode: string };

export function PackagingHsnMapping() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [initialMap, setInitialMap] = useState<Record<string, string>>({});
  const [draftMap, setDraftMap] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await getPackagingCategoryHsnSettings();
      if (!res.success) {
        toast.error(res.message || "Failed to load HSN settings");
        return;
      }
      setCategories(res.categories || []);
      setInitialMap(res.map || {});
      setDraftMap(res.map || {});
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load HSN settings";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const rows: Row[] = useMemo(() => {
    const q = search.trim().toLowerCase();
    return categories
      .filter((c) => !q || c.toLowerCase().includes(q))
      .map((c) => ({ category: c, hsnCode: draftMap[c] || "" }));
  }, [categories, draftMap, search]);

  const dirtyCount = useMemo(() => {
    let n = 0;
    for (const c of categories) {
      const a = (initialMap[c] || "").trim();
      const b = (draftMap[c] || "").trim();
      if (a !== b) n++;
    }
    return n;
  }, [categories, draftMap, initialMap]);

  const onSaveAll = async () => {
    const entries: Array<{ category: string; hsnCode: string }> = [];
    for (const c of categories) {
      const before = (initialMap[c] || "").trim();
      const after = (draftMap[c] || "").trim();
      if (before === after) continue;
      entries.push({ category: c, hsnCode: after });
    }
    if (entries.length === 0) {
      toast.message("No changes to save");
      return;
    }

    setSaving(true);
    try {
      const res = await upsertPackagingCategoryHsns(entries);
      if (!res.success) {
        toast.error(res.message || "Failed to save HSN mappings");
        return;
      }
      toast.success("HSN mappings saved");
      await load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to save HSN mappings";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>HSN by Category</CardTitle>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-[240px]"
          />
          <Button onClick={onSaveAll} disabled={loading || saving || dirtyCount === 0}>
            {(loading || saving) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            Save {dirtyCount > 0 ? `(${dirtyCount})` : ""}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground mb-4">
          Categories are detected from inventory automatically. Leave HSN blank to remove mapping.
        </div>
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="w-[240px]">HSN Code</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={2} className="py-10 text-center text-muted-foreground">
                    <Loader2 className="inline-block h-4 w-4 animate-spin mr-2" />
                    Loading...
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="py-10 text-center text-muted-foreground">
                    No categories found
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.category}>
                    <TableCell className="font-medium">{r.category}</TableCell>
                    <TableCell>
                      <Input
                        value={r.hsnCode}
                        placeholder="e.g. 7103"
                        onChange={(e) =>
                          setDraftMap((prev) => ({
                            ...prev,
                            [r.category]: e.target.value,
                          }))
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

