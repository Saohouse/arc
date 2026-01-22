import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    await requireRole("admin");

    const formData = await request.formData();
    const userId = String(formData.get("userId") ?? "");
    const role = String(formData.get("role") ?? "");

    if (!userId || !role) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Unauthorized or failed to update" },
      { status: 403 }
    );
  }
}
