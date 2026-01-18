"use client";

import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function Topbar() {
  return (
    <header className="flex h-14 items-center gap-4 border-b bg-gray-100/40 px-6 lg:h-[60px]">
      <div className="w-full flex-1">
        <h1 className="font-semibold text-lg">Dashboard</h1>
      </div>
      <Button variant="ghost" size="icon" onClick={() => signOut()}>
        <LogOut className="h-4 w-4" />
        <span className="sr-only">Logout</span>
      </Button>
    </header>
  );
}
