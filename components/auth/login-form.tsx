"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError("Invalid email or password");
        setLoading(false);
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("An error occurred");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <Input
            id="email"
            name="email"
            type="email"
            required
            placeholder="Email address"
            autoComplete="email"
            className="h-12 px-4 rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[15px] focus-visible:ring-2 focus-visible:ring-[#1a73e8] focus-visible:border-[#1a73e8] transition-shadow"
          />
          <Input
            id="password"
            name="password"
            type="password"
            required
            placeholder="Password"
            autoComplete="current-password"
            className="h-12 px-4 rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[15px] focus-visible:ring-2 focus-visible:ring-[#1a73e8] focus-visible:border-[#1a73e8] transition-shadow"
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-11 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] active:bg-[#185abc] text-white font-medium text-sm tracking-wide transition-colors shadow-sm"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in...
            </span>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>
    </div>
  );
}
