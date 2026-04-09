import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/settings/state-codes
export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stateCodes = await prisma.stateCode.findMany({
      orderBy: { name: "asc" },
    });
    
    return NextResponse.json(stateCodes);
  } catch (error) {
    console.error("Failed to fetch state codes:", error);
    return NextResponse.json(
      { error: "Failed to fetch state codes" },
      { status: 500 }
    );
  }
}

// POST /api/settings/state-codes
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    
    const stateCode = await prisma.stateCode.create({
      data: {
        name: body.stateName,
        code: body.stateCode,
      },
    });

    return NextResponse.json(stateCode);
  } catch (error) {
    console.error("Failed to create state code:", error);
    return NextResponse.json(
      { error: "Failed to create state code" },
      { status: 500 }
    );
  }
}

