import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AnimatedPage } from "@/components/ui/animated-page";
import { WorkspaceHeader } from "@/components/layout/workspace-header";
import NewUserForm from "./new-user-form";

export default async function NewUserPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const roles = await prisma.role.findMany({
    where: { isActive: true, ...(session.user.role === "SUPER_ADMIN" ? {} : { name: { notIn: ["SUPER_ADMIN", "SUPERADMIN", "ADMINISTRATOR"] } }) },
    orderBy: { name: 'asc' }
  });

  return (
    <AnimatedPage><div className="max-w-2xl mx-auto space-y-5">
      <WorkspaceHeader eyebrow="KhyatiGems · Administration"><h1>Add User</h1><p>Create an account and assign access to your ERP.</p></WorkspaceHeader>
      <NewUserForm roles={roles} />
    </div></AnimatedPage>
  );
}
