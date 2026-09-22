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
import { pollZohoInboxAction } from "@/app/(dashboard)/settings/email-templates/actions";

export function ZohoConnection({
  configured,
  connected,
}: {
  configured: boolean;
  connected: boolean;
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
      if (result.error) toast.error(result.error);
      else toast.success(`Inbox checked — ${result.processed} new message(s) imported`);
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Zoho Mail</CardTitle>
            <CardDescription>
              Send invoices/certificates and receive replies via your Zoho Mail account (OAuth 2.0).
            </CardDescription>
          </div>
          <Badge variant={connected ? "default" : "secondary"}>
            {connected ? "Connected" : "Not connected"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!configured && (
          <p className="text-xs text-muted-foreground">
            Set <code className="rounded bg-muted px-1">ZOHO_CLIENT_ID</code>,{" "}
            <code className="rounded bg-muted px-1">ZOHO_CLIENT_SECRET</code>,{" "}
            <code className="rounded bg-muted px-1">ZOHO_REDIRECT_URI</code> and{" "}
            <code className="rounded bg-muted px-1">ZOHO_MAIL_FROM</code> in <code>.env.local</code>.
          </p>
        )}
        <div className="flex gap-2">
          <Button onClick={connect} disabled={pending || !configured}>
            {connected ? "Reconnect via Zoho OAuth" : "Connect via Zoho OAuth"}
          </Button>
          {connected && (
            <Button variant="outline" onClick={checkInbox} disabled={pending}>
              Check Inbox Now
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
