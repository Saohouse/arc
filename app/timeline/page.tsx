import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentStory } from "@/lib/story";
import { RoleGate } from "@/components/arc/RoleGate";

export default async function TimelinePage() {
  const currentStory = await getCurrentStory();

  const [episodes, arcs, characters, sagas] = await Promise.all([
    prisma.episode.findMany({
      where: { storyId: currentStory.id },
      orderBy: { episodeNumber: "asc" },
      include: {
        scenes: {
          include: {
            location: true,
          },
        },
      },
    }),
    prisma.arc.findMany({
      where: { storyId: currentStory.id },
      orderBy: { startEpisodeNumber: "asc" },
      include: {
        saga: true,
      },
    }),
    prisma.character.findMany({
      where: { storyId: currentStory.id },
      select: { id: true, name: true },
    }),
    prisma.saga.findMany({
      where: { storyId: currentStory.id },
      orderBy: { number: "asc" },
    }),
  ]);

  // Get character appearances per episode
  const characterAppearances = new Map<number, Set<string>>();
  episodes.forEach((ep) => {
    const characterIds = new Set<string>();
    ep.scenes.forEach((scene) => {
      if (scene.characterIds) {
        scene.characterIds.split(",").forEach((id) => {
          if (id.trim()) characterIds.add(id.trim());
        });
      }
    });
    characterAppearances.set(ep.episodeNumber, characterIds);
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "bg-emerald-500";
      case "review":
        return "bg-amber-500";
      case "draft":
        return "bg-gray-400";
      default:
        return "bg-gray-400";
    }
  };

  const getArcColor = (type: string) => {
    switch (type) {
      case "character":
        return "bg-blue-500";
      case "plot":
        return "bg-purple-500";
      case "location":
        return "bg-emerald-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">📅 Timeline</h1>
          <p className="text-sm text-muted-foreground">
            Visual timeline of episodes and story arcs.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/timeline/sagas"
            className="rounded border px-4 py-2 text-[13px] font-medium hover:bg-muted transition-colors"
          >
            📚 Sagas
          </Link>
          <RoleGate allowedRoles={["editor", "admin"]}>
            <Link
              href="/timeline/arcs/new"
              className="rounded border px-4 py-2 text-[13px] font-medium hover:bg-muted transition-colors"
            >
              + New Arc
            </Link>
            <Link
              href="/episodes/new"
              className="rounded bg-foreground px-4 py-2 text-[13px] font-medium text-background hover:bg-foreground/90 transition-colors"
            >
              + New Episode
            </Link>
          </RoleGate>
        </div>
      </div>

      {episodes.length === 0 ? (
        <div className="rounded border border-dashed p-12 text-center text-sm text-muted-foreground">
          No episodes yet. Create your first episode to start building your
          timeline.
        </div>
      ) : (
        <div className="space-y-8">
          {/* Legend */}
          <div className="flex flex-wrap gap-6 text-xs">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-emerald-500"></div>
              <span>Published</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-amber-500"></div>
              <span>In Review</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-gray-400"></div>
              <span>Draft</span>
            </div>
          </div>

          {/* Timeline */}
          <div className="overflow-x-auto pb-4">
            <div className="relative min-w-max">
              {/* Episode Timeline */}
              <div className="flex gap-4 pb-8">
                {episodes.map((episode, idx) => (
                  <div key={episode.id} className="relative flex-shrink-0">
                    {/* Episode Card */}
                    <Link
                      href={`/episodes/${episode.id}`}
                      className="block w-48 rounded border p-4 transition-all hover:border-foreground/40 hover:shadow-lg"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-3 w-3 rounded-full ${getStatusColor(episode.status)}`}
                        ></div>
                        <span className="text-xs font-medium text-muted-foreground">
                          EP {episode.episodeNumber.toString().padStart(2, "0")}
                        </span>
                      </div>
                      <h3 className="mt-2 font-semibold text-sm line-clamp-2">
                        {episode.title}
                      </h3>
                      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                        <div>📝 {episode.scenes.length} scenes</div>
                        {episode.publishDate && (
                          <div>
                            📅{" "}
                            {new Date(episode.publishDate).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric" }
                            )}
                          </div>
                        )}
                      </div>

                      {/* Character indicators */}
                      {characterAppearances.get(episode.episodeNumber) &&
                        characterAppearances.get(episode.episodeNumber)!
                          .size > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1">
                            {Array.from(
                              characterAppearances.get(episode.episodeNumber)!
                            )
                              .slice(0, 3)
                              .map((charId) => {
                                const char = characters.find(
                                  (c) => c.id === charId
                                );
                                return char ? (
                                  <div
                                    key={charId}
                                    className="rounded-full bg-blue-100 dark:bg-blue-950/30 px-2 py-0.5 text-[10px] text-blue-700 dark:text-blue-400"
                                    title={char.name}
                                  >
                                    👤
                                  </div>
                                ) : null;
                              })}
                            {characterAppearances.get(episode.episodeNumber)!
                              .size > 3 && (
                              <div className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                                +
                                {characterAppearances.get(
                                  episode.episodeNumber
                                )!.size - 3}
                              </div>
                            )}
                          </div>
                        )}
                    </Link>

                    {/* Connector line */}
                    {idx < episodes.length - 1 && (
                      <div className="absolute top-1/2 -right-4 h-px w-4 bg-border"></div>
                    )}
                  </div>
                ))}
              </div>

              {/* Sagas Overview (if any) */}
              {sagas.length > 0 && (
                <div className="space-y-2 mt-8 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold">📚 Sagas</h2>
                    <Link
                      href="/timeline/sagas"
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      View all →
                    </Link>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sagas.map((saga) => (
                      <Link
                        key={saga.id}
                        href={`/timeline/sagas/${saga.id}`}
                        className="rounded border px-3 py-2 text-xs transition-all hover:border-foreground/40"
                        style={
                          saga.color
                            ? { borderColor: saga.color, backgroundColor: `${saga.color}20` }
                            : {}
                        }
                      >
                        <span className="font-medium">
                          #{saga.number} {saga.name}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Arcs Overlay */}
              {arcs.length > 0 && (
                <div className="space-y-2 mt-8">
                  <h2 className="text-sm font-semibold mb-4">Story Arcs</h2>
                  {arcs.map((arc) => {
                    const startIdx = episodes.findIndex(
                      (ep) => ep.episodeNumber === arc.startEpisodeNumber
                    );
                    const endIdx = episodes.findIndex(
                      (ep) => ep.episodeNumber === arc.endEpisodeNumber
                    );

                    if (startIdx === -1) return null;

                    const finalEndIdx =
                      endIdx === -1 ? episodes.length - 1 : endIdx;
                    const width = (finalEndIdx - startIdx + 1) * 208; // 192px card + 16px gap

                    return (
                      <Link
                        key={arc.id}
                        href={`/timeline/arcs/${arc.id}`}
                        className="block group"
                      >
                        <div
                          className="relative h-8 rounded transition-all hover:h-10"
                          style={{
                            marginLeft: `${startIdx * 208}px`,
                            width: `${width}px`,
                          }}
                        >
                          <div
                            className={`h-full rounded ${getArcColor(arc.type)} opacity-20 group-hover:opacity-30 transition-opacity`}
                          ></div>
                          <div className="absolute inset-0 flex items-center px-3">
                            <div className="flex items-center gap-2">
                              <div
                                className={`h-2 w-2 rounded-full ${getArcColor(arc.type)}`}
                              ></div>
                              <span className="text-xs font-medium truncate">
                                {arc.name}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                ({arc.type})
                              </span>
                              {arc.saga && (
                                <span className="text-[10px] text-muted-foreground">
                                  • {arc.saga.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Arc Legend */}
          {arcs.length > 0 && (
            <div className="flex flex-wrap gap-6 text-xs border-t pt-6">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                <span>Character Arc</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-purple-500"></div>
                <span>Plot Arc</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-emerald-500"></div>
                <span>Location Arc</span>
              </div>
            </div>
          )}

          {arcs.length === 0 && (
            <div className="rounded border border-dashed p-8 text-center">
              <p className="text-sm text-muted-foreground">
                No story arcs yet. Create arcs to track character journeys and
                plot threads across episodes.
              </p>
              <RoleGate allowedRoles={["editor", "admin"]}>
                <Link
                  href="/timeline/arcs/new"
                  className="mt-4 inline-block text-sm font-medium text-foreground hover:underline"
                >
                  Create your first arc →
                </Link>
              </RoleGate>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
