import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { requireStory } from "@/lib/story";
import { RoleGate } from "@/components/arc/RoleGate";

export default async function EpisodesPage() {
  const currentStory = await requireStory();
  const episodes = await prisma.episode.findMany({
    where: { storyId: currentStory.id },
    orderBy: { episodeNumber: "asc" },
    include: {
      scenes: true,
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400";
      case "review":
        return "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400";
      case "draft":
        return "bg-gray-100 text-gray-700 dark:bg-gray-950/30 dark:text-gray-400";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-950/30 dark:text-gray-400";
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">📺 Episodes</h1>
          <p className="text-sm text-muted-foreground">
            Manage your story episodes and scenes for Instagram content.
          </p>
        </div>
        <RoleGate allowedRoles={["editor", "admin"]}>
          <Link
            href="/episodes/new"
            className="rounded bg-foreground px-5 py-2.5 text-[13px] font-medium text-background hover:bg-foreground/90 transition-colors"
          >
            New episode
          </Link>
        </RoleGate>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded border p-4">
          <div className="text-2xl font-bold">{episodes.length}</div>
          <div className="text-xs text-muted-foreground">Total Episodes</div>
        </div>
        <div className="rounded border p-4">
          <div className="text-2xl font-bold">
            {episodes.filter((e) => e.status === "published").length}
          </div>
          <div className="text-xs text-muted-foreground">Published</div>
        </div>
        <div className="rounded border p-4">
          <div className="text-2xl font-bold">
            {episodes.filter((e) => e.status === "review").length}
          </div>
          <div className="text-xs text-muted-foreground">In Review</div>
        </div>
        <div className="rounded border p-4">
          <div className="text-2xl font-bold">
            {episodes.filter((e) => e.status === "draft").length}
          </div>
          <div className="text-xs text-muted-foreground">Drafts</div>
        </div>
      </div>

      {/* Episodes List */}
      {episodes.length === 0 ? (
        <div className="rounded border border-dashed p-8 text-center text-sm text-muted-foreground">
          No episodes yet. Create your first episode to start building your
          narrative.
        </div>
      ) : (
        <div className="space-y-3">
          {episodes.map((episode) => (
            <Link
              key={episode.id}
              href={`/episodes/${episode.id}`}
              className="block rounded border p-5 transition-all hover:border-foreground/40 hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-muted-foreground">
                      EP {episode.episodeNumber.toString().padStart(2, "0")}
                    </span>
                    <h3 className="text-lg font-semibold">{episode.title}</h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(episode.status)}`}
                    >
                      {getStatusLabel(episode.status)}
                    </span>
                  </div>
                  {episode.description && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {episode.description}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <span>📝 {episode.scenes.length} scenes</span>
                    {episode.duration && (
                      <span>⏱️ {episode.duration}s</span>
                    )}
                    {episode.publishDate && (
                      <span>
                        📅 {new Date(episode.publishDate).toLocaleDateString()}
                      </span>
                    )}
                    {episode.instagramUrl && <span>📸 Instagram</span>}
                  </div>
                </div>
                {episode.thumbnailUrl && (
                  <Image
                    src={episode.thumbnailUrl}
                    alt={episode.title}
                    width={80}
                    height={80}
                    className="h-20 w-20 rounded object-cover"
                    loading="lazy"
                  />
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
