"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { GlobalLoaderProvider } from "@/components/global-loader-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <NextThemesProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <GlobalLoaderProvider>
          {children}
          <Toaster
            richColors
            expand
            visibleToasts={4}
            toastOptions={{
              className: "sass-enter",
            }}
          />
        </GlobalLoaderProvider>
      </NextThemesProvider>
    </SessionProvider>
  );
}
