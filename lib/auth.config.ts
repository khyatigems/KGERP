import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        const parsed = new URL(url);
        if (parsed.origin === baseUrl) return url;
      } catch {}
      return baseUrl;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.avatarUrl = user.avatarUrl;
        token.lastLogin = user.lastLogin;
        token.permissions = [];
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = token.role as string;
        session.user.avatarUrl = token.avatarUrl as string | null | undefined;
        session.user.permissions = [];
        session.user.lastLogin = token.lastLogin as Date | null;
      }
      return session;
    },
  },
  providers: [], // Providers added in auth.ts
} satisfies NextAuthConfig;
