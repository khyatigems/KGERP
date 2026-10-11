import Link from "next/link";
import { Plus, Trash2, Pencil, Users, Shield } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { LoadingLink } from "@/components/ui/loading-link";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { permissionLabel, isProtectedRole } from "@/lib/permission-display";
import { Badge } from "@/components/ui/badge";
import { deleteUser } from "./actions";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { AnimatedPage } from "@/components/ui/animated-page";
import { RolesPermissionsTable } from "@/components/roles-permissions-table";

export default async function UsersPage() {
  const session = await auth();
  const userId = session?.user?.id;
  
  if (!userId || !(await checkUserPermission(userId, PERMISSIONS.USERS_MANAGE))) {
    redirect("/");
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: { roleRelation: true }
  });

  return (
    <AnimatedPage><div className="space-y-6">
      <Tabs defaultValue="users" className="w-full">
        <TabsList>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6 mt-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div><h1 className="text-2xl font-semibold">Your team</h1><p className="text-sm text-muted-foreground">Manage {users.length} user accounts and their access to the ERP.</p></div>
            <Button asChild>
              <LoadingLink href="/users/new">
                <Plus className="mr-2 h-4 w-4" />
                Add User
              </LoadingLink>
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {users.map(user => {
              const role = user.roleRelation?.name || user.role;
              const protectedUser = isProtectedRole(role);
              const date = (value: Date | null, time = false) => value ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", ...(time ? { timeStyle: "short" as const } : {}), timeZone: "Asia/Kolkata" }).format(new Date(value)) : "Never signed in";
              return <article key={user.id} className="rounded-2xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  {user.avatarUrl ? <img src={user.avatarUrl} alt={user.name} className="h-14 w-14 rounded-2xl object-cover ring-1 ring-border"/> : user.avatar ? <div className="h-14 w-14 rounded-2xl overflow-hidden" dangerouslySetInnerHTML={{ __html: user.avatar }}/> : <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-xl font-semibold text-primary">{user.name.charAt(0).toUpperCase()}</div>}
                  <Badge variant={protectedUser ? "default" : "secondary"}>{protectedUser ? <Shield className="mr-1 h-3 w-3"/> : <Users className="mr-1 h-3 w-3"/>}{permissionLabel(role)}</Badge>
                </div>
                <h2 className="mt-4 text-lg font-semibold">{user.name}</h2><p className="text-sm text-muted-foreground break-all">{user.email}</p>
                {user.id === session.user.id && <Badge variant="outline" className="mt-2">Your account</Badge>}
                <dl className="mt-5 space-y-3 border-t pt-4 text-sm"><div><dt className="text-xs text-muted-foreground">Last sign-in</dt><dd className="mt-1">{date(user.lastLogin, true)}</dd></div><div><dt className="text-xs text-muted-foreground">Added to the team</dt><dd className="mt-1">{date(user.createdAt)}</dd></div></dl>
                <div className="mt-5 flex gap-2 border-t pt-4">
                  <Button variant="outline" size="sm" asChild><Link href={`/users/${user.id}/edit`}><Pencil className="mr-2 h-4 w-4"/>Edit user</Link></Button>
                  <form action={async () => { "use server"; await deleteUser(user.id); }}><Button variant="ghost" size="sm" type="submit" aria-label={`Delete ${user.name}`} disabled={protectedUser || user.email === "admin@khyatigems.com" || user.id === session.user.id}><Trash2 className="mr-2 h-4 w-4 text-destructive"/>Delete</Button></form>
                </div>
              </article>;
            })}
          </div>
          {users.length === 0 && <div className="rounded-2xl border p-10 text-center text-muted-foreground">No users added yet.</div>}

        </TabsContent>

        <TabsContent value="roles" className="mt-6">
          <RolesPermissionsTable />
        </TabsContent>
      </Tabs>
    </div></AnimatedPage>
  );
}
