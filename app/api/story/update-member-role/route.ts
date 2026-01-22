import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const storyId = String(formData.get("storyId") ?? "");
    const userId = String(formData.get("userId") ?? "");
    const newRole = String(formData.get("role") ?? "");

    if (!storyId || !userId || !newRole) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    // Check if current user is owner of this story
    const currentMembership = await prisma.storyMember.findUnique({
      where: {
        storyId_userId: {
          storyId,
          userId: currentUser.id,
        },
      },
    });

    if (!currentMembership || currentMembership.role !== "owner") {
      return NextResponse.json(
        { error: "Only story owners can update member roles" },
        { status: 403 }
      );
    }

    // Don't allow changing your own role
    if (userId === currentUser.id) {
      return NextResponse.json(
        { error: "You cannot change your own role" },
        { status: 400 }
      );
    }

    // Update the member's role
    await prisma.storyMember.update({
      where: {
        storyId_userId: {
          storyId,
          userId,
        },
      },
      data: {
        role: newRole,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating member role:", error);
    return NextResponse.json(
      { error: "Failed to update member role" },
      { status: 500 }
    );
  }
}
