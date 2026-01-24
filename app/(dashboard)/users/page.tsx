import Link from "next/link";
import { Plus, Trash2, Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { LoadingLink } from "@/components/ui/loading-link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { deleteUser } from "./actions";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { RolesPermissionsTable } from "@/components/roles-permissions-table";

export default async function UsersPage() {
  const session = await auth();
  const role = session?.user?.role || "VIEWER";
  
  if (!hasPermission(role, PERMISSIONS.USERS_MANAGE)) {
    redirect("/");
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <Tabs defaultValue="users" className="w-full">
        <TabsList>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6 mt-6">
          <div className="flex items-center justify-end">
            <Button asChild>
              <LoadingLink href="/users/new">
                <Plus className="mr-2 h-4 w-4" />
                Add User
              </LoadingLink>
            </Button>
          </div>

          <div className="rounded-md border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        {user.avatar ? (
                          <div 
                            className="w-8 h-8 rounded-full overflow-hidden shrink-0"
                            dangerouslySetInnerHTML={{ __html: user.avatar }}
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span>{user.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === "SUPER_ADMIN" || user.role === "ADMIN" ? "default" : "secondary"}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.lastLogin 
                        ? new Date(user.lastLogin).toLocaleString() 
                        : <span className="text-muted-foreground text-sm">Never</span>}
                    </TableCell>
                    <TableCell>{user.createdAt.toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/users/${user.id}/edit`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        <form action={async () => {
                          "use server";
                          await deleteUser(user.id);
                        }}>
                          <Button 
                              variant="ghost" 
                              size="sm" 
                              type="submit"
                              disabled={user.email === "admin@khyatigems.com" || user.id === session?.user?.id}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </form>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="roles" className="mt-6">
          <RolesPermissionsTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
