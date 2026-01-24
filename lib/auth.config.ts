import type { NextAuthConfig } from "next-auth";
import { getPermissionsForRole } from "./permissions";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.permissions = getPermissionsForRole(user.role);
        token.lastLogin = user.lastLogin;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = token.role as string;
        session.user.permissions = token.permissions as unknown as ReturnType<typeof getPermissionsForRole>;
        session.user.lastLogin = token.lastLogin as Date | null;
      }
      return session;
    },
  },
  providers: [], // Providers added in auth.ts
} satisfies NextAuthConfig;
