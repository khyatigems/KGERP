"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  pollZohoInboxAction,
  disconnectZohoAction,
} from "@/app/(dashboard)/settings/email-templates/actions";
import { Mail, Inbox, Link2, Unlink, AlertTriangle } from "lucide-react";

export function ZohoConnection({
  configured,
  connected,
  email,
}: {
  configured: boolean;
  connected: boolean;
  email?: string | null;
}) {
  const [pending, startTransition] = useTransition();

  const connect = () => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/email/zoho/connect", { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to start OAuth");
        window.location.href = data.authorizationUrl;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to start OAuth");
      }
    });
  };

  const checkInbox = () => {
    startTransition(async () => {
      const result = await pollZohoInboxAction();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.failed > 0) {
        toast.error(
          `${result.error || "Inbox import failed."} ${result.processed} new; ${result.updated} updated; ${result.alreadySynced} already synced.`,
        );
        return;
      }
      if (result.contentWarning) {
        toast.warning(
          `Inbox synced: ${result.processed} new, ${result.updated} updated, ${result.alreadySynced} already synced. ${result.contentWarning}`,
        );
        return;
      }
      toast.success(
        `Inbox checked — ${result.processed} new, ${result.updated} updated, ${result.alreadySynced} already synced`,
      );
    });
  };

  const disconnect = () => {
    startTransition(async () => {
      const res = await disconnectZohoAction();
      if (!res.success) {
        toast.error(res.message || "Failed to disconnect");
        return;
      }
      toast.success("Zoho Mail disconnected");
      window.location.reload();
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-primary/10 p-2">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Zoho Mail</CardTitle>
              <CardDescription>
                Send invoices/certificates and receive replies via your Zoho Mail
                account (OAuth 2.0).
              </CardDescription>
              {connected && email && (
                <p className="mt-1 text-xs font-medium text-foreground">
                  Sending as <span className="font-mono">{email}</span>
                </p>
              )}
            </div>
          </div>
          <Badge variant={connected ? "default" : "secondary"} className="shrink-0">
            {connected ? "Connected" : configured ? "Not connected" : "Not configured"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!configured && (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Missing environment variables. Set{" "}
              <code className="rounded bg-background px-1">ZOHO_CLIENT_ID</code>,{" "}
              <code className="rounded bg-background px-1">ZOHO_CLIENT_SECRET</code>,{" "}
              <code className="rounded bg-background px-1">ZOHO_REDIRECT_URI</code>,{" "}
              <code className="rounded bg-background px-1">ZOHO_MAIL_FROM</code> and{" "}
              <code className="rounded bg-background px-1">EMAIL_PROVIDER=zoho</code>{" "}
              in your deployment environment, then redeploy.
            </span>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {!connected && (
            <Button onClick={connect} disabled={pending || !configured}>
              <Link2 className="mr-2 h-4 w-4" />
              {pending
                ? "Redirecting…"
                : configured
                  ? "Connect via Zoho OAuth"
                  : "Configure environment first"}
            </Button>
          )}

          {connected && (
            <>
              <Button variant="outline" onClick={checkInbox} disabled={pending}>
                <Inbox className="mr-2 h-4 w-4" />
                Check Inbox Now
              </Button>
              <Button
                variant="outline"
                onClick={connect}
                disabled={pending}
                className="text-destructive hover:text-destructive"
              >
                <Link2 className="mr-2 h-4 w-4" />
                Reconnect
              </Button>
              <Button variant="ghost" onClick={disconnect} disabled={pending}>
                <Unlink className="mr-2 h-4 w-4" />
                Disconnect
              </Button>
            </>
          )}
        </div>

        {connected && (
          <p className="text-xs text-muted-foreground">
            Inbox sync requires Zoho folder-read access. If sync reports a folder
            permission error, choose Reconnect, approve the requested access on
            Zoho, return here, and check the inbox again. Emails are sent through
            this connected Zoho account; disconnecting clears its stored OAuth
            tokens.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
