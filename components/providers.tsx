"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { WorkspaceAppearanceProvider } from "@/components/workspace-appearance-provider";
import { GlobalLoaderProvider } from "@/components/global-loader-provider";
import { RegisterServiceWorker } from "@/components/pwa/register-service-worker";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <RegisterServiceWorker />
      <NextThemesProvider
        attribute="class"
        defaultTheme="system"
        themes={["light", "dark", "dim"]}
        value={{ light: "light", dark: "dark", dim: "dark" }}
        enableSystem
        disableTransitionOnChange
      >
        <WorkspaceAppearanceProvider><GlobalLoaderProvider>
          {children}
        </GlobalLoaderProvider></WorkspaceAppearanceProvider>
      </NextThemesProvider>
    </SessionProvider>
  );
}
