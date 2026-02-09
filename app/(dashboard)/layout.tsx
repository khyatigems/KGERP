import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  
  // Fetch fresh user data to ensure avatar is up-to-date
  let user = session?.user;
  if (session?.user?.id) {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        email: true,
        avatar: true,
        role: true,
        lastLogin: true
      }
    });
    
    if (dbUser) {
      user = {
        ...session.user,
        name: dbUser.name,
        email: dbUser.email,
        image: dbUser.avatar, // Map avatar field to image
        role: dbUser.role,
        lastLogin: dbUser.lastLogin
      };
    }
  }

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-[250px_1fr]">
      <div className="hidden border-r lg:block bg-sidebar border-sidebar-border">
        <Sidebar />
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
