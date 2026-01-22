import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const CURRENT_STORY_COOKIE = "arc_current_story";

export async function getCurrentStory() {
  console.log("🔍 getCurrentStory() called");
  const currentUser = await getCurrentUser();
  
  if (!currentUser) {
    console.log("❌ No user logged in");
    return null;
  }

  const cookieStore = await cookies();
  const storyId = cookieStore.get(CURRENT_STORY_COOKIE)?.value;

  if (storyId) {
    // Check if user has access to this story
    const story = await prisma.story.findFirst({
      where: {
        id: storyId,
        members: {
          some: {
            userId: currentUser.id,
          },
        },
      },
    });
    
    if (story) {
      console.log("✅ Found story by ID:", story.name);
      return story;
    }
  }

  // Fall back to first story user has access to
  const story = await prisma.story.findFirst({
    where: {
      members: {
        some: {
          userId: currentUser.id,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  
  console.log("📊 First story result:", story?.name || "NULL");
  return story; // Can be null if no stories exist or user has no access
}

export async function setCurrentStory(storyId: string) {
  const cookieStore = await cookies();
  cookieStore.set(CURRENT_STORY_COOKIE, storyId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
}

/**
 * Get the current story or redirect to home if none exists.
 * Use this in pages that require a story to function.
 */
export async function requireStory() {
  const story = await getCurrentStory();
  if (!story) {
    redirect("/");
  }
  return story;
}
