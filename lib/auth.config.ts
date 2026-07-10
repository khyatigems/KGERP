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

      // Ensure token.lastLogin stays in sync with DB for existing tokens to
      // avoid repeatedly treating missing/stale token values as a trigger
      // to update DB and log activity.
      try {
        if (token.sub) {
          const { prisma } = await import("./prisma");
          const dbUser = await prisma.user.findUnique({ where: { id: token.sub }, select: { lastLogin: true } });
          if (dbUser && dbUser.lastLogin) token.lastLogin = dbUser.lastLogin as any;
        }
      } catch (err) {
        // non-fatal; keep using existing token value
        // eslint-disable-next-line no-console
        console.error("Failed to refresh token.lastLogin from DB:", err);
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

        // If token.lastLogin is missing or stale, consult DB lastLogin to avoid repeated logs
        try {
          const { prisma } = await import("./prisma");
          const { logActivity } = await import("./activity-logger");

          const dbUser = await prisma.user.findUnique({ where: { id: token.sub }, select: { lastLogin: true, name: true, email: true } });
          const now = new Date();
          const cutoff = new Date(now.getTime() - 10 * 60 * 1000);

          // Perform a conditional update: only update lastLogin if it's null or older than cutoff.
          const updateResult = await prisma.user.updateMany({
            where: { id: token.sub, OR: [{ lastLogin: null }, { lastLogin: { lt: cutoff } }] },
            data: { lastLogin: now },
          });

          // If we updated exactly one row, create the activity log. This avoids race-conditions
          // where multiple concurrent requests would otherwise each insert a log.
          if (updateResult.count && updateResult.count > 0) {
            await logActivity({
              entityType: "Security",
              entityId: token.sub,
              entityIdentifier: dbUser?.email || dbUser?.name || session.user.email || session.user.name || token.sub,
              actionType: "LOGIN",
              userId: token.sub,
              userName: dbUser?.name || session.user.name || undefined,
              description: "User auto-logged in",
              metadata: { email: dbUser?.email || session.user.email, name: dbUser?.name || session.user.name },
              source: "WEB",
            });
            session.user.lastLogin = now as any;
          } else if (dbUser?.lastLogin) {
            session.user.lastLogin = dbUser.lastLogin as any;
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
