
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import EditUserForm from "./edit-form";

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    notFound();
  }

  // Pass user data needed for the form
  const userData = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
  };

  return (
    <div className="max-w-2xl mx-auto">
      <EditUserForm user={userData} />
    </div>
  );
}
