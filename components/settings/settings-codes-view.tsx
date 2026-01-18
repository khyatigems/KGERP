"use client";

import type React from "react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateCodes } from "@/app/(dashboard)/settings/codes/actions";

type CodeRow = {
  id: string;
  name: string;
  code: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

interface SettingsCodesViewProps {
  categories: CodeRow[];
  gemstones: CodeRow[];
  colors: CodeRow[];
}

type EditableCode = {
  id?: string;
  name: string;
  code: string;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

type CodeGroup = "categories" | "gemstones" | "colors";

type StatusFilter = "all" | "active" | "inactive";

type SortKey = "name" | "code" | "createdAt" | "updatedAt";

type SortDirection = "asc" | "desc";

export function SettingsCodesView({
  categories,
  gemstones,
  colors,
}: SettingsCodesViewProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [activeGroup, setActiveGroup] = useState<CodeGroup>("categories");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newActive, setNewActive] = useState(true);

  async function handleSubmit(formData: FormData) {
    setIsSaving(true);
    try {
      await updateCodes(formData);
    } finally {
      setIsSaving(false);
    }
  }

  function getGroupLabel(group: CodeGroup) {
    if (group === "categories") return "Category";
    if (group === "gemstones") return "Gemstone";
    return "Color";
  }

  function filteredAndSorted(items: EditableCode[]) {
    let result = items;
    if (statusFilter === "active") {
      result = result.filter((item) => item.active);
    } else if (statusFilter === "inactive") {
      result = result.filter((item) => !item.active);
    }
    result = [...result].sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";
      if (sortKey === "name") {
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
      } else if (sortKey === "code") {
        aVal = a.code.toLowerCase();
        bVal = b.code.toLowerCase();
      } else if (sortKey === "createdAt") {
        aVal = a.createdAt ? a.createdAt.getTime() : 0;
        bVal = b.createdAt ? b.createdAt.getTime() : 0;
      } else if (sortKey === "updatedAt") {
        aVal = a.updatedAt ? a.updatedAt.getTime() : 0;
        bVal = b.updatedAt ? b.updatedAt.getTime() : 0;
      }
      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return result;
  }

  function handleStatusChange(
    currentActive: boolean,
    event: React.ChangeEvent<HTMLSelectElement>
  ) {
    const nextValue = event.target.value;
    if (currentActive && nextValue === "false") {
      const confirmed = window.confirm(
        "Are you sure you want to deactivate this code? It will no longer be available for new inventory entries, but existing items will be unaffected."
      );
      if (!confirmed) {
        event.target.value = "true";
      }
    }
  }

  function renderTable(group: CodeGroup, items: EditableCode[]) {
    const namePrefix = group;
    const rows = filteredAndSorted(items);

    return (
      <form
        action={handleSubmit}
        className="space-y-4"
      >
        <input type="hidden" name="group" value={namePrefix} />
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">Code ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((item, index) => (
                <TableRow key={item.id || `${namePrefix}-row-${index}`}>
                  <TableCell className="font-mono text-xs">
                    {item.id || "New"}
                    {item.id && !item.active && (
                      <span className="ml-1 inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700">
                        Inactive
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Input
                      name={`${namePrefix}[${index}][name]`}
                      defaultValue={item.name}
                    />
                    {item.id && (
                      <input
                        type="hidden"
                        name={`${namePrefix}[${index}][id]`}
                        value={item.id}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Input
                      name={`${namePrefix}[${index}][code]`}
                      defaultValue={item.code}
                    />
                  </TableCell>
                  <TableCell>
                    <select
                      name={`${namePrefix}[${index}][active]`}
                      defaultValue={item.active ? "true" : "false"}
                      className="border rounded px-2 py-1 text-sm"
                      onChange={(event) =>
                        handleStatusChange(item.active, event)
                      }
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {item.createdAt
                      ? item.createdAt.toLocaleDateString()
                      : "-"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {item.updatedAt
                      ? item.updatedAt.toLocaleDateString()
                      : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <Button type="submit" disabled={isSaving || isPending}>
          {isSaving || isPending ? "Saving..." : "Save Changes"}
        </Button>
      </form>
    );
  }

  const categoryItems: EditableCode[] = [
    ...categories.map((c) => ({
      id: c.id,
      name: c.name,
      code: c.code,
      active: c.active,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    })),
  ];

  const gemstoneItems: EditableCode[] = [
    ...gemstones.map((g) => ({
      id: g.id,
      name: g.name,
      code: g.code,
      active: g.active,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
    })),
  ];

  const colorItems: EditableCode[] = [
    ...colors.map((c) => ({
      id: c.id,
      name: c.name,
      code: c.code,
      active: c.active,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    })),
  ];

  function currentItems() {
    if (activeGroup === "categories") return categoryItems;
    if (activeGroup === "gemstones") return gemstoneItems;
    return colorItems;
  }

  function handleCreateCode() {
    const group = activeGroup;
    const fd = new FormData();
    fd.set("group", group);
    fd.set(`${group}[0][name]`, newName);
    fd.set(`${group}[0][code]`, newCode);
    fd.set(`${group}[0][active]`, newActive ? "true" : "false");
    setIsSaving(true);
    startTransition(async () => {
      try {
        await updateCodes(fd);
        setDialogOpen(false);
        setNewName("");
        setNewCode("");
        setNewActive(true);
      } finally {
        setIsSaving(false);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-md border bg-background p-1">
            <button
              type="button"
              onClick={() => setActiveGroup("categories")}
              className={`px-3 py-1 text-xs font-medium rounded-sm ${
                activeGroup === "categories"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground"
              }`}
            >
              Categories
            </button>
            <button
              type="button"
              onClick={() => setActiveGroup("gemstones")}
              className={`px-3 py-1 text-xs font-medium rounded-sm ${
                activeGroup === "gemstones"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground"
              }`}
            >
              Gemstones
            </button>
            <button
              type="button"
              onClick={() => setActiveGroup("colors")}
              className={`px-3 py-1 text-xs font-medium rounded-sm ${
                activeGroup === "colors"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground"
              }`}
            >
              Colors
            </button>
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) =>
              setStatusFilter(value as StatusFilter)
            }
          >
            <SelectTrigger className="h-8 w-[150px] text-xs">
              <SelectValue placeholder="Status filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active only</SelectItem>
              <SelectItem value="inactive">Inactive only</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={sortKey}
            onValueChange={(value) => setSortKey(value as SortKey)}
          >
            <SelectTrigger className="h-8 w-[160px] text-xs">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Sort by Name</SelectItem>
              <SelectItem value="code">Sort by Code</SelectItem>
              <SelectItem value="createdAt">Sort by Created</SelectItem>
              <SelectItem value="updatedAt">Sort by Updated</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={sortDirection}
            onValueChange={(value) =>
              setSortDirection(value as SortDirection)
            }
          >
            <SelectTrigger className="h-8 w-[120px] text-xs">
              <SelectValue placeholder="Direction" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">Ascending</SelectItem>
              <SelectItem value="desc">Descending</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              Add New {getGroupLabel(activeGroup)} Code
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Add New {getGroupLabel(activeGroup)} Code
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Display name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Code</label>
                <Input
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  placeholder="Short code (e.g. LG, AM, BLU)"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={newActive ? "active" : "inactive"}
                  onValueChange={(value) =>
                    setNewActive(value === "active")
                  }
                >
                  <SelectTrigger className="h-8 w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={
                  !newName.trim() ||
                  !newCode.trim() ||
                  isSaving ||
                  isPending
                }
                onClick={handleCreateCode}
              >
                {isSaving || isPending ? "Saving..." : "Create Code"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">
          {getGroupLabel(activeGroup)} Codes
        </h2>
        <p className="text-sm text-muted-foreground">
          Manage master codes used to generate SKUs and standardise data.
        </p>
        {renderTable(activeGroup, currentItems())}
      </section>
    </div>
  );
}
