import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { membershipId } = await request.json();

    // Update the membership to mark it as viewed
    await prisma.storyMember.update({
      where: {
        id: membershipId,
        userId: currentUser.id, // Ensure user can only mark their own memberships
      },
      data: {
        viewedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking invitation as viewed:", error);
    return NextResponse.json(
      { error: "Failed to mark invitation as viewed" },
      { status: 500 }
    );
  }
}
