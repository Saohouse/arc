import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const CURRENT_STORY_COOKIE = "arc_current_story";

export async function getCurrentStory() {
  console.log("🔍 getCurrentStory() called");
  const cookieStore = await cookies();
  const storyId = cookieStore.get(CURRENT_STORY_COOKIE)?.value;

  if (storyId) {
    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (story) {
      console.log("✅ Found story by ID:", story.name);
      return story;
    }
  }

  // Fall back to first story, but don't auto-create
  const story = await prisma.story.findFirst({ orderBy: { createdAt: "asc" } });
  console.log("📊 First story result:", story?.name || "NULL");
  return story; // Can be null if no stories exist
}

export async function setCurrentStory(storyId: string) {
  const cookieStore = await cookies();
  cookieStore.set(CURRENT_STORY_COOKIE, storyId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
}
