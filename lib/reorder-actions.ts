"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

type ReorderItem = {
  id: string;
  order: number;
};

export async function reorderCharacters(
  storyId: string,
  items: ReorderItem[]
) {
  try {
    // Update each character's order in a transaction
    await prisma.$transaction(
      items.map((item) =>
        prisma.character.update({
          where: { id: item.id },
          data: { order: item.order },
        })
      )
    );

    revalidatePath(`/archive/characters`);
    return { success: true };
  } catch (error) {
    console.error("Failed to reorder characters:", error);
    throw new Error("Failed to save new order");
  }
}

export async function reorderWorlds(storyId: string, items: ReorderItem[]) {
  try {
    await prisma.$transaction(
      items.map((item) =>
        prisma.world.update({
          where: { id: item.id },
          data: { order: item.order },
        })
      )
    );

    revalidatePath(`/archive/worlds`);
    return { success: true };
  } catch (error) {
    console.error("Failed to reorder worlds:", error);
    throw new Error("Failed to save new order");
  }
}

export async function reorderLocations(storyId: string, items: ReorderItem[]) {
  try {
    await prisma.$transaction(
      items.map((item) =>
        prisma.location.update({
          where: { id: item.id },
          data: { order: item.order },
        })
      )
    );

    revalidatePath(`/archive/locations`);
    return { success: true };
  } catch (error) {
    console.error("Failed to reorder locations:", error);
    throw new Error("Failed to save new order");
  }
}

export async function reorderObjects(storyId: string, items: ReorderItem[]) {
  try {
    await prisma.$transaction(
      items.map((item) =>
        prisma.object.update({
          where: { id: item.id },
          data: { order: item.order },
        })
      )
    );

    revalidatePath(`/archive/objects`);
    return { success: true };
  } catch (error) {
    console.error("Failed to reorder objects:", error);
    throw new Error("Failed to save new order");
  }
}
