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

        // Update last login
        try {
            await prisma.user.update({
                where: { id: user.id },
                data: { lastLogin: new Date() }
            });

            // Log activity manually to avoid circular dependency
            // Use 'Security' or 'User' as entityType? 'Security' fits LOGIN action better in the schema context
            // ActionType 'LOGIN' was added to activity-logger.ts
            await prisma.activityLog.create({
                data: {
                    // Let's match the schema structure:
                    // entity: "Security"
                    // entityId: user.id
                    // action: "LOGIN"
                    // userId: user.id
                    // details: JSON string or simple string
                    
                    entityType: "Security",
                    entityId: user.id,
                    actionType: "LOGIN",
                    userId: user.id,
                    details: JSON.stringify({ 
                        message: "User logged in successfully",
                        email: user.email,
                        name: user.name
                    }),
                    // timestamp/createdAt is handled by default @default(now())
                }
            });

        } catch (error) {
            console.error("Failed to update last login or log activity", error);
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          lastLogin: new Date(),
        };
      },
    }),
  ],
});
