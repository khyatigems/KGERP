"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateUser } from "../../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PREDEFINED_AVATARS } from "@/lib/avatars";
import { cn } from "@/lib/utils";
import type { User } from "@prisma/client";
import { Loader2 } from "lucide-react";

type EditableUser = Pick<User, "id" | "name" | "email" | "role" | "avatar">;

export default function EditUserForm({ user, roles }: { user: EditableUser, roles?: Record<string, unknown>[] }) {
  const [error, setError] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(user.avatar || PREDEFINED_AVATARS[0]);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function clientAction(formData: FormData) {
    setError("");
    setSubmitting(true);
    formData.set("avatar", selectedAvatar);
    try {
      const res = await updateUser(user.id, formData);
      if (res?.message) {
        setError(res.message);
        toast.error(res.message);
        return;
      }
      toast.success("User updated");
      router.push("/users");
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to update user";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit User</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={clientAction} className="space-y-4">
          <div className="space-y-2">
            <Label>Avatar</Label>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-4 p-4 border rounded-lg bg-slate-50 dark:bg-slate-900">
              {PREDEFINED_AVATARS.map((svg, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setSelectedAvatar(svg)}
                  className={cn(
                    "relative rounded-full overflow-hidden transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                    selectedAvatar === svg ? "ring-2 ring-primary ring-offset-2 scale-110" : "opacity-70 hover:opacity-100"
                  )}
                >
                  <div 
                      className="w-12 h-12"
                      dangerouslySetInnerHTML={{ __html: svg }} 
                  />
                </button>
              ))}
            </div>
            <input type="hidden" name="avatar" value={selectedAvatar} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={user.name} required />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={user.email} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password (Leave blank to keep current)</Label>
            <Input id="password" name="password" type="password" minLength={6} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select name="role" defaultValue={user.role}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {roles && roles.length > 0 ? (
                  roles.map(r => (
                    <SelectItem key={r.id as string} value={r.name as string}>{(r.name as string).replace("_", " ")}</SelectItem>
                  ))
                ) : (
                  <>
                    <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="SALES">Sales</SelectItem>
                    <SelectItem value="ACCOUNTS">Accounts</SelectItem>
                    <SelectItem value="VIEWER">Viewer</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="gap-2">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? "Updating..." : "Update User"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
