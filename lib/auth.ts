import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { getPermissionsForRole } from "./permissions";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log("Auth: Missing credentials");
          return null;
        }

        const email = String(credentials.email).trim().toLowerCase();
        const password = String(credentials.password);

        console.log("Auth: Login attempt for", email);

        // Lazy-load Prisma so Edge Runtime (middleware) does not instantiate PrismaClient
        const { prisma } = await import("./prisma");

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          console.log("Auth: No user found for email", email);
          return null;
        }

        const valid = await compare(password, user.password);
        console.log("Auth: Password valid?", valid);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.permissions = getPermissionsForRole(user.role);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = token.role as string;
        session.user.permissions = token.permissions as unknown as ReturnType<typeof getPermissionsForRole>;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});
