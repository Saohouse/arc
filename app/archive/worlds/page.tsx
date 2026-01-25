import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStory } from "@/lib/story";
import { RoleGate } from "@/components/arc/RoleGate";
import { WorldsPageClient } from "./WorldsPageClient";

export default async function WorldsPage() {
  const currentStory = await requireStory();
  const [worlds, customTags] = await Promise.all([
    prisma.world.findMany({
      where: { storyId: currentStory.id },
      orderBy: { order: "asc" },
      select: {
        id: true,
        name: true,
        summary: true,
        imageUrl: true,
        tags: true,
        order: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.tag.findMany({
      where: { storyId: currentStory.id },
      select: { name: true, color: true },
    }),
  ]);

  const tagColorMap = new Map<string, string | null>(
    customTags.map((t) => [t.name, t.color])
  );

  return (
    <WorldsPageClient
      storyId={currentStory.id}
      worlds={worlds}
      tagColorMap={tagColorMap}
      newWorldButton={
        <RoleGate allowedRoles={["editor", "admin"]}>
          <Link
            href="/archive/worlds/new"
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90"
          >
            New world
          </Link>
        </RoleGate>
      }
    />
  );
}
