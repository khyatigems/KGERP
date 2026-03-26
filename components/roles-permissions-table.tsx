"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Shield, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";

type DBRole = {
  id: string;
  name: string;
  isSystem: boolean;
  isActive: boolean;
  permissions: { permission: { key: string } }[];
};

type DBPermission = {
  id: string;
  key: string;
  module: string;
  action: string;
  description: string | null;
};

export function RolesPermissionsTable() {
  const [searchQuery, setSearchQuery] = useState("");
  const [roles, setRoles] = useState<DBRole[]>([]);
  const [permissions, setPermissions] = useState<DBPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [savingMode, setSavingMode] = useState<"save" | "create" | "duplicate" | null>(null);
  const [adminMode, setAdminMode] = useState(false);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const res = await fetch("/api/roles");
      if (res.ok) {
        const data = await res.json();
        setRoles(data.roles || []);
        setPermissions(data.permissions || []);
        const first = (data.roles || [])[0]?.id;
        if (first) {
          setSelectedRoleId(first);
          const role = (data.roles || []).find((r: DBRole) => r.id === first);
          const keys = new Set<string>((role?.permissions || []).map((p: any) => String(p.permission.key)));
          setSelectedKeys(keys);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const formatPermission = (perm: string) => {
    return perm.split(":").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  };

  const getPermissionDescription = (perm: string) => {
    // Simple mapping for descriptions based on the permission key
    if (perm.includes("view")) return "Allows viewing of records";
    if (perm.includes("create")) return "Allows creation of new records";
    if (perm.includes("edit")) return "Allows modification of existing records";
    if (perm.includes("delete")) return "Allows deletion of records";
    if (perm.includes("manage")) return "Full administrative access";
    if (perm.includes("approve")) return "Allows approving workflows";
    return "Access to this function";
  };

  useEffect(() => {
    const role = roles.find((r) => r.id === selectedRoleId);
    if (!role) return;
    setSelectedKeys(new Set((role.permissions || []).map((p: any) => p.permission.key)));
  }, [selectedRoleId, roles]);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => {
        const role = String(s?.user?.role || "");
        setAdminMode(role === "SUPER_ADMIN");
      })
      .catch(() => setAdminMode(false));
  }, []);

  const modules = Array.from(
    permissions.reduce((acc, p) => {
      acc.add(p.module);
      return acc;
    }, new Set<string>())
  ).sort();

  const actionColumns = ["view", "create", "edit", "delete"];

  const keyFor = (module: string, action: string) => `${module}:${action}`;

  const toggleKey = (key: string, checked: boolean) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const selectAllForModule = (module: string, checked: boolean) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      const allForModule = permissions.filter((p) => p.module === module).map((p) => p.key);
      for (const k of allForModule) {
        if (checked) next.add(k);
        else next.delete(k);
      }
      return next;
    });
  };

  const selectAllForAction = (action: string, checked: boolean) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      const allForAction = permissions.filter((p) => p.action === action).map((p) => p.key);
      for (const k of allForAction) {
        if (checked) next.add(k);
        else next.delete(k);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!selectedRoleId) return;
    setSaving(true);
    setSavingMode("save");
    try {
      const res = await fetch("/api/roles", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ roleId: selectedRoleId, permissionKeys: Array.from(selectedKeys) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(typeof data?.error === "string" ? data.error : "Failed to save permissions");
      }
      await fetchRoles();
      toast.success("Role permissions saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save permissions");
    } finally {
      setSaving(false);
      setSavingMode(null);
    }
  };

  const handleCreateRole = async () => {
    const name = window.prompt("New role name (e.g., MANAGER):");
    if (!name) return;
    setSaving(true);
    setSavingMode("create");
    try {
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(typeof data?.error === "string" ? data.error : "Failed to create role");
      }
      await fetchRoles();
      toast.success("Role created");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create role");
    } finally {
      setSaving(false);
      setSavingMode(null);
    }
  };

  const handleDuplicateRole = async () => {
    if (!selectedRoleId) return;
    const baseRole = roles.find((r) => r.id === selectedRoleId);
    const name = window.prompt("Duplicate role name:", `${baseRole?.name || "ROLE"}_COPY`);
    if (!name) return;
    setSaving(true);
    setSavingMode("duplicate");
    try {
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, duplicateFromRoleId: selectedRoleId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(typeof data?.error === "string" ? data.error : "Failed to duplicate role");
      }
      await fetchRoles();
      toast.success("Role duplicated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to duplicate role");
    } finally {
      setSaving(false);
      setSavingMode(null);
    }
  };

  if (loading) return <div>Loading roles...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="font-semibold">Roles & Permissions</div>
        <div className="flex items-center gap-2">
          <Button onClick={handleCreateRole} disabled={!adminMode || saving} variant="secondary" className="gap-2">
            {saving && savingMode === "create" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Role"
            )}
          </Button>
          <Button onClick={handleDuplicateRole} disabled={!adminMode || saving} variant="secondary" className="gap-2">
            {saving && savingMode === "duplicate" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Duplicating...
              </>
            ) : (
              "Duplicate Role"
            )}
          </Button>
          <Button onClick={handleSave} disabled={!adminMode || saving || !selectedRoleId} className="gap-2">
            {saving && savingMode === "save" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-[280px]">
          <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {roles.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search modules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {actionColumns.map((a) => {
            const all = permissions.filter((p) => p.action === a).map((p) => p.key);
            const checked = all.length > 0 && all.every((k) => selectedKeys.has(k));
            return (
              <label key={a} className="flex items-center gap-2">
                <Checkbox
                  checked={checked}
                  onCheckedChange={(v) => selectAllForAction(a, Boolean(v))}
                  disabled={!adminMode}
                />
                <span>Select {a}</span>
              </label>
            );
          })}
        </div>
      </div>
      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[220px]">Module</TableHead>
              {actionColumns.map((a) => (
                <TableHead key={a} className="w-[120px] text-center">
                  {a.toUpperCase()}
                </TableHead>
              ))}
              <TableHead>More</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {modules
              .filter((m) => m.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((module) => {
                const modulePerms = permissions.filter((p) => p.module === module);
                const morePerms = modulePerms.filter((p) => !actionColumns.includes(p.action));
                const rowAllKeys = modulePerms.map((p) => p.key);
                const rowChecked = rowAllKeys.length > 0 && rowAllKeys.every((k) => selectedKeys.has(k));

                return (
                  <TableRow key={module}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" />
                        <span className="capitalize">{module}</span>
                        <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                          <Checkbox
                            checked={rowChecked}
                            onCheckedChange={(v) => selectAllForModule(module, Boolean(v))}
                            disabled={!adminMode}
                          />
                          <span>Select all</span>
                        </label>
                      </div>
                    </TableCell>
                    {actionColumns.map((action) => {
                      const key = keyFor(module, action);
                      const exists = modulePerms.some((p) => p.key === key);
                      if (!exists) {
                        return (
                          <TableCell key={action} className="text-center text-muted-foreground">
                            -
                          </TableCell>
                        );
                      }
                      return (
                        <TableCell key={action} className="text-center">
                          <Checkbox
                            checked={selectedKeys.has(key)}
                            onCheckedChange={(v) => toggleKey(key, Boolean(v))}
                            disabled={!adminMode}
                          />
                        </TableCell>
                      );
                    })}
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {morePerms.length ? (
                          morePerms.map((p) => (
                            <label key={p.key} className="flex items-center gap-2" title={getPermissionDescription(p.key)}>
                              <Checkbox
                                checked={selectedKeys.has(p.key)}
                                onCheckedChange={(v) => toggleKey(p.key, Boolean(v))}
                                disabled={!adminMode}
                              />
                              <Badge variant="secondary" className="cursor-help">
                                {formatPermission(p.key)}
                              </Badge>
                            </label>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            {modules.filter((m) => m.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No modules found matching your search.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-xs text-muted-foreground flex items-center gap-1">
        <Info className="h-3 w-3" />
        <span>Only SUPER_ADMIN can modify roles/permissions.</span>
      </div>
    </div>
  );
}
