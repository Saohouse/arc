import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await getCurrentUser();
    const cookieStore = await cookies();
    const storyId = cookieStore.get("arc_current_story")?.value;
    
    if (!user) {
      return NextResponse.json({
        error: "Not logged in",
        user: null,
        storyId: null,
        membership: null,
      });
    }

    let membership: { role: string; storyId: string } | null = null;
    if (storyId) {
      const membershipData = await prisma.storyMember.findUnique({
        where: {
          storyId_userId: {
            storyId,
            userId: user.id,
          },
        },
      });
      
      if (membershipData) {
        membership = {
          role: membershipData.role,
          storyId: membershipData.storyId,
        };
      }
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
      storyId,
      membership,
      cookies: {
        arc_current_story: cookieStore.get("arc_current_story")?.value,
        session: cookieStore.get("session")?.value ? "present" : "missing",
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
