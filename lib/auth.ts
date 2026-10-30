import NextAuth from "next-auth";
import { renderSignInVerifiedEmail } from "./security/otp-email";
import { consumeAuthenticator, consumeAuthenticatorRecovery, getAuthenticatorState } from "./security/authenticator";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { authConfig } from "./auth.config";
import { LOGIN_COOKIE, readCookie, requestContext, contextText } from "./security/core";
import { consumeChallenge, getSecurityPolicy, rateLimit, securityEvent, sendSecurityEmail, consumeRecoveryCode } from "./security/service";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async jwt(args) {
      const token = await authConfig.callbacks.jwt(args);
      if (args.user) token.mfaPolicy = args.user.mfaPolicy;
      if (args.user) token.mfaAuthenticator = args.user.mfaAuthenticator;
      const policy = await getSecurityPolicy();
      if (policy.enabled && token.mfaPolicy !== policy.version) return null;
      if (token.sub && token.mfaAuthenticator !== (await getAuthenticatorState(token.sub)).version) return null;
      return token;
    },
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        otp: { label: "Verification code", type: "text" },
        authenticatorCode: { label: "Authenticator code", type: "text" },
        recoveryCode: { label: "Recovery code", type: "text" },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) {
          console.log("Auth: Missing credentials");
          return null;
        }

        const email = String(credentials.email).trim().toLowerCase();
        const password = String(credentials.password);

        if (email.length > 254 || password.length > 1024) return null;
        if (!await rateLimit(`login:authorize:account:${email}`, 15, 900) ||
            !await rateLimit(`login:authorize:ip:${requestContext(request).ip}`, 150, 900)) return null;

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
        if (!valid) {
          await securityEvent(user.id, "LOGIN_PASSWORD_FAILED", request);
          return null;
        }

        const policy = await getSecurityPolicy();
        const authenticator = await getAuthenticatorState(user.id);
        if (policy.enabled || authenticator.enabled) {
          const recovered = credentials.recoveryCode
            ? (authenticator.enabled && authenticator.version ? await consumeAuthenticatorRecovery(user.id, String(credentials.recoveryCode).trim(), authenticator.version) : false) ||
              (policy.enabled && await consumeRecoveryCode(user.id, policy.version, String(credentials.recoveryCode).trim())) : false;
          const appVerified = !recovered && authenticator.enabled && authenticator.version && credentials.authenticatorCode
            ? await consumeAuthenticator(user.id, String(credentials.authenticatorCode), authenticator.version) : false;
          const verified = recovered || appVerified ? { version: policy.version } : policy.enabled ? await consumeChallenge(
            readCookie(request, LOGIN_COOKIE), user.id, "login", String(credentials.otp || "")) : null;
          if (!verified || verified.version !== policy.version) {
            await securityEvent(user.id, "LOGIN_OTP_FAILED", request);
            if (policy.enabled && policy.alerts && !await rateLimit(`login:otp-failures:${user.id}`, 4, 900) &&
                await rateLimit(`login:otp-alert:${user.id}`, 1, 900)) {
              await sendSecurityEmail(policy.email, "Repeated verification failures",
                `Account: ${user.email}\n${contextText(request)}\nSeveral sign-in attempts passed the password check but failed verification. No session was granted for these attempts. Review account security if unexpected.`).catch(() => {});
            }
            return null;
          }
          await securityEvent(user.id, recovered ? "LOGIN_RECOVERY_USED" : appVerified ? "LOGIN_AUTHENTICATOR_VERIFIED" : "LOGIN_OTP_VERIFIED", request);
          if (policy.enabled && (policy.alerts || recovered)) {
            // Delivery failure never turns a verified login into password-only access.
            const notice = renderSignInVerifiedEmail({ account: user.email, context: requestContext(request), recovered, authenticator: Boolean(appVerified) });
            await sendSecurityEmail(policy.email, notice.subject, notice.text, notice.html).catch(() => {});
          }
        }

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
          mfaPolicy: policy.enabled ? policy.version : undefined,
          mfaAuthenticator: authenticator.version,
        };
      },
    }),
  ],
});
