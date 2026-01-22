import { NextResponse } from "next/server";
import { setCurrentStory } from "@/lib/story";

export async function POST(request: Request) {
  try {
    const { storyId } = await request.json();
    
    if (!storyId || typeof storyId !== "string") {
      return NextResponse.json(
        { error: "Invalid story ID" },
        { status: 400 }
      );
    }

    await setCurrentStory(storyId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error setting story:", error);
    return NextResponse.json(
      { error: "Failed to set story" },
      { status: 500 }
    );
  }
}
