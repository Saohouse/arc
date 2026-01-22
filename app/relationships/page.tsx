import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentStory } from "@/lib/story";
import { RelationshipGraph } from "@/components/arc/RelationshipGraph";
import { RoleGate } from "@/components/arc/RoleGate";

export default async function RelationshipsPage() {
  const currentStory = await getCurrentStory();
  const relationships = await prisma.relationship.findMany({
    where: { storyId: currentStory.id },
    orderBy: { createdAt: "desc" },
  });

  // Fetch all entities to resolve names
  const [characters, worlds, locations, objects] = await Promise.all([
    prisma.character.findMany({
      where: { storyId: currentStory.id },
      select: { id: true, name: true },
    }),
    prisma.world.findMany({
      where: { storyId: currentStory.id },
      select: { id: true, name: true },
    }),
    prisma.location.findMany({
      where: { storyId: currentStory.id },
      select: { id: true, name: true },
    }),
    prisma.object.findMany({
      where: { storyId: currentStory.id },
      select: { id: true, name: true },
    }),
  ]);

  // Create lookup maps
  const entityMap = new Map<string, string>();
  characters.forEach((c) => entityMap.set(`character-${c.id}`, c.name));
  worlds.forEach((w) => entityMap.set(`world-${w.id}`, w.name));
  locations.forEach((l) => entityMap.set(`location-${l.id}`, l.name));
  objects.forEach((o) => entityMap.set(`object-${o.id}`, o.name));

  const getEntityName = (type: string, id: string) => {
    return entityMap.get(`${type}-${id}`) || "Unknown";
  };

  const getEntityEmoji = (type: string) => {
    switch (type) {
      case "character":
        return "👤";
      case "world":
        return "🌍";
      case "location":
        return "📍";
      case "object":
        return "🔮";
      default:
        return "❓";
    }
  };

  // Prepare data for graph
  const graphData = relationships.map((rel) => ({
    id: rel.id,
    sourceType: rel.sourceType as "character" | "world" | "location" | "object",
    sourceId: rel.sourceId,
    sourceName: getEntityName(rel.sourceType, rel.sourceId),
    targetType: rel.targetType as "character" | "world" | "location" | "object",
    targetId: rel.targetId,
    targetName: getEntityName(rel.targetType, rel.targetId),
    type: rel.type,
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">🔗 Relationships</h1>
          <p className="text-sm text-muted-foreground">
            Map connections between entities in your world.
          </p>
        </div>
        <RoleGate allowedRoles={["editor", "admin"]}>
          <Link
            href="/relationships/new"
            className="rounded bg-foreground px-5 py-2.5 text-[13px] font-medium text-background hover:bg-foreground/90 transition-colors"
          >
            New relationship
          </Link>
        </RoleGate>
      </div>

      {/* Graph View */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Relationship Graph</h2>
        <RelationshipGraph relationships={graphData} />
      </section>

      {/* List View */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">All Relationships</h2>
        {relationships.length === 0 ? (
          <div className="rounded border border-dashed p-8 text-center text-sm text-muted-foreground">
            No relationships yet. Start connecting your characters, locations,
            worlds, and objects.
          </div>
        ) : (
          <div className="space-y-3">
            {relationships.map((rel) => (
              <Link
                key={rel.id}
                href={`/relationships/${rel.id}`}
                className="block rounded border p-5 transition-all hover:border-foreground/40 hover:shadow-sm"
              >
                <div className="flex items-center gap-3 text-base">
                  <span className="font-semibold">
                    {getEntityEmoji(rel.sourceType)}{" "}
                    {getEntityName(rel.sourceType, rel.sourceId)}
                  </span>
                  <span className="text-muted-foreground">→</span>
                  <span className="rounded bg-muted px-2 py-1 text-xs font-medium text-foreground">
                    {rel.type}
                  </span>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-semibold">
                    {getEntityEmoji(rel.targetType)}{" "}
                    {getEntityName(rel.targetType, rel.targetId)}
                  </span>
                </div>
                {rel.notes ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {rel.notes}
                  </p>
                ) : null}
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
