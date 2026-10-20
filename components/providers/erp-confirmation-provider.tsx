"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type ErpConfirmation = {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type ConfirmRequest = ErpConfirmation & { resolve: (confirmed: boolean) => void };
const ConfirmationContext = createContext<((request: ErpConfirmation) => Promise<boolean>) | null>(null);

export function ErpConfirmationProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const resolver = useRef<((confirmed: boolean) => void) | null>(null);

  const confirm = useCallback((options: ErpConfirmation) => new Promise<boolean>((resolve) => {
    resolver.current?.(false);
    resolver.current = resolve;
    setRequest({ ...options, resolve });
  }), []);

  const finish = (confirmed: boolean) => {
    const current = resolver.current;
    resolver.current = null;
    setRequest(null);
    current?.(confirmed);
  };

  return (
    <ConfirmationContext.Provider value={confirm}>
      {children}
      <AlertDialog open={Boolean(request)} onOpenChange={(open) => { if (!open) finish(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{request?.title}</AlertDialogTitle>
            <AlertDialogDescription>{request?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => finish(false)}>{request?.cancelLabel || "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              className={request?.destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}
              onClick={(event) => { event.preventDefault(); finish(true); }}
            >
              {request?.confirmLabel || "Continue"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmationContext.Provider>
  );
}

export function useErpConfirmation() {
  const confirm = useContext(ConfirmationContext);
  if (!confirm) throw new Error("useErpConfirmation must be used within ErpConfirmationProvider");
  return confirm;
}
