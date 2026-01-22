import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const CURRENT_STORY_COOKIE = "arc_current_story";

export async function getCurrentStory() {
  const cookieStore = await cookies();
  const storyId = cookieStore.get(CURRENT_STORY_COOKIE)?.value;

  if (storyId) {
    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (story) return story;
  }

  // Fall back to first story or create default
  let story = await prisma.story.findFirst({ orderBy: { createdAt: "asc" } });

  if (!story) {
    story = await prisma.story.create({
      data: {
        name: "Sao House World Story",
        description: "The primary universe",
      },
    });
  }

  return story;
}

export async function setCurrentStory(storyId: string) {
  const cookieStore = await cookies();
  cookieStore.set(CURRENT_STORY_COOKIE, storyId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
}
