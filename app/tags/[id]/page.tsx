import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentStory } from "@/lib/story";
import { parseTagsString } from "@/lib/tags";
import { Tag } from "@/components/arc/Tag";
import { RoleGate } from "@/components/arc/RoleGate";

type TagViewPageProps = {
  params: Promise<{ id: string }>;
};

export default async function TagViewPage({ params }: TagViewPageProps) {
  const { id } = await params;
  
  // Try to find custom tag, otherwise use the id as the tag name
  const customTag = await prisma.tag.findUnique({
    where: { id },
  });

  const tagName = customTag?.name || decodeURIComponent(id);
  const currentStory = await getCurrentStory();

  // Fetch all entities with this tag
  const [characters, worlds, locations, objects] = await Promise.all([
    prisma.character.findMany({
      where: { 
        storyId: currentStory.id,
        tags: { contains: tagName },
      },
      orderBy: { name: "asc" },
    }),
    prisma.world.findMany({
      where: { 
        storyId: currentStory.id,
        tags: { contains: tagName },
      },
      orderBy: { name: "asc" },
    }),
    prisma.location.findMany({
      where: { 
        storyId: currentStory.id,
        tags: { contains: tagName },
      },
      orderBy: { name: "asc" },
    }),
    prisma.object.findMany({
      where: { 
        storyId: currentStory.id,
        tags: { contains: tagName },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  // Filter to exact matches (since contains is fuzzy)
  const charactersFiltered = characters.filter((c) =>
    parseTagsString(c.tags).includes(tagName)
  );
  const worldsFiltered = worlds.filter((w) =>
    parseTagsString(w.tags).includes(tagName)
  );
  const locationsFiltered = locations.filter((l) =>
    parseTagsString(l.tags).includes(tagName)
  );
  const objectsFiltered = objects.filter((o) =>
    parseTagsString(o.tags).includes(tagName)
  );

  const totalCount =
    charactersFiltered.length +
    worldsFiltered.length +
    locationsFiltered.length +
    objectsFiltered.length;

  if (totalCount === 0) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm text-muted-foreground">Tags</div>
          <h1 className="text-3xl font-semibold">
            <Tag name={tagName} customColor={customTag?.color} size="md" />
          </h1>
          <p className="text-sm text-muted-foreground">
            {totalCount} {totalCount === 1 ? "item" : "items"} tagged with{" "}
            <span className="font-semibold">{tagName}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <RoleGate allowedRoles={["editor", "admin"]}>
            {customTag && (
              <Link
                href={`/tags/${customTag.id}/edit`}
                className="rounded-md border px-4 py-2 text-sm font-medium transition-all hover:bg-muted"
              >
                Customize tag
              </Link>
            )}
          </RoleGate>
          <Link
            href="/tags"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            All tags
          </Link>
        </div>
      </div>

      <div className="space-y-6">
        {charactersFiltered.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-semibold">
              👤 Characters ({charactersFiltered.length})
            </h2>
            <div className="grid gap-3">
              {charactersFiltered.map((character) => (
                <Link
                  key={character.id}
                  href={`/archive/characters/${character.id}`}
                  className="rounded-lg border p-4 transition hover:border-foreground/30 hover:bg-muted/50"
                >
                  <div className="flex items-center gap-4">
                    {character.imageUrl && (
                      <img
                        src={character.imageUrl}
                        alt={character.name}
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                    )}
                    <div>
                      <div className="font-semibold">{character.name}</div>
                      {character.title && (
                        <div className="text-sm text-muted-foreground">
                          {character.title}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {worldsFiltered.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-semibold">
              🌍 Worlds ({worldsFiltered.length})
            </h2>
            <div className="grid gap-3">
              {worldsFiltered.map((world) => (
                <Link
                  key={world.id}
                  href={`/archive/worlds/${world.id}`}
                  className="rounded-lg border p-4 transition hover:border-foreground/30 hover:bg-muted/50"
                >
                  <div className="font-semibold">{world.name}</div>
                  {world.summary && (
                    <div className="text-sm text-muted-foreground">
                      {world.summary}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {locationsFiltered.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-semibold">
              📍 Locations ({locationsFiltered.length})
            </h2>
            <div className="grid gap-3">
              {locationsFiltered.map((location) => (
                <Link
                  key={location.id}
                  href={`/archive/locations/${location.id}`}
                  className="rounded-lg border p-4 transition hover:border-foreground/30 hover:bg-muted/50"
                >
                  <div className="font-semibold">{location.name}</div>
                  {location.summary && (
                    <div className="text-sm text-muted-foreground">
                      {location.summary}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {objectsFiltered.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-semibold">
              🔮 Objects ({objectsFiltered.length})
            </h2>
            <div className="grid gap-3">
              {objectsFiltered.map((object) => (
                <Link
                  key={object.id}
                  href={`/archive/objects/${object.id}`}
                  className="rounded-lg border p-4 transition hover:border-foreground/30 hover:bg-muted/50"
                >
                  <div className="font-semibold">{object.name}</div>
                  {object.category && (
                    <div className="text-sm text-muted-foreground">
                      {object.category}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
