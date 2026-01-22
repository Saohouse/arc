import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;

  if (token) {
    // Delete session from database
    await prisma.session.deleteMany({ where: { token } });
  }

  // Clear the cookie
  cookieStore.delete("session");

  return NextResponse.json({ success: true });
}
