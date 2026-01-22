import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentStory } from "@/lib/story";
import { RoleGate } from "@/components/arc/RoleGate";
import { CharactersPageClient } from "./CharactersPageClient";

export default async function CharactersPage() {
  const currentStory = await getCurrentStory();
  const [characters, customTags] = await Promise.all([
    prisma.character.findMany({
      where: { storyId: currentStory.id },
      orderBy: { name: "asc" },
    }),
    prisma.tag.findMany({
      where: { storyId: currentStory.id },
      select: { name: true, color: true },
    }),
  ]);

  const tagColorMap = new Map(
    customTags.map((t) => [t.name, t.color])
  );

  return (
    <CharactersPageClient
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
