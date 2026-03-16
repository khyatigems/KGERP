import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { getPaymentCompletenessValidation, reconcileHistoricalInvoicePayments } from "@/lib/payment-reconciliation";

function toBoolean(value: string | null) {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, PERMISSIONS.REPORTS_VIEW)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const dryRun = toBoolean(request.nextUrl.searchParams.get("dryRun"));
  const [reconcileResult, validation] = await Promise.all([
    reconcileHistoricalInvoicePayments({ dryRun }),
    getPaymentCompletenessValidation()
  ]);
  return NextResponse.json({ dryRun, reconcileResult, validation });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, PERMISSIONS.SETTINGS_MANAGE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { dryRun?: boolean };
  const dryRun = Boolean(body.dryRun);
  const [reconcileResult, validation] = await Promise.all([
    reconcileHistoricalInvoicePayments({ dryRun }),
    getPaymentCompletenessValidation()
  ]);
  return NextResponse.json({ dryRun, reconcileResult, validation });
}
