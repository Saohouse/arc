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
  
  // Get emoji and gradient based on character type
  const getCharacterEmoji = (wizardData: any): string => {
    if (!wizardData) return "⭐";
    
    const data = wizardData as Record<string, string>;
    const characterType = data["character_type_type"] || "other";
    
    const typeEmojis: Record<string, string> = {
      protagonist: "🦸",
      antagonist: "😈",
      mentor: "🧙",
      support: "🤝",
      love_interest: "💖",
      other: "⭐"
    };
    
    return typeEmojis[characterType] || "⭐";
  };
  
  const getCharacterGradient = (wizardData: any): string => {
    if (!wizardData) return "from-purple-50 via-pink-50 to-indigo-50 dark:from-purple-950/30 dark:via-pink-950/30 dark:to-indigo-950/30";
    
    const data = wizardData as Record<string, string>;
    const characterType = data["character_type_type"] || "other";
    
    const typeGradients: Record<string, string> = {
      protagonist: "from-blue-50 via-cyan-50 to-sky-100 dark:from-blue-950/30 dark:via-cyan-950/30 dark:to-sky-950/40",
      antagonist: "from-red-50 via-orange-50 to-rose-100 dark:from-red-950/30 dark:via-orange-950/30 dark:to-rose-950/40",
      mentor: "from-purple-50 via-indigo-50 to-violet-100 dark:from-purple-950/30 dark:via-indigo-950/30 dark:to-violet-950/40",
      support: "from-green-50 via-emerald-50 to-teal-100 dark:from-green-950/30 dark:via-emerald-950/30 dark:to-teal-950/40",
      love_interest: "from-pink-50 via-rose-50 to-fuchsia-100 dark:from-pink-950/30 dark:via-rose-950/30 dark:to-fuchsia-950/40",
      other: "from-amber-50 via-yellow-50 to-orange-100 dark:from-amber-950/30 dark:via-yellow-950/30 dark:to-orange-950/40"
    };
    
    return typeGradients[characterType] || typeGradients.other;
  };
  
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
      {/* Header Section - Mobile Optimized */}
      <div className="space-y-4">
        {/* Back Button */}
        <Link
          href="/archive/characters"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to Characters
        </Link>

        {/* Breadcrumb - Hidden on mobile */}
        <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/archive" className="hover:text-foreground transition-colors">
            Archive
          </Link>
          <span>/</span>
          <Link href="/archive/characters" className="hover:text-foreground transition-colors">
            Characters
          </Link>
          <span>/</span>
          <span className="text-foreground">{character.name}</span>
        </div>
        
        {/* Title and Actions */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-semibold break-words">{character.name}</h1>
            {character.title ? (
              <p className="text-sm text-muted-foreground mt-1">{character.title}</p>
            ) : null}
          </div>
          
          {/* Action Buttons - Mobile Optimized */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 sm:flex-shrink-0">
            <RoleGate allowedRoles={["editor", "admin"]}>
              <Link
                href={`/archive/characters/${character.id}/edit`}
                className="inline-flex items-center justify-center rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:bg-foreground/90 hover:scale-[1.02] hover:shadow-lg transition-all whitespace-nowrap touch-manipulation"
              >
                Edit
              </Link>
              <DeleteButton
                id={character.id}
                name={character.name}
                action={deleteCharacter}
              />
            </RoleGate>
          </div>
        </div>
      </div>

      {/* Main Content - Mobile Optimized Grid */}
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Portrait Section */}
        <div className="space-y-3">
          {character.imageUrl ? (
            <div className="overflow-hidden rounded-lg border relative w-full aspect-square max-w-md mx-auto">
              <Image
                src={character.imageUrl}
                alt={character.name}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) min(100vw, 448px), 280px"
                priority
              />
            </div>
          ) : (
            <div className={`relative w-full aspect-square max-w-md mx-auto rounded-lg border-2 border-dashed border-purple-300 dark:border-purple-700 bg-gradient-to-br ${getCharacterGradient(character.wizardData)} flex items-center justify-center overflow-hidden`}>
              <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/5 dark:to-white/5" />
              <span className="text-[120px] sm:text-[150px] lg:text-[180px] leading-none relative z-10 drop-shadow-lg">{getCharacterEmoji(character.wizardData)}</span>
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
            <WizardDataDisplay 
              wizardData={character.wizardData as Record<string, string>}
              characterName={character.name}
            />
          )}
          
          {/* Prompt to add wizard data if not present */}
          {!character.wizardData && (
            <section className="rounded-lg border p-6 bg-gradient-to-br from-purple-50/50 to-pink-50/50 dark:from-purple-950/10 dark:to-pink-950/10">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <span className="text-2xl">✨</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2">Deepen Your Character Development</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Use the Frank Daniel Method to systematically explore {character.name}'s motivations, 
                    conflicts, and arc. Answer questions about their desires, obstacles, relationships, 
                    and transformation to create a fully-realized character.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <RoleGate allowedRoles={["editor", "admin"]}>
                      <Link
                        href={`/archive/characters/${character.id}/wizard`}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-purple-600 text-white hover:bg-purple-700 transition-colors text-sm font-medium"
                      >
                        Complete Character Wizard
                      </Link>
                    </RoleGate>
                    <Link
                      href="/archive/characters/new/wizard/test"
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/20 hover:border-purple-400 dark:hover:border-purple-600 hover:scale-[1.02] hover:shadow-md transition-all text-sm touch-manipulation whitespace-nowrap"
                    >
                      Learn About the Method
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
