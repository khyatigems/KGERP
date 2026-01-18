"use client";

import { CategoryCode, GemstoneCode, ColorCode } from "@prisma/client";
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
import { updateCodes } from "@/app/(dashboard)/settings/codes/actions";
import { useState } from "react";

interface SettingsCodesViewProps {
  categories: CategoryCode[];
  gemstones: GemstoneCode[];
  colors: ColorCode[];
}

type EditableCode = {
  id?: string;
  name: string;
  code: string;
  active: boolean;
};

export function SettingsCodesView({
  categories,
  gemstones,
  colors,
}: SettingsCodesViewProps) {
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsSaving(true);
    try {
      await updateCodes(formData);
    } finally {
      setIsSaving(false);
    }
  }

  function renderTable(namePrefix: string, items: EditableCode[]) {
    return (
      <form action={handleSubmit} className="space-y-4">
        <input type="hidden" name="group" value={namePrefix} />
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <TableRow key={item.id || `${namePrefix}-row-${index}`}>
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
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Changes"}
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
    })),
    {
      name: "",
      code: "",
      active: true,
    },
  ];

  const gemstoneItems: EditableCode[] = [
    ...gemstones.map((g) => ({
      id: g.id,
      name: g.name,
      code: g.code,
      active: g.active,
    })),
    {
      name: "",
      code: "",
      active: true,
    },
  ];

  const colorItems: EditableCode[] = [
    ...colors.map((c) => ({
      id: c.id,
      name: c.name,
      code: c.code,
      active: c.active,
    })),
    {
      name: "",
      code: "",
      active: true,
    },
  ];

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Category Master</h2>
        {renderTable("categories", categoryItems)}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Gemstone Code Master</h2>
        {renderTable("gemstones", gemstoneItems)}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Color Code Master</h2>
        {renderTable("colors", colorItems)}
      </section>
    </div>
  );
}
