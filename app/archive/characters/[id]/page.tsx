import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DeleteButton } from "@/components/arc/DeleteButton";
import { Tag } from "@/components/arc/Tag";
import { parseTagsString } from "@/lib/tags";
import { RoleGate } from "@/components/arc/RoleGate";
import { requireRole } from "@/lib/auth";
import { getTraitById, TRAIT_CATEGORIES } from "@/lib/psychology-traits";
import { CharacterCompatibilityList } from "@/components/arc/CharacterCompatibilityList";
import { WizardDataDisplay } from "@/components/arc/WizardDataDisplay";

async function deleteCharacter(formData: FormData) {
  "use server";
  await requireRole("editor");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.character.delete({ where: { id } });
  redirect("/archive/characters");
}

type CharacterPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CharacterPage({ params }: CharacterPageProps) {
  const { id } = await params;
  
  // Fetch character and parse tags first to get tag names
  const [character, allCharacters] = await Promise.all([
    prisma.character.findUnique({
      where: { id },
      include: { homeLocation: true },
    }),
    prisma.character.findMany({
      where: { id: { not: id } },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        psychologyTraits: true,
        storyId: true,
      },
    }),
  ]);

  if (!character) {
    notFound();
  }

  // Filter to only characters in the same story
  const storyCharacters = allCharacters.filter((c) => c.storyId === character.storyId);

  const tags = character.tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  // Fetch custom tag colors in parallel (if there are tags)
  const customTags = tags.length > 0 
    ? await prisma.tag.findMany({
        where: {
          storyId: character.storyId,
          name: { in: tags },
        },
        select: { id: true, name: true, color: true },
      })
    : [];

  const tagDataMap = new Map<string, { id: string; color: string | null }>(
    customTags.map((t) => [t.name, { id: t.id, color: t.color }])
  );

  // Parse psychology traits
  const psychologyTraitIds = character.psychologyTraits
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const psychologyTraits = psychologyTraitIds
    .map((id) => getTraitById(id))
    .filter((trait): trait is NonNullable<typeof trait> => trait !== undefined);

  // Group traits by category
  const traitsByCategory = psychologyTraits.reduce((acc, trait) => {
    if (!trait) return acc;
    if (!acc[trait.category]) {
      acc[trait.category] = [];
    }
    acc[trait.category].push(trait);
    return acc;
  }, {} as Record<string, typeof psychologyTraits>);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm text-muted-foreground">
            Archive / Characters
          </div>
          <h1 className="text-3xl font-semibold">{character.name}</h1>
          {character.title ? (
            <p className="text-sm text-muted-foreground">{character.title}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <RoleGate allowedRoles={["editor", "admin"]}>
            <Link
              href={`/archive/characters/${character.id}/edit`}
              className="rounded-lg bg-foreground px-5 py-2.5 text-[13px] font-medium text-background hover:bg-foreground/90 transition-all"
            >
              Edit
            </Link>
            <DeleteButton
              id={character.id}
              name={character.name}
              action={deleteCharacter}
            />
          </RoleGate>
          <Link
            href="/archive/characters"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Back to list
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <div className="space-y-3">
          {character.imageUrl ? (
            <div className="overflow-hidden rounded-lg border relative h-60 w-full">
              <Image
                src={character.imageUrl}
                alt={character.name}
                fill
                className="object-cover"
                sizes="240px"
                priority
              />
            </div>
          ) : (
            <div className="flex h-60 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
              No portrait yet
            </div>
          )}

          <div className="rounded-lg border p-4 text-xs text-muted-foreground">
            <div>Created {character.createdAt.toLocaleDateString()}</div>
            <div>Updated {character.updatedAt.toLocaleDateString()}</div>
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-lg border p-4">
            <div className="text-sm font-semibold">Bio</div>
            <p className="mt-2 text-sm text-muted-foreground">
              {character.bio || "No bio yet."}
            </p>
          </section>

          <section className="rounded-lg border p-4">
            <div className="text-sm font-semibold">Home location</div>
            {character.homeLocation ? (
              <Link
                href={`/archive/locations/${character.homeLocation.id}`}
                className="mt-2 block text-sm text-muted-foreground hover:text-foreground"
              >
                {character.homeLocation.name}
              </Link>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                No home location set.
              </p>
            )}
          </section>

          <section className="rounded-lg border p-4">
            <div className="text-sm font-semibold">
              Tags
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                (hover to customize)
              </span>
            </div>
            {tags.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {tags.map((tag) => {
                  const tagData = tagDataMap.get(tag);
                  const viewHref = tagData
                    ? `/tags/${tagData.id}`
                    : `/tags/${encodeURIComponent(tag)}`;
                  const editHref = tagData
                    ? `/tags/${tagData.id}/edit`
                    : `/tags/new?name=${encodeURIComponent(tag)}`;
                  return (
                    <Tag
                      key={tag}
                      name={tag}
                      size="md"
                      customColor={tagData?.color}
                      href={viewHref}
                      editHref={editHref}
                      tagId={tagData?.id}
                    />
                  );
                })}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                No tags assigned.
              </p>
            )}
          </section>

          <section className="rounded-lg border p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold">Psychology Traits</div>
              <RoleGate allowedRoles={["editor", "admin"]}>
                <Link
                  href={`/archive/characters/${character.id}/edit`}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Edit Traits
                </Link>
              </RoleGate>
            </div>
            {psychologyTraits.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {psychologyTraits.map((trait) => {
                  const categoryColors = {
                    personality: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50",
                    attachment: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300 hover:bg-pink-200 dark:hover:bg-pink-900/50",
                    values: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900/50",
                    behavioral: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50",
                    cognitive: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/50",
                  };
                  
                  return (
                    <Link
                      key={trait.id}
                      href={`/psychology-traits/${trait.id}`}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${categoryColors[trait.category]}`}
                      title={`${TRAIT_CATEGORIES[trait.category as keyof typeof TRAIT_CATEGORIES]}: ${trait.description}`}
                    >
                      {trait.name}
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No psychology traits assigned. Add traits to analyze compatibility with other characters.
              </p>
            )}
          </section>

          {psychologyTraits.length > 0 && (
            <section className="rounded-lg border p-4">
              <div className="text-sm font-semibold mb-4">Compatibility with Other Characters</div>
              <CharacterCompatibilityList
                character={{
                  id: character.id,
                  name: character.name,
                  imageUrl: character.imageUrl,
                  psychologyTraits: character.psychologyTraits,
                }}
                allCharacters={storyCharacters}
              />
            </section>
          )}

          {/* Frank Daniel Character Development */}
          {character.wizardData && (
            <WizardDataDisplay wizardData={character.wizardData as Record<string, string>} />
          )}
        </div>
      </div>
    </div>
  );
}
