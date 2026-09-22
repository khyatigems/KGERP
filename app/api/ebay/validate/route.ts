import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { validateImageUrl } from "@/lib/ebay-settings";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ valid: false, error: "URL is required" }, { status: 400 });
    }

    const result = await validateImageUrl(url);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Image validation error:", error);
    return NextResponse.json(
      {
        valid: false,
        error: error instanceof Error ? error.message : "Validation failed",
      },
      { status: 500 }
    );
  }
}
