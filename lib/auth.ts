import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
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
        const { prisma, ensureActivityLogSchema, ensureUserRoleIdColumn } = await import("./prisma");

        await ensureActivityLogSchema();
        await ensureUserRoleIdColumn();

        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            roleRelation: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        });

        if (!user) {
          console.log("Auth: No user found for email", email);
          return null;
        }

        const valid = await compare(password, user.password);
        console.log("Auth: Password valid?", valid);
        if (!valid) return null;

        const permissions = user.roleRelation?.permissions.map(p => p.permission.key) || [];

        // Update last login and log activity using the shared logger (lazy import to avoid cycles)
        try {
          await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });
          const { logActivity } = await import("./activity-logger");
          await logActivity({
            entityType: "Security",
            entityId: user.id,
            entityIdentifier: user.email || user.name || user.id,
            actionType: "LOGIN",
            userId: user.id,
            userName: user.name,
            description: "User logged in successfully",
            metadata: { email: user.email, name: user.name },
            source: "WEB",
          });
        } catch (error) {
          console.error("Failed to update last login or log activity", error);
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatarUrl: user.avatarUrl,
          permissions: permissions,
          lastLogin: new Date(),
        };
      },
    }),
  ],
});
