import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStory } from "@/lib/story";

type Issue = {
  id: string;
  severity: "error" | "warning" | "info";
  category: string;
  message: string;
  entityType?: string;
  entityId?: string;
  entityName?: string;
};

export default async function ContinuityPage() {
  const currentStory = await requireStory();

  // Fetch all entities
  const [characters, worlds, locations, objects, relationships] =
    await Promise.all([
      prisma.character.findMany({
        where: { storyId: currentStory.id },
      }),
      prisma.world.findMany({
        where: { storyId: currentStory.id },
      }),
      prisma.location.findMany({
        where: { storyId: currentStory.id },
      }),
      prisma.object.findMany({
        where: { storyId: currentStory.id },
      }),
      prisma.relationship.findMany({
        where: { storyId: currentStory.id },
      }),
    ]);

  const issues: Issue[] = [];

  // Create entity lookup maps
  const entityExists = new Map<string, boolean>();
  characters.forEach((c) => entityExists.set(`character-${c.id}`, true));
  worlds.forEach((w) => entityExists.set(`world-${w.id}`, true));
  locations.forEach((l) => entityExists.set(`location-${l.id}`, true));
  objects.forEach((o) => entityExists.set(`object-${o.id}`, true));

  // Check 1: Broken relationship references
  relationships.forEach((rel) => {
    const sourceKey = `${rel.sourceType}-${rel.sourceId}`;
    const targetKey = `${rel.targetType}-${rel.targetId}`;

    if (!entityExists.get(sourceKey)) {
      issues.push({
        id: `broken-rel-source-${rel.id}`,
        severity: "error",
        category: "Broken Reference",
        message: `Relationship "${rel.type}" references non-existent source ${rel.sourceType}`,
        entityType: "relationship",
        entityId: rel.id,
        entityName: rel.type,
      });
    }

    if (!entityExists.get(targetKey)) {
      issues.push({
        id: `broken-rel-target-${rel.id}`,
        severity: "error",
        category: "Broken Reference",
        message: `Relationship "${rel.type}" references non-existent target ${rel.targetType}`,
        entityType: "relationship",
        entityId: rel.id,
        entityName: rel.type,
      });
    }
  });

  // Check 2: Duplicate names
  const checkDuplicates = (
    entities: { id: string; name: string }[],
    type: string
  ) => {
    const nameCount = new Map<string, number>();
    entities.forEach((e) => {
      const count = nameCount.get(e.name.toLowerCase()) || 0;
      nameCount.set(e.name.toLowerCase(), count + 1);
    });

    entities.forEach((e) => {
      if (nameCount.get(e.name.toLowerCase())! > 1) {
        issues.push({
          id: `duplicate-${type}-${e.id}`,
          severity: "error",
          category: "Duplicate Name",
          message: `Multiple ${type}s named "${e.name}"`,
          entityType: type,
          entityId: e.id,
          entityName: e.name,
        });
      }
    });
  };

  checkDuplicates(characters, "character");
  checkDuplicates(worlds, "world");
  checkDuplicates(locations, "location");
  checkDuplicates(objects, "object");

  // Check 3: Missing images
  characters.forEach((c) => {
    if (!c.imageUrl) {
      issues.push({
        id: `no-image-character-${c.id}`,
        severity: "warning",
        category: "Missing Image",
        message: `Character "${c.name}" has no image`,
        entityType: "character",
        entityId: c.id,
        entityName: c.name,
      });
    }
  });

  worlds.forEach((w) => {
    if (!w.imageUrl) {
      issues.push({
        id: `no-image-world-${w.id}`,
        severity: "warning",
        category: "Missing Image",
        message: `World "${w.name}" has no image`,
        entityType: "world",
        entityId: w.id,
        entityName: w.name,
      });
    }
  });

  locations.forEach((l) => {
    if (!l.imageUrl) {
      issues.push({
        id: `no-image-location-${l.id}`,
        severity: "warning",
        category: "Missing Image",
        message: `Location "${l.name}" has no image`,
        entityType: "location",
        entityId: l.id,
        entityName: l.name,
      });
    }
  });

  objects.forEach((o) => {
    if (!o.imageUrl) {
      issues.push({
        id: `no-image-object-${o.id}`,
        severity: "warning",
        category: "Missing Image",
        message: `Object "${o.name}" has no image`,
        entityType: "object",
        entityId: o.id,
        entityName: o.name,
      });
    }
  });

  // Check 4: Missing descriptions
  characters.forEach((c) => {
    if (!c.bio) {
      issues.push({
        id: `no-bio-${c.id}`,
        severity: "warning",
        category: "Missing Description",
        message: `Character "${c.name}" has no bio`,
        entityType: "character",
        entityId: c.id,
        entityName: c.name,
      });
    }
  });

  worlds.forEach((w) => {
    if (!w.overview) {
      issues.push({
        id: `no-overview-${w.id}`,
        severity: "warning",
        category: "Missing Description",
        message: `World "${w.name}" has no overview`,
        entityType: "world",
        entityId: w.id,
        entityName: w.name,
      });
    }
  });

  locations.forEach((l) => {
    if (!l.overview) {
      issues.push({
        id: `no-overview-${l.id}`,
        severity: "warning",
        category: "Missing Description",
        message: `Location "${l.name}" has no overview`,
        entityType: "location",
        entityId: l.id,
        entityName: l.name,
      });
    }
  });

  objects.forEach((o) => {
    if (!o.description) {
      issues.push({
        id: `no-description-${o.id}`,
        severity: "warning",
        category: "Missing Description",
        message: `Object "${o.name}" has no description`,
        entityType: "object",
        entityId: o.id,
        entityName: o.name,
      });
    }
  });

  // Check 5: Characters without home location
  characters.forEach((c) => {
    if (!c.homeLocationId) {
      issues.push({
        id: `no-home-${c.id}`,
        severity: "warning",
        category: "Missing Home Location",
        message: `Character "${c.name}" has no home location`,
        entityType: "character",
        entityId: c.id,
        entityName: c.name,
      });
    }
  });

  // Check 6: Orphaned entities (no relationships)
  const connectedEntities = new Set<string>();
  relationships.forEach((rel) => {
    connectedEntities.add(`${rel.sourceType}-${rel.sourceId}`);
    connectedEntities.add(`${rel.targetType}-${rel.targetId}`);
  });

  characters.forEach((c) => {
    if (!connectedEntities.has(`character-${c.id}`)) {
      issues.push({
        id: `orphan-character-${c.id}`,
        severity: "info",
        category: "Isolated Entity",
        message: `Character "${c.name}" has no relationships`,
        entityType: "character",
        entityId: c.id,
        entityName: c.name,
      });
    }
  });

  worlds.forEach((w) => {
    if (!connectedEntities.has(`world-${w.id}`)) {
      issues.push({
        id: `orphan-world-${w.id}`,
        severity: "info",
        category: "Isolated Entity",
        message: `World "${w.name}" has no relationships`,
        entityType: "world",
        entityId: w.id,
        entityName: w.name,
      });
    }
  });

  locations.forEach((l) => {
    if (!connectedEntities.has(`location-${l.id}`)) {
      issues.push({
        id: `orphan-location-${l.id}`,
        severity: "info",
        category: "Isolated Entity",
        message: `Location "${l.name}" has no relationships`,
        entityType: "location",
        entityId: l.id,
        entityName: l.name,
      });
    }
  });

  objects.forEach((o) => {
    if (!connectedEntities.has(`object-${o.id}`)) {
      issues.push({
        id: `orphan-object-${o.id}`,
        severity: "info",
        category: "Isolated Entity",
        message: `Object "${o.name}" has no relationships`,
        entityType: "object",
        entityId: o.id,
        entityName: o.name,
      });
    }
  });

  // Check 7: Empty tags
  [...characters, ...worlds, ...locations, ...objects].forEach((entity) => {
    const type = characters.some((c) => c.id === entity.id)
      ? "character"
      : worlds.some((w) => w.id === entity.id)
        ? "world"
        : locations.some((l) => l.id === entity.id)
          ? "location"
          : "object";

    if (!entity.tags || entity.tags.trim() === "") {
      issues.push({
        id: `no-tags-${type}-${entity.id}`,
        severity: "info",
        category: "Missing Tags",
        message: `${type.charAt(0).toUpperCase() + type.slice(1)} "${entity.name}" has no tags`,
        entityType: type,
        entityId: entity.id,
        entityName: entity.name,
      });
    }
  });

  // Check 8: Contradictory relationships
  const relationshipPairs = new Map<string, string[]>();
  relationships.forEach((rel) => {
    const key = `${rel.sourceType}-${rel.sourceId}:${rel.targetType}-${rel.targetId}`;
    const reverseKey = `${rel.targetType}-${rel.targetId}:${rel.sourceType}-${rel.sourceId}`;
    
    if (!relationshipPairs.has(key)) {
      relationshipPairs.set(key, []);
    }
    relationshipPairs.get(key)!.push(rel.type);
    
    // Check reverse relationships too
    if (!relationshipPairs.has(reverseKey)) {
      relationshipPairs.set(reverseKey, []);
    }
  });

  // Look for contradictory relationship types
  const contradictoryPairs: Array<[string, string]> = [
    ["allies", "enemies"],
    ["ally", "enemy"],
    ["friend", "enemy"],
    ["mentor", "rival"],
    ["family", "enemy"],
  ];

  relationshipPairs.forEach((types, key) => {
    for (const [type1, type2] of contradictoryPairs) {
      if (types.includes(type1) && types.includes(type2)) {
        const [source, target] = key.split(":");
        const [sourceType, sourceId] = source.split("-");
        const [targetType, targetId] = target.split("-");
        
        const getEntityName = (type: string, id: string) => {
          const allEntities = [...characters, ...worlds, ...locations, ...objects];
          const entity = allEntities.find((e) => e.id === id);
          return entity?.name || "Unknown";
        };

        issues.push({
          id: `contradiction-${key}`,
          severity: "error",
          category: "Contradictory Relationships",
          message: `${getEntityName(sourceType, sourceId)} and ${getEntityName(targetType, targetId)} are marked as both "${type1}" AND "${type2}"`,
        });
      }
    }
  });

  // Check 9: Circular location logic (Character lives in multiple places)
  const characterHomes = new Map<string, string[]>();
  characters.forEach((c) => {
    if (c.homeLocationId) {
      if (!characterHomes.has(c.id)) {
        characterHomes.set(c.id, []);
      }
      characterHomes.get(c.id)!.push(c.homeLocationId);
    }
  });

  // Also check "lives_in" relationships
  relationships.forEach((rel) => {
    if (rel.sourceType === "character" && rel.type === "lives_in" && rel.targetType === "location") {
      if (!characterHomes.has(rel.sourceId)) {
        characterHomes.set(rel.sourceId, []);
      }
      characterHomes.get(rel.sourceId)!.push(rel.targetId);
    }
  });

  characterHomes.forEach((homes, characterId) => {
    const uniqueHomes = new Set(homes);
    if (uniqueHomes.size > 1) {
      const character = characters.find((c) => c.id === characterId);
      const homeNames = Array.from(uniqueHomes)
        .map((locId) => locations.find((l) => l.id === locId)?.name || "Unknown")
        .join(", ");
      
      issues.push({
        id: `multiple-homes-${characterId}`,
        severity: "warning",
        category: "Conflicting Character State",
        message: `Character "${character?.name}" has multiple home locations: ${homeNames}`,
        entityType: "character",
        entityId: characterId,
        entityName: character?.name,
      });
    }
  });

  // Categorize issues
  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  const infos = issues.filter((i) => i.severity === "info");

  // Calculate data completeness
  const totalEntities =
    characters.length + worlds.length + locations.length + objects.length;
  const entitiesWithImages = [
    ...characters,
    ...worlds,
    ...locations,
    ...objects,
  ].filter((e) => e.imageUrl).length;
  const entitiesWithDescriptions =
    characters.filter((c) => c.bio).length +
    worlds.filter((w) => w.overview).length +
    locations.filter((l) => l.overview).length +
    objects.filter((o) => o.description).length;
  const entitiesWithTags = [
    ...characters,
    ...worlds,
    ...locations,
    ...objects,
  ].filter((e) => e.tags && e.tags.trim() !== "").length;

  const imageCompleteness =
    totalEntities > 0 ? (entitiesWithImages / totalEntities) * 100 : 0;
  const descriptionCompleteness =
    totalEntities > 0 ? (entitiesWithDescriptions / totalEntities) * 100 : 0;
  const tagsCompleteness =
    totalEntities > 0 ? (entitiesWithTags / totalEntities) * 100 : 0;
  const overallHealth =
    totalEntities > 0
      ? ((imageCompleteness + descriptionCompleteness + tagsCompleteness) / 3)
      : 100;

  const getEntityLink = (type: string, id: string) => {
    if (type === "relationship") return `/relationships/${id}`;
    return `/archive/${type}s/${id}`;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "error":
        return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30";
      case "warning":
        return "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30";
      case "info":
        return "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30";
      default:
        return "text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-950/30";
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2 sm:space-y-3">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">⏱️ Continuity</h1>
        <p className="text-sm sm:text-base text-muted-foreground tracking-tight">
          Quality control and consistency checks for your world.
        </p>
      </div>

      {/* Health Score */}
      <section className="card-enhanced p-6 sm:p-8">
        <h2 className="text-xl sm:text-2xl font-semibold mb-6 tracking-tight">Data Health</h2>
        <div className="grid gap-4 sm:gap-6 grid-cols-2 md:grid-cols-4">
          <div className="space-y-1">
            <div className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-br from-blue-600 to-blue-400 dark:from-blue-400 dark:to-blue-600 bg-clip-text text-transparent">
              {overallHealth.toFixed(0)}%
            </div>
            <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium">Overall Health</div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-br from-purple-600 to-purple-400 dark:from-purple-400 dark:to-purple-600 bg-clip-text text-transparent">
              {imageCompleteness.toFixed(0)}%
            </div>
            <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium">With Images</div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-br from-emerald-600 to-emerald-400 dark:from-emerald-400 dark:to-emerald-600 bg-clip-text text-transparent">
              {descriptionCompleteness.toFixed(0)}%
            </div>
            <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium">
              With Descriptions
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-br from-amber-600 to-amber-400 dark:from-amber-400 dark:to-amber-600 bg-clip-text text-transparent">
              {tagsCompleteness.toFixed(0)}%
            </div>
            <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium">With Tags</div>
          </div>
        </div>
      </section>

      {/* Issues Summary */}
      <section className="grid gap-4 sm:gap-6 grid-cols-3">
        <div className="card-enhanced p-6 space-y-1">
          <div className="text-3xl sm:text-4xl font-bold text-red-600 dark:text-red-400 tracking-tight">{errors.length}</div>
          <div className="text-[10px] sm:text-sm text-muted-foreground uppercase tracking-wider font-medium">Errors</div>
        </div>
        <div className="card-enhanced p-6 space-y-1">
          <div className="text-3xl sm:text-4xl font-bold text-amber-600 dark:text-amber-400 tracking-tight">
            {warnings.length}
          </div>
          <div className="text-[10px] sm:text-sm text-muted-foreground uppercase tracking-wider font-medium">Warnings</div>
        </div>
        <div className="card-enhanced p-6 space-y-1">
          <div className="text-3xl sm:text-4xl font-bold text-blue-600 dark:text-blue-400 tracking-tight">
            {infos.length}
          </div>
          <div className="text-[10px] sm:text-sm text-muted-foreground uppercase tracking-wider font-medium">Info</div>
        </div>
      </section>

      {/* Issues List */}
      {issues.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 sm:p-12 text-center text-sm text-muted-foreground">
          ✅ No issues detected! Your world is in perfect continuity.
        </div>
      ) : (
        <div className="space-y-6">
          {errors.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-red-600">
                🚨 Errors ({errors.length})
              </h2>
              <div className="space-y-2">
                {errors.map((issue) => (
                  <div
                    key={issue.id}
                    className="rounded border border-red-200 dark:border-red-900 p-4 bg-red-50/50 dark:bg-red-950/20"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div
                          className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${getSeverityColor(issue.severity)}`}
                        >
                          {issue.category}
                        </div>
                        <p className="mt-2 text-sm">{issue.message}</p>
                      </div>
                      {issue.entityId && (
                        <Link
                          href={getEntityLink(
                            issue.entityType!,
                            issue.entityId
                          )}
                          className="shrink-0 text-xs text-red-600 hover:underline"
                        >
                          View →
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {warnings.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-amber-600">
                ⚠️ Warnings ({warnings.length})
              </h2>
              <div className="space-y-2">
                {warnings.map((issue) => (
                  <div
                    key={issue.id}
                    className="rounded border border-amber-200 dark:border-amber-900 p-4 bg-amber-50/50 dark:bg-amber-950/20"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div
                          className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${getSeverityColor(issue.severity)}`}
                        >
                          {issue.category}
                        </div>
                        <p className="mt-2 text-sm">{issue.message}</p>
                      </div>
                      {issue.entityId && (
                        <Link
                          href={getEntityLink(
                            issue.entityType!,
                            issue.entityId
                          )}
                          className="shrink-0 text-xs text-amber-600 hover:underline"
                        >
                          Fix →
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {infos.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-blue-600">
                ℹ️ Info ({infos.length})
              </h2>
              <div className="space-y-2">
                {infos.map((issue) => (
                  <div
                    key={issue.id}
                    className="rounded border border-blue-200 dark:border-blue-900 p-4 bg-blue-50/50 dark:bg-blue-950/20"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div
                          className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${getSeverityColor(issue.severity)}`}
                        >
                          {issue.category}
                        </div>
                        <p className="mt-2 text-sm">{issue.message}</p>
                      </div>
                      {issue.entityId && (
                        <Link
                          href={getEntityLink(
                            issue.entityType!,
                            issue.entityId
                          )}
                          className="shrink-0 text-xs text-blue-600 hover:underline"
                        >
                          View →
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
