import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStory } from "@/lib/story";
import { parseTagsString } from "@/lib/tags";
import { RoleGate } from "@/components/arc/RoleGate";

export default async function TagsPage() {
  const currentStory = await requireStory();

  // Get all tags from the Tag table
  const customTags = await prisma.tag.findMany({
    where: { storyId: currentStory.id },
    orderBy: { usageCount: "desc" },
  });

  // Scan all entities to find tags in use
  const [characters, worlds, locations, objects] = await Promise.all([
    prisma.character.findMany({
      where: { storyId: currentStory.id },
      select: { tags: true },
    }),
    prisma.world.findMany({
      where: { storyId: currentStory.id },
      select: { tags: true },
    }),
    prisma.location.findMany({
      where: { storyId: currentStory.id },
      select: { tags: true },
    }),
    prisma.object.findMany({
      where: { storyId: currentStory.id },
      select: { tags: true },
    }),
  ]);

  // Count tag usage
  const tagUsage = new Map<string, number>();
  [...characters, ...worlds, ...locations, ...objects].forEach((entity) => {
    if (entity.tags) {
      parseTagsString(entity.tags).forEach((tag) => {
        tagUsage.set(tag, (tagUsage.get(tag) || 0) + 1);
      });
    }
  });

  // Create a combined list of tags
  const allTagNames = new Set([
    ...customTags.map((t) => t.name),
    ...Array.from(tagUsage.keys()),
  ]);

  const tagList = Array.from(allTagNames).map((name) => {
    const customTag = customTags.find((t) => t.name === name);
    return {
      name,
      color: customTag?.color,
      description: customTag?.description,
      usageCount: tagUsage.get(name) || 0,
      hasCustomColor: !!customTag?.color,
      id: customTag?.id,
    };
  });

  // Sort by usage count
  tagList.sort((a, b) => b.usageCount - a.usageCount);

  return (
    <div className="space-y-8">
      {/* Header Section - Mobile Optimized */}
      <div className="space-y-2 sm:space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">🏷️ Tags</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-2 tracking-tight">
              Manage tags across your {currentStory.name} story.
            </p>
          </div>
          <RoleGate allowedRoles={["editor", "admin"]}>
            <Link
              href="/tags/new"
              className="inline-flex items-center justify-center rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:bg-foreground/90 hover:scale-[1.02] hover:shadow-lg transition-all whitespace-nowrap touch-manipulation"
            >
              Create custom tag
            </Link>
          </RoleGate>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:gap-6 grid-cols-3">
        <div className="card-enhanced p-6 space-y-1">
          <div className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-br from-blue-600 to-blue-400 dark:from-blue-400 dark:to-blue-600 bg-clip-text text-transparent">{allTagNames.size}</div>
          <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium">Total Tags</div>
        </div>
        <div className="card-enhanced p-6 space-y-1">
          <div className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-br from-purple-600 to-purple-400 dark:from-purple-400 dark:to-purple-600 bg-clip-text text-transparent">
            {tagList.filter((t) => t.hasCustomColor).length}
          </div>
          <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium">Custom Colors</div>
        </div>
        <div className="card-enhanced p-6 space-y-1">
          <div className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-br from-gray-600 to-gray-400 dark:from-gray-400 dark:to-gray-600 bg-clip-text text-transparent">
            {tagList.filter((t) => t.usageCount === 0).length}
          </div>
          <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium">Unused</div>
        </div>
      </div>

      {/* Tags List - Mobile Responsive */}
      {tagList.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 sm:p-12 text-center text-sm text-muted-foreground">
          No tags yet. Start tagging your characters, worlds, locations, and
          objects!
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block rounded border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Tag
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Usage
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Color
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Description
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {tagList.map((tag) => (
                    <tr
                      key={tag.name}
                      className="transition-colors hover:bg-muted/30"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {tag.usageCount > 0 ? (
                            <Link
                              href={
                                tag.id
                                  ? `/tags/${tag.id}`
                                  : `/tags/${encodeURIComponent(tag.name)}`
                              }
                              className="font-medium hover:underline"
                            >
                              {tag.name}
                            </Link>
                          ) : (
                            <span className="font-medium">{tag.name}</span>
                          )}
                          {tag.hasCustomColor && (
                            <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">
                              CUSTOM
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-muted-foreground">
                          {tag.usageCount} {tag.usageCount === 1 ? "use" : "uses"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {tag.color ? (
                          <div className="flex items-center gap-2">
                            <div
                              className="h-6 w-6 rounded border"
                              style={{ backgroundColor: tag.color }}
                            ></div>
                            <span className="font-mono text-xs text-muted-foreground">
                              {tag.color}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Auto
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-muted-foreground">
                          {tag.description || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <RoleGate allowedRoles={["editor", "admin"]}>
                          <div className="flex justify-end gap-2">
                            {tag.id ? (
                              <Link
                                href={`/tags/${tag.id}/edit`}
                                className="text-xs text-foreground hover:underline"
                              >
                                Edit
                              </Link>
                            ) : (
                              <Link
                                href={`/tags/new?name=${encodeURIComponent(tag.name)}`}
                                className="text-xs text-foreground hover:underline"
                              >
                                Customize
                              </Link>
                            )}
                          </div>
                        </RoleGate>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {tagList.map((tag) => (
              <div
                key={tag.name}
                className="rounded-lg border p-4 space-y-3 hover:border-foreground/30 transition-colors"
              >
                {/* Tag Name and Badge */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {tag.usageCount > 0 ? (
                      <Link
                        href={
                          tag.id
                            ? `/tags/${tag.id}`
                            : `/tags/${encodeURIComponent(tag.name)}`
                        }
                        className="font-semibold text-base hover:underline truncate"
                      >
                        {tag.name}
                      </Link>
                    ) : (
                      <span className="font-semibold text-base truncate">{tag.name}</span>
                    )}
                    {tag.hasCustomColor && (
                      <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 flex-shrink-0">
                        CUSTOM
                      </span>
                    )}
                  </div>
                  <RoleGate allowedRoles={["editor", "admin"]}>
                    {tag.id ? (
                      <Link
                        href={`/tags/${tag.id}/edit`}
                        className="text-xs text-foreground hover:underline flex-shrink-0"
                      >
                        Edit
                      </Link>
                    ) : (
                      <Link
                        href={`/tags/new?name=${encodeURIComponent(tag.name)}`}
                        className="text-xs text-foreground hover:underline flex-shrink-0"
                      >
                        Customize
                      </Link>
                    )}
                  </RoleGate>
                </div>

                {/* Tag Details */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                      Usage
                    </div>
                    <div className="font-medium">
                      {tag.usageCount} {tag.usageCount === 1 ? "use" : "uses"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                      Color
                    </div>
                    {tag.color ? (
                      <div className="flex items-center gap-2">
                        <div
                          className="h-5 w-5 rounded border flex-shrink-0"
                          style={{ backgroundColor: tag.color }}
                        ></div>
                        <span className="font-mono text-xs text-muted-foreground truncate">
                          {tag.color}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Auto</span>
                    )}
                  </div>
                </div>

                {/* Description */}
                {tag.description && (
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                      Description
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {tag.description}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
