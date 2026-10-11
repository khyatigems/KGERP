"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { permissionLabel, permissionDescription, isProtectedRole } from "@/lib/permission-display";
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
  const [roleModal, setRoleModal] = useState<"create" | "duplicate" | null>(null);
  const [roleName, setRoleName] = useState("");
  const [loadError, setLoadError] = useState("");
  const [adminMode, setAdminMode] = useState(false);

  const fetchRoles = useCallback(async (preferredId?: string) => {
    try {
      const res = await fetch("/api/roles");
      if (!res.ok) throw new Error("Unable to load roles. Please retry.");
      setLoadError("");
      if (res.ok) {
        const data = await res.json();
        setRoles(data.roles || []);
        setPermissions(data.permissions || []);
        const first = preferredId || (data.roles || [])[0]?.id;
        if (first) {
          setSelectedRoleId(first);
          const role = (data.roles || []).find((r: DBRole) => r.id === first);
          const keys = new Set<string>((role?.permissions || []).map((p: DBRole["permissions"][number]) => String(p.permission.key)));
          setSelectedKeys(keys);
        }
      }
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Unable to load roles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchRoles(); }, [fetchRoles]);

  useEffect(() => {
    const role = roles.find((r) => r.id === selectedRoleId);
    if (!role) return;
    setSelectedKeys(new Set((role.permissions || []).map((p: DBRole["permissions"][number]) => p.permission.key)));
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

  const selectedRole = roles.find(r => r.id === selectedRoleId);
  const protectedRole = isProtectedRole(selectedRole?.name);
  const editable = adminMode && !protectedRole && !saving;
  const dirty = !!selectedRole && (selectedRole.permissions.length !== selectedKeys.size || selectedRole.permissions.some(p => !selectedKeys.has(p.permission.key)));

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

  const handleSave = async () => {
    if (!selectedRoleId || protectedRole) return;
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
      await fetchRoles(selectedRoleId);
      toast.success("Role permissions saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save permissions");
    } finally {
      setSaving(false);
      setSavingMode(null);
    }
  };

  const handleCreateRole = async () => {
    if (!roleName.trim() || !roleModal) return;
    setSaving(true);
    try {
      const res = await fetch("/api/roles", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: roleName.trim(), ...(roleModal === "duplicate" ? { duplicateFromRoleId: selectedRoleId } : {}) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create role");
      await fetchRoles(data.id);
      setRoleModal(null); setRoleName("");
      toast.success("Role created. Select permissions and save changes.");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to create role"); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="rounded-2xl border p-8 text-muted-foreground" role="status">Loading roles and permissions...</div>;
  if (loadError) return <div role="alert" className="rounded-xl border p-6">{loadError}<Button onClick={() => fetchRoles(selectedRoleId)} className="ml-4">Retry</Button></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h2 className="text-2xl font-semibold">Roles & permissions</h2><p className="text-sm text-muted-foreground">Choose a role, then select what its users can do.</p></div>
        <Button disabled={!adminMode || saving} onClick={() => { setRoleName(""); setRoleModal("create"); }}>Create role</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {roles.map(role => <button key={role.id} type="button" disabled={saving} aria-pressed={role.id === selectedRoleId} onClick={() => {
          if (dirty && !window.confirm("Discard unsaved permission changes?")) return;
          setSelectedRoleId(role.id);
        }} className={`rounded-2xl border p-5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-primary ${role.id === selectedRoleId ? "border-primary bg-primary/5 ring-1 ring-primary" : "bg-card hover:bg-muted/50"}`}>
          <div className="flex items-center justify-between gap-2"><Shield className="h-5 w-5 text-primary"/><Badge variant="secondary">{isProtectedRole(role.name) ? "Protected" : role.isSystem ? "System role" : "Custom role"}</Badge></div>
          <h3 className="mt-3 font-semibold">{permissionLabel(role.name)}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{isProtectedRole(role.name) ? "Full access · unchanged" : `${role.permissions.length} permissions · ${role.isActive ? "Active" : "Inactive"}`}</p>
        </button>)}
      </div>
      <div className="rounded-2xl border bg-card p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h3 className="font-semibold">{permissionLabel(selectedRole?.name || "Select a role")}</h3><p className="text-sm text-muted-foreground">{protectedRole ? "Superadmin access is protected. Its permissions cannot be edited here." : `${selectedKeys.size} selected permissions${dirty ? " · Unsaved changes" : ""}`}</p></div>
          <div className="flex gap-2"><Button variant="outline" disabled={!editable || !selectedRole} onClick={() => { setRoleName(`${selectedRole?.name}_COPY`); setRoleModal("duplicate"); }}>Duplicate role</Button><Button disabled={!editable || !dirty} onClick={handleSave}>{savingMode === "save" ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}Save changes</Button></div>
        </div>
        <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/><Input aria-label="Search permissions" className="pl-9" placeholder="Search a module, function, or permission..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}/></div>
        <div className="flex items-start gap-2 text-xs text-muted-foreground"><Info className="h-4 w-4 shrink-0"/><p>Permissions apply to everyone with this role. Manage permissions cover multiple actions. Individual user overrides still apply. Only superadmin can save changes.</p></div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {modules.map(module => {
          const all = permissions.filter(p => p.module === module);
          const visible = all.filter(p => `${p.module} ${permissionLabel(p.action)} ${p.key} ${permissionDescription(p)}`.toLowerCase().includes(searchQuery.toLowerCase()));
          if (!visible.length) return null;
          const count = all.filter(p => selectedKeys.has(p.key)).length;
          return <section key={module} className="rounded-2xl border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between gap-3"><div><h3 className="font-semibold">{permissionLabel(module)}</h3><p className="text-xs text-muted-foreground">{protectedRole ? all.length : count} of {all.length} enabled</p></div><label className="flex items-center gap-2 text-xs"><Checkbox disabled={!editable} checked={protectedRole || count === all.length ? true : count ? "indeterminate" : false} onCheckedChange={v => selectAllForModule(module, v === true)}/>Select module</label></div>
            <div className="space-y-2">{visible.map(p => <label key={p.key} className={`flex items-start gap-3 rounded-xl border p-3 ${protectedRole || selectedKeys.has(p.key) ? "border-primary/20 bg-primary/5" : ""}`}>
              <Checkbox className="mt-1" disabled={!editable} checked={protectedRole || selectedKeys.has(p.key)} onCheckedChange={v => toggleKey(p.key, v === true)}/><div><div className="text-sm font-medium">{permissionLabel(p.action)}</div><p className="text-xs text-muted-foreground mt-1">{permissionDescription(p)}</p></div>
            </label>)}</div>
          </section>;
        })}
      </div>
      {!permissions.some(p => `${p.module} ${permissionLabel(p.action)} ${p.key} ${permissionDescription(p)}`.toLowerCase().includes(searchQuery.toLowerCase())) && <p className="text-center text-muted-foreground py-8">No permissions match your search.</p>}
      <Dialog open={roleModal !== null} onOpenChange={open => { if (!open && !saving) setRoleModal(null); }}>
        <DialogContent><DialogHeader><DialogTitle>{roleModal === "duplicate" ? "Duplicate role" : "Create a new role"}</DialogTitle><DialogDescription>{roleModal === "duplicate" ? "Start with the selected role’s saved permissions, then customize them." : "Give the role a clear name. After creating it, choose permissions for its users."}</DialogDescription></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); void handleCreateRole(); }} className="space-y-5"><div className="space-y-2"><Label htmlFor="role-name">Role name</Label><Input id="role-name" autoFocus required maxLength={60} placeholder="For example: Inventory Manager" value={roleName} onChange={e => setRoleName(e.target.value)} disabled={saving}/></div><DialogFooter><Button type="button" variant="outline" disabled={saving} onClick={() => setRoleModal(null)}>Cancel</Button><Button type="submit" disabled={saving || !roleName.trim()}>{saving ? "Creating..." : "Create role"}</Button></DialogFooter></form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
