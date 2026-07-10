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

        // If token.lastLogin is missing or stale, update DB and record an activity log.
        try {
          const tokenLast = token.lastLogin ? new Date(token.lastLogin as string) : null;
          const now = new Date();
          const shouldUpdate = !tokenLast || (now.getTime() - tokenLast.getTime() > 5 * 60 * 1000); // 5 minute threshold
          if (shouldUpdate) {
            const { prisma } = await import("./prisma");
            const { logActivity } = await import("./activity-logger");

            await prisma.user.update({ where: { id: token.sub }, data: { lastLogin: now } });

            // Log activity as an auto-login event
            await logActivity({
              entityType: "Security",
              entityId: token.sub,
              actionType: "LOGIN",
              userId: token.sub,
              description: JSON.stringify({ message: "User auto-logged in", email: session.user.email, name: session.user.name }),
              source: "WEB",
            });

            session.user.lastLogin = now as any;
          }
        } catch (err) {
          // Don't block session creation on logging errors
          // eslint-disable-next-line no-console
          console.error("Failed to update lastLogin in session callback:", err);
        }
      }
      return session;
    },
  },
  providers: [], // Providers added in auth.ts
} satisfies NextAuthConfig;
