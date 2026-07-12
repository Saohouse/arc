"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { requireStory } from "@/lib/story";

async function cleanupCharacterReferences(storyId: string, ids: string[]) {
  if (ids.length === 0) return;

  const idSet = new Set(ids);

  await prisma.relationship.deleteMany({
    where: {
      storyId,
      OR: [
        { sourceType: "character", sourceId: { in: ids } },
        { targetType: "character", targetId: { in: ids } },
      ],
    },
  });

  await prisma.arc.updateMany({
    where: { storyId, characterId: { in: ids } },
    data: { characterId: null },
  });

  const scenes = await prisma.scene.findMany({
    where: {
      episode: { storyId },
    },
    select: { id: true, characterIds: true },
  });

  const sceneUpdates = scenes
    .map((scene) => {
      const currentIds = scene.characterIds
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
      const nextIds = currentIds.filter((id) => !idSet.has(id));

      if (nextIds.length === currentIds.length) {
        return null;
      }

      return prisma.scene.update({
        where: { id: scene.id },
        data: { characterIds: nextIds.join(",") },
      });
    })
    .filter((update): update is NonNullable<typeof update> => update !== null);

  if (sceneUpdates.length > 0) {
    await prisma.$transaction(sceneUpdates);
  }
}

export async function deleteCharacters(storyId: string, ids: string[]) {
  await requireRole("editor");
  const currentStory = await requireStory();

  if (currentStory.id !== storyId) {
    throw new Error("Forbidden");
  }

  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return { deleted: 0 };
  }

  await cleanupCharacterReferences(currentStory.id, uniqueIds);

  const result = await prisma.character.deleteMany({
    where: {
      id: { in: uniqueIds },
      storyId: currentStory.id,
    },
  });

  revalidatePath("/archive/characters");
  return { deleted: result.count };
}
