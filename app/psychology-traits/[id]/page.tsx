import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStory } from "@/lib/story";
import { getTraitById } from "@/lib/psychology-traits";

type PsychologyTraitPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PsychologyTraitPage({ params }: PsychologyTraitPageProps) {
  const { id: traitId } = await params;
  const currentStory = await requireStory();

  // Get trait info
  const trait = getTraitById(traitId);
  
  if (!trait) {
    notFound();
  }

  // Find all characters with this trait
  const allCharacters = await prisma.character.findMany({
    where: {
      storyId: currentStory.id,
    },
    select: {
      id: true,
      name: true,
      title: true,
      imageUrl: true,
      psychologyTraits: true,
      updatedAt: true,
    },
    orderBy: { name: "asc" },
  });

  // Filter characters that have this trait
  const charactersWithTrait = allCharacters.filter((char) => {
    const traits = char.psychologyTraits.split(",").filter(Boolean);
    return traits.includes(traitId);
  });

  const categoryColors = {
    personality: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    attachment: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
    values: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    behavioral: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    cognitive: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/archive/characters"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to characters
        </Link>
        <div className="mt-3">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium ${categoryColors[trait.category]}`}
          >
            {trait.name}
          </span>
        </div>
        <h1 className="text-3xl font-semibold mt-3">Characters with this trait</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {trait.description}
        </p>
      </div>

      {charactersWithTrait.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No characters have this trait yet.
        </div>
      ) : (
        <div className="grid gap-3">
          {charactersWithTrait.map((character) => (
            <Link
              key={character.id}
              href={`/archive/characters/${character.id}`}
              className="block rounded-lg border p-4 transition hover:border-foreground/30 hover:bg-muted/50"
            >
              <div className="flex items-start gap-4">
                {character.imageUrl ? (
                  <Image
                    src={character.imageUrl}
                    alt={character.name}
                    width={80}
                    height={80}
                    className="h-20 w-20 rounded-lg object-cover flex-shrink-0"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-lg border border-dashed flex items-center justify-center text-2xl flex-shrink-0">
                    👤
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold text-base">
                        {character.name}
                      </div>
                      {character.title ? (
                        <div className="text-sm text-muted-foreground">
                          {character.title}
                        </div>
                      ) : null}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Updated {character.updatedAt.toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="text-sm text-muted-foreground">
        {charactersWithTrait.length} {charactersWithTrait.length === 1 ? "character" : "characters"} with this trait
      </div>
    </div>
  );
}
