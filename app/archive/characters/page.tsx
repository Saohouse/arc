import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStory } from "@/lib/story";
import { RoleGate } from "@/components/arc/RoleGate";
import { CharactersPageClient } from "./CharactersPageClient";

export default async function CharactersPage() {
  const currentStory = await requireStory();
  const [characters, customTags] = await Promise.all([
    prisma.character.findMany({
      where: { storyId: currentStory.id },
      orderBy: { order: "asc" },
      select: {
        id: true,
        name: true,
        title: true,
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
    <CharactersPageClient
      storyId={currentStory.id}
      characters={characters}
      tagColorMap={tagColorMap}
      newCharacterButton={
        <RoleGate allowedRoles={["editor", "admin"]}>
          <Link
            href="/archive/characters/new"
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90"
          >
            New character
          </Link>
        </RoleGate>
      }
    />
  );
}
