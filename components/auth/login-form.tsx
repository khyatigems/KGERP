"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    <form onSubmit={onSubmit} className="w-full space-y-5">
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Email Input */}
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-slate-300 mb-1.5"
        >
          Email
        </label>
        <Input
          id="email"
          type="email"
          name="email"
          autoComplete="email"
          required
          placeholder="name@khyatigems.com"
          className="w-full h-11 bg-white/5 border-white/10 rounded-lg text-white placeholder:text-slate-500"
        />
      </div>

      {/* Password Input */}
      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-slate-300 mb-1.5"
        >
          Password
        </label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            name="password"
            autoComplete="current-password"
            required
            placeholder="Enter your password"
            className="w-full h-11 bg-white/5 border-white/10 rounded-lg text-white placeholder:text-slate-500 pr-11"
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Remember Me */}
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          name="rememberMe"
          className="w-4 h-4 rounded border-white/30 bg-transparent accent-[#D9BC7A]"
        />
        <span className="text-slate-300 text-sm">Remember me</span>
      </label>

      {/* Login Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full h-11 rounded-lg bg-gradient-to-b from-[#D9BC7A] to-[#B8964F] text-[#1A1408] font-semibold text-base transition-all duration-300 hover:brightness-110 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Signing in...
          </span>
        ) : (
          "Sign In"
        )}
      </button>
    </form>
  );
}
