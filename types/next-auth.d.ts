import { DefaultSession } from "next-auth"
import { Permission } from "@/lib/permissions"

declare module "next-auth" {
  interface User {
    role: string
    lastLogin?: Date | string | null
  }
  
  interface Session {
    user: {
      id: string
      role: string
      permissions: Permission[]
      lastLogin?: Date | string | null
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string
    permissions: Permission[]
    lastLogin?: Date | string | null
  }
}
