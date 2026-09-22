import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { getFeatureFlag, FEATURE_FLAG_KEYS } from "@/lib/marketplace/feature-flags";
import { fetchGciCertificateMetadata, fetchGciCertificatePdf } from "@/lib/gci/client";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ number: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const allowed = await checkUserPermission(session.user.id, PERMISSIONS.LISTINGS_VIEW);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const enabled = await getFeatureFlag(FEATURE_FLAG_KEYS.gciCertificate);
  if (!enabled) {
    return NextResponse.json({ error: "GCI certificate integration is disabled" }, { status: 403 });
  }

  const { number } = await context.params;
  const certificateNumber = decodeURIComponent(number);
  const wantPdf = request.nextUrl.searchParams.get("pdf") === "1";

  try {
    if (wantPdf) {
      const pdf = await fetchGciCertificatePdf(certificateNumber);
      if (pdf === null) {
        return NextResponse.json({ error: "A4 PDF unavailable" }, { status: 409 });
      }
      return new NextResponse(new Uint8Array(pdf), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="certificate_${certificateNumber}.pdf"`,
        },
      });
    }

    const metadata = await fetchGciCertificateMetadata(certificateNumber);
    return NextResponse.json(metadata);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.includes("not found") ? 404 : message.includes("authorization") ? 401 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
