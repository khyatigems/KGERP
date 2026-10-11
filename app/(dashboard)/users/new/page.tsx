import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AnimatedPage } from "@/components/ui/animated-page";
import NewUserForm from "./new-user-form";

export default async function NewUserPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const roles = await prisma.role.findMany({
    where: { isActive: true, ...(session.user.role === "SUPER_ADMIN" ? {} : { name: { notIn: ["SUPER_ADMIN", "SUPERADMIN", "ADMINISTRATOR"] } }) },
    orderBy: { name: 'asc' }
  });

  return (
    <AnimatedPage><div className="max-w-2xl mx-auto">
      <NewUserForm roles={roles} />
    </div></AnimatedPage>
  );
}
