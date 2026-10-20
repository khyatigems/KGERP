"use client";

import { useEffect, useState } from "react";
import { Download, Share } from "lucide-react";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { toast } from "@/lib/erp-feedback";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function InstallMenuItem() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    if (standalone) return;

    const iosTimer = window.setTimeout(() => {
      const userAgent = navigator.userAgent;
      setIos(/iPad|iPhone|iPod/.test(userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
    }, 0);

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const handleInstalled = () => setInstallPrompt(null);
    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
      window.clearTimeout(iosTimer);
    };
  }, []);

  if (!installPrompt && !ios) return null;

  const install = async () => {
    if (!installPrompt) {
      toast.info("To install KhyatiGems ERP, tap Share in Safari, then choose Add to Home Screen.", { duration: 8_000 });
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    if (choice.outcome === "accepted") toast.success("KhyatiGems ERP added to your apps");
  };

  return <>
    <DropdownMenuSeparator />
    <DropdownMenuItem onSelect={() => { void install(); }}>
      {ios ? <Share className="mr-2 h-4 w-4" /> : <Download className="mr-2 h-4 w-4" />}
      <span>{ios ? "Add to Home Screen" : "Install app"}</span>
    </DropdownMenuItem>
  </>;
}
