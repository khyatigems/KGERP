"use client";

import { useState, useEffect } from "react";
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
import { Loader2, Upload, ImageIcon, Check } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type EditableUser = Pick<User, "id" | "name" | "email" | "role" | "avatar"> & {
  avatarUrl?: string | null;
  avatarHistory?: string | null;
};

export default function EditUserForm({ user, roles }: { user: EditableUser, roles?: Record<string, unknown>[] }) {
  const [error, setError] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(user.avatar || PREDEFINED_AVATARS[0]);
  const [uploadedAvatarUrl, setUploadedAvatarUrl] = useState<string>(user.avatarUrl || "");
  const [history, setHistory] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    try {
      if (user.avatarHistory) {
        const h = JSON.parse(user.avatarHistory);
        if (Array.isArray(h)) setHistory(h);
      }
    } catch {}
  }, [user.avatarHistory]);

  const isCurrentUrl = (url: string) => uploadedAvatarUrl === url;
  const isPreset = !uploadedAvatarUrl;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("File too large (max 5MB)"); return; }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/user/avatar", { method: "POST", body: formData });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Upload failed"); }
      const data = await res.json();
      setUploadedAvatarUrl(data.avatarUrl);
      if (data.history && Array.isArray(data.history)) setHistory(data.history);
      toast.success("Avatar uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleSelectFromHistory = (url: string) => {
    setUploadedAvatarUrl(url);
  };

  async function clientAction(formData: FormData) {
    setError("");
    setSubmitting(true);
    formData.set("avatar", uploadedAvatarUrl || selectedAvatar);
    formData.set("avatarUrl", uploadedAvatarUrl);
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
          <div className="space-y-3">
            <Label>Avatar</Label>
            <div className="flex items-start gap-4">
              <div className="shrink-0">
                {uploadedAvatarUrl ? (
                  <Avatar className="h-20 w-20 ring-2 ring-white shadow-md">
                    <AvatarImage src={uploadedAvatarUrl} />
                    <AvatarFallback><ImageIcon /></AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="h-20 w-20 rounded-full ring-2 ring-white shadow-md overflow-hidden" dangerouslySetInnerHTML={{ __html: selectedAvatar }} />
                )}
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  <label className="inline-flex">
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                    <span className={cn("inline-flex items-center gap-2 px-3 py-1.5 text-sm border rounded-md cursor-pointer hover:bg-accent", uploading && "opacity-50 pointer-events-none")}>
                      <Upload className="h-3.5 w-3.5" />
                      {uploading ? "Uploading..." : "Upload photo"}
                    </span>
                  </label>
                  {uploadedAvatarUrl && (
                    <button type="button" onClick={() => setUploadedAvatarUrl("")} className="text-xs text-red-600 hover:underline">
                      Use preset
                    </button>
                  )}
                </div>

                {history.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">History (last 5):</p>
                    <div className="grid grid-cols-5 gap-2">
                      {history.map((url, i) => (
                        <button
                          key={`${url}-${i}`}
                          type="button"
                          onClick={() => handleSelectFromHistory(url)}
                          className={cn(
                            "relative aspect-square rounded-full overflow-hidden border-2 transition-all",
                            isCurrentUrl(url) ? "border-blue-600 scale-105" : "border-gray-200 hover:border-blue-400"
                          )}
                        >
                          <Avatar className="h-full w-full rounded-full">
                            <AvatarImage src={url} />
                            <AvatarFallback>...</AvatarFallback>
                          </Avatar>
                          {isCurrentUrl(url) && (
                            <div className="absolute inset-0 bg-blue-600/20 flex items-center justify-center">
                              <Check className="h-4 w-4 text-white drop-shadow" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Or pick a preset:</p>
                  <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
                    {PREDEFINED_AVATARS.map((svg, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => { setSelectedAvatar(svg); setUploadedAvatarUrl(""); }}
                        className={cn(
                          "relative rounded-full overflow-hidden transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                          isPreset && selectedAvatar === svg ? "ring-2 ring-primary ring-offset-2 scale-110" : "opacity-70 hover:opacity-100"
                        )}
                      >
                        <div className="w-9 h-9" dangerouslySetInnerHTML={{ __html: svg }} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <input type="hidden" name="avatar" value={uploadedAvatarUrl || selectedAvatar} />
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
