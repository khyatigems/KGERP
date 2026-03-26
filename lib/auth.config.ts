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
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.lastLogin = user.lastLogin;
        
        // At login time, we only have user id. Let's not fetch permissions here if we can avoid it, 
        // or we can just pass an empty array and resolve them on the fly.
        // Actually, since NextAuth callbacks might not have DB access everywhere easily,
        // let's fetch permissions and embed them into the token to save DB calls on every page load.
        // BUT `checkUserPermission` needs DB access.
        // We will stick to putting the role in the token, and for now we'll mock the permissions array 
        // because we want real-time resolution from DB anyway.
        token.permissions = []; // We will resolve this dynamically in middleware/guard or let the UI handle it.
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = token.role as string;
        // The permissions array on session is deprecated for dynamic checks, 
        // but we'll leave it empty to satisfy TS. We should always use `checkUserPermission` instead.
        session.user.permissions = [];
        session.user.lastLogin = token.lastLogin as Date | null;
      }
      return session;
    },
  },
  providers: [], // Providers added in auth.ts
} satisfies NextAuthConfig;
