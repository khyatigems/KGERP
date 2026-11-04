import { DefaultSession } from "next-auth"
import { Permission } from "@/lib/permissions"

declare module "next-auth" {
  interface User {
    mfaPolicy?: string
    mfaAuthenticator?: string
    role: string
    avatarUrl?: string | null
    lastLogin?: Date | string | null
  }
  
  interface Session {
    user: {
      appSessionId?: string
      id: string
      role: string
      avatarUrl?: string | null
      permissions: Permission[]
      lastLogin?: Date | string | null
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    appSessionId?: string
    mfaPolicy?: string
    mfaAuthenticator?: string
    role: string
    avatarUrl?: string | null
    permissions: Permission[]
    lastLogin?: Date | string | null
  }
}
