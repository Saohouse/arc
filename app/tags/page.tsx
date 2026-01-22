import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentStory } from "@/lib/story";
import { parseTagsString } from "@/lib/tags";
import { RoleGate } from "@/components/arc/RoleGate";

export default async function TagsPage() {
  const currentStory = await getCurrentStory();

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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">🏷️ Tags</h1>
          <p className="text-sm text-muted-foreground">
            Manage tags across your {currentStory.name} story.
          </p>
        </div>
        <RoleGate allowedRoles={["editor", "admin"]}>
          <Link
            href="/tags/new"
            className="rounded bg-foreground px-5 py-2.5 text-[13px] font-medium text-background hover:bg-foreground/90 transition-colors"
          >
            Create custom tag
          </Link>
        </RoleGate>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded border p-4">
          <div className="text-2xl font-bold">{allTagNames.size}</div>
          <div className="text-xs text-muted-foreground">Total Tags</div>
        </div>
        <div className="rounded border p-4">
          <div className="text-2xl font-bold">
            {tagList.filter((t) => t.hasCustomColor).length}
          </div>
          <div className="text-xs text-muted-foreground">Custom Colors</div>
        </div>
        <div className="rounded border p-4">
          <div className="text-2xl font-bold">
            {tagList.filter((t) => t.usageCount === 0).length}
          </div>
          <div className="text-xs text-muted-foreground">Unused</div>
        </div>
      </div>

      {/* Tags Table */}
      {tagList.length === 0 ? (
        <div className="rounded border border-dashed p-8 text-center text-sm text-muted-foreground">
          No tags yet. Start tagging your characters, worlds, locations, and
          objects!
        </div>
      ) : (
        <div className="rounded border">
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
      )}
    </div>
  );
}
