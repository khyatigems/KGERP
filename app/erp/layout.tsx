import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Permission } from "@/lib/permissions";

export default async function ErpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  
  // Fetch fresh user data to ensure avatar is up-to-date
  let user = session?.user;
  let allowedNavModules: string[] = [];

  if (session?.user?.id) {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        email: true,
        avatar: true,
        role: true,
        lastLogin: true,
        roleRelation: {
          select: { name: true, permissions: { select: { permission: { select: { key: true } } } } }
        },
        userPermissions: { select: { allow: true, permission: { select: { key: true } } } }
      }
    });
    
    if (dbUser) {
      // Resolve permissions
      const resolvedPerms = new Set<string>();
      
      // Legacy static fallback for now
      if (dbUser.role === "SUPER_ADMIN" || dbUser.roleRelation?.name === "SUPER_ADMIN") {
        allowedNavModules = ["ALL"];
      } else {
        // From role
        dbUser.roleRelation?.permissions.forEach(rp => resolvedPerms.add(rp.permission.key));
        
        // Apply overrides
        dbUser.userPermissions.forEach(up => {
          if (up.allow) resolvedPerms.add(up.permission.key);
          else resolvedPerms.delete(up.permission.key);
        });

        allowedNavModules = Array.from(resolvedPerms);
      }

      user = {
        ...session.user,
        name: dbUser.name,
        email: dbUser.email,
        image: dbUser.avatar, // Map avatar field to image
        role: dbUser.roleRelation?.name || dbUser.role,
        lastLogin: dbUser.lastLogin,
        permissions: allowedNavModules as Permission[]
      };
    }
  }

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-[250px_1fr]">
      <div className="hidden border-r lg:block bg-sidebar border-sidebar-border">
        <Sidebar allowedModules={allowedNavModules} />
      </div>
      <div className="flex flex-col">
        <Topbar user={user} />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
