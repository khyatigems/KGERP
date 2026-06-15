import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MAX_SIZE = 5 * 1024 * 1024;
const MAX_HISTORY = 5;

async function uploadBuffer(buffer: Buffer, publicId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "image",
        public_id: publicId,
        folder: "avatars",
        transformation: [{ width: 400, height: 400, crop: "fill", gravity: "face", quality: "auto" }],
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result?.secure_url || "");
      }
    );
    stream.end(buffer);
  });
}

async function updateAvatarHistory(userId: string, currentAvatar: string | null | undefined, newAvatar: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarHistory: true, avatarUrl: true },
  });
  let history: string[] = [];
  try {
    if (user?.avatarHistory) history = JSON.parse(user.avatarHistory);
  } catch { history = []; }
  if (!Array.isArray(history)) history = [];

  // Remove any duplicate of the new avatar
  history = history.filter((h) => h !== newAvatar);
  // Add the new one to the front
  history.unshift(newAvatar);
  // Keep only the last MAX_HISTORY (including current)
  if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);

  await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: newAvatar, avatarHistory: JSON.stringify(history) },
  });
  return history;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const timestamp = Date.now();
    const publicId = `avatar-${session.user.id}-${timestamp}`;
    const avatarUrl = await uploadBuffer(buffer, publicId);

    if (!avatarUrl) {
      return NextResponse.json({ error: "Upload to cloud failed" }, { status: 500 });
    }

    const history = await updateAvatarHistory(session.user.id, null, avatarUrl);

    return NextResponse.json({ avatarUrl, history });
  } catch (error) {
    console.error("Avatar upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { avatarUrl } = body;

    if (!avatarUrl || typeof avatarUrl !== "string") {
      return NextResponse.json({ error: "Invalid avatarUrl" }, { status: 400 });
    }

    // Verify the URL is in the user's history
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { avatarHistory: true },
    });

    let history: string[] = [];
    try {
      if (user?.avatarHistory) history = JSON.parse(user.avatarHistory);
    } catch { history = []; }
    if (!Array.isArray(history)) history = [];

    if (!history.includes(avatarUrl)) {
      return NextResponse.json({ error: "Avatar not in history" }, { status: 400 });
    }

    // Move selected avatar to the front
    history = history.filter((h) => h !== avatarUrl);
    history.unshift(avatarUrl);

    await prisma.user.update({
      where: { id: session.user.id },
      data: { avatarUrl, avatarHistory: JSON.stringify(history) },
    });

    return NextResponse.json({ avatarUrl, history });
  } catch (error) {
    console.error("Avatar select error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { avatarUrl: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Avatar delete error:", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { avatarUrl: true, avatarHistory: true },
    });

    let history: string[] = [];
    try {
      if (user?.avatarHistory) history = JSON.parse(user.avatarHistory);
    } catch { history = []; }
    if (!Array.isArray(history)) history = [];

    return NextResponse.json({ avatarUrl: user?.avatarUrl || null, history });
  } catch (error) {
    console.error("Avatar fetch error:", error);
    return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
  }
}
