"use client";

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
  DialogDescription,
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CsvImporter } from "@/components/ui/csv-importer";
import {
  createCode,
  updateCode,
  importCodes,
  checkCodeDuplicate,
  type CsvRow,
} from "@/app/(dashboard)/settings/codes/actions";
import { Download, Plus, Upload, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";

type CodeRow = {
  id: string;
  name: string;
  code: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

interface SettingsCodesViewProps {
  categories: CodeRow[];
  gemstones: CodeRow[];
  colors: CodeRow[];
  cuts: CodeRow[];
  collections: CodeRow[];
  rashis: CodeRow[];
}

type CodeGroup = "categories" | "gemstones" | "colors" | "cuts" | "collections" | "rashis";

export function SettingsCodesView({
  categories,
  gemstones,
  colors,
  cuts,
  collections,
  rashis,
}: SettingsCodesViewProps) {
  const [activeTab, setActiveTab] = useState<CodeGroup>("categories");

  return (
    <Tabs
      defaultValue="categories"
      value={activeTab}
      onValueChange={(v: string) => setActiveTab(v as CodeGroup)}
      className="space-y-4"
    >
      <div className="flex justify-between items-center">
        <TabsList>
          <TabsTrigger value="categories">Category Codes</TabsTrigger>
          <TabsTrigger value="gemstones">Gemstone Codes</TabsTrigger>
          <TabsTrigger value="colors">Color Codes</TabsTrigger>
          <TabsTrigger value="cuts">Cut Codes</TabsTrigger>
          <TabsTrigger value="collections">Collection Codes</TabsTrigger>
          <TabsTrigger value="rashis">Rashi Codes</TabsTrigger>
        </TabsList>
        <div className="flex gap-2">
          <ImportCodesDialog group={activeTab} />
          <ExportCodesButton
            group={activeTab}
            data={
              activeTab === "categories"
                ? categories
                : activeTab === "gemstones"
                ? gemstones
                : activeTab === "colors"
                ? colors
                : activeTab === "cuts"
                ? cuts
                : activeTab === "collections"
                ? collections
                : rashis
            }
          />
          <AddCodeDialog group={activeTab} />
        </div>
      </div>

      <TabsContent value="categories">
        <CodeTable group="categories" data={categories} />
      </TabsContent>
      <TabsContent value="gemstones">
        <CodeTable group="gemstones" data={gemstones} />
      </TabsContent>
      <TabsContent value="colors">
        <CodeTable group="colors" data={colors} />
      </TabsContent>
      <TabsContent value="cuts">
        <CodeTable group="cuts" data={cuts} />
      </TabsContent>
      <TabsContent value="collections">
        <CodeTable group="collections" data={collections} />
      </TabsContent>
      <TabsContent value="rashis">
        <CodeTable group="rashis" data={rashis} />
      </TabsContent>
    </Tabs>
  );
}

function CodeTable({ group, data }: { group: CodeGroup; data: CodeRow[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                No codes found. Add one to get started.
              </TableCell>
            </TableRow>
          ) : (
            data.map((row) => (
              <CodeRowItem
                key={row.id}
                row={row}
                group={group}
                isEditing={editingId === row.id}
                onEdit={() => setEditingId(row.id)}
                onCancel={() => setEditingId(null)}
                onSave={() => setEditingId(null)}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function CodeRowItem({
  row,
  group,
  isEditing,
  onEdit,
  onCancel,
  onSave,
}: {
  row: CodeRow;
  group: CodeGroup;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const [name, setName] = useState(row.name);
  const [status, setStatus] = useState(row.status);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    if (!name.trim()) return;
    const formData = new FormData();
    formData.append("id", row.id);
    formData.append("name", name);
    formData.append("status", status);

    startTransition(async () => {
      const res = await updateCode(group, formData);
      if (res.error) {
        alert(res.error);
      } else {
        onSave();
      }
    });
  };

  if (isEditing) {
    return (
      <TableRow>
        <TableCell>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-8"
          />
        </TableCell>
        <TableCell>
          <span className="font-mono text-sm text-muted-foreground cursor-not-allowed" title="Code cannot be edited">
            {row.code}
          </span>
        </TableCell>
        <TableCell>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-8 w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">ACTIVE</SelectItem>
              <SelectItem value="INACTIVE">INACTIVE</SelectItem>
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell className="text-muted-foreground text-xs">
            {new Date(row.createdAt).toLocaleDateString()}
        </TableCell>
        <TableCell className="text-muted-foreground text-xs">
            {new Date(row.updatedAt).toLocaleDateString()}
        </TableCell>
        <TableCell className="text-right space-x-2">
          <Button size="sm" variant="ghost" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isPending}>
            {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
          </Button>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{row.name}</TableCell>
      <TableCell className="font-mono">{row.code}</TableCell>
      <TableCell>
        <Badge variant={row.status === "ACTIVE" ? "default" : "secondary"}>
          {row.status}
        </Badge>
      </TableCell>
      <TableCell className="text-muted-foreground text-xs">
        {new Date(row.createdAt).toLocaleDateString()}
      </TableCell>
      <TableCell className="text-muted-foreground text-xs">
        {new Date(row.updatedAt).toLocaleDateString()}
      </TableCell>
      <TableCell className="text-right">
        <Button size="sm" variant="ghost" onClick={onEdit}>
          Edit
        </Button>
      </TableCell>
    </TableRow>
  );
}

function AddCodeDialog({ group }: { group: CodeGroup }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [isPending, startTransition] = useTransition();
  const [duplicateError, setDuplicateError] = useState(false);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

  const handleCodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    setCode(val);
    setDuplicateError(false);

    if (val.length > 0) {
      setCheckingDuplicate(true);
      const isDup = await checkCodeDuplicate(group, val);
      setDuplicateError(isDup);
      setCheckingDuplicate(false);
    }
  };

  const handleCreate = () => {
    if (!name || !code || duplicateError) return;

    const formData = new FormData();
    formData.append("name", name);
    formData.append("code", code);
    formData.append("status", status);

    startTransition(async () => {
      const res = await createCode(group, formData);
      if (res.error) {
        if (res.error === "CODE_ALREADY_EXISTS") {
            setDuplicateError(true);
        } else {
            alert(res.error);
        }
      } else {
        setOpen(false);
        setName("");
        setCode("");
        setStatus("ACTIVE");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Add New Code
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New {group === "categories" ? "Category" : group === "gemstones" ? "Gemstone" : group === "colors" ? "Color" : group === "cuts" ? "Cut" : group === "collections" ? "Collection" : "Rashi"} Code</DialogTitle>
          <DialogDescription>
            Create a new master code. Codes are immutable once created.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <Input
              placeholder={group === "cuts" ? "e.g. Round Brilliant" : "e.g. Sapphire"}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Code</label>
            <div className="relative">
                <Input
                placeholder={group === "cuts" ? "e.g. RND" : "e.g. SAP"}
                value={code}
                onChange={handleCodeChange}
                className={duplicateError ? "border-red-500 pr-10" : "pr-10"}
                />
                {checkingDuplicate && (
                    <div className="absolute right-3 top-2.5">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                )}
            </div>
            {duplicateError && (
              <p className="text-xs text-red-500 font-medium">
                This code already exists in the system. Duplicate codes are not allowed.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Uppercase, alphanumeric, max 6 chars.
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                <SelectItem value="INACTIVE">INACTIVE</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!name || !code || duplicateError || isPending || checkingDuplicate}>
            {isPending ? "Creating..." : "Create Code"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ExportCodesButton({ group, data }: { group: CodeGroup; data: CodeRow[] }) {
  const handleExport = () => {
    const csvData = data.map(row => ({
      name: row.name,
      code: row.code,
      status: row.status
    }));

    const ws = XLSX.utils.json_to_sheet(csvData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Codes");
    XLSX.writeFile(wb, `${group}_codes_export.csv`);
  };

  return (
    <Button variant="outline" onClick={handleExport}>
      <Download className="mr-2 h-4 w-4" /> Export CSV
    </Button>
  );
}

function ImportCodesDialog({ group }: { group: CodeGroup }) {
  const [open, setOpen] = useState(false);

  const handleImport = async (data: CsvRow[]) => {
    const res = await importCodes(group, data);
    if (res.success) {
        return {
            success: true,
            message: `Import Successful. Imported: ${res.results.importedCount}, Skipped: ${res.results.skippedDuplicatesCount}, Invalid: ${res.results.invalidCount}`,
            errors: res.results.errors
        };
    } else {
        return {
            success: false,
            message: "Import failed",
            errors: []
        };
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" /> Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import {group === "categories" ? "Category" : group === "gemstones" ? "Gemstone" : group === "colors" ? "Color" : group === "cuts" ? "Cut" : group === "collections" ? "Collection" : "Rashi"} Codes</DialogTitle>
          <DialogDescription>
            Upload a CSV file with headers: <code>name,code,status</code>.
            Duplicates will be skipped.
          </DialogDescription>
        </DialogHeader>
        <CsvImporter
          templateHeaders={["name", "code", "status"]}
          onImport={handleImport}
        />
      </DialogContent>
    </Dialog>
  );
}
