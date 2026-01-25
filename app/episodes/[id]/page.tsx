import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DeleteButton } from "@/components/arc/DeleteButton";
import { RoleGate } from "@/components/arc/RoleGate";
import { requireRole } from "@/lib/auth";

async function deleteEpisode(formData: FormData) {
  "use server";
  await requireRole("editor");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.episode.delete({ where: { id } });
  redirect("/episodes");
}

type EpisodePageProps = {
  params: Promise<{ id: string }>;
};

export default async function EpisodePage({ params }: EpisodePageProps) {
  const { id } = await params;
  const episode = await prisma.episode.findUnique({
    where: { id },
    include: {
      scenes: {
        orderBy: { sceneNumber: "asc" },
        include: {
          location: true,
        },
      },
    },
  });

  if (!episode) {
    notFound();
  }

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm text-muted-foreground">
            Episodes / EP {episode.episodeNumber.toString().padStart(2, "0")}
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold">{episode.title}</h1>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(episode.status)}`}
            >
              {episode.status.charAt(0).toUpperCase() + episode.status.slice(1)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <RoleGate allowedRoles={["editor", "admin"]}>
            <Link
              href={`/episodes/${episode.id}/edit`}
              className="rounded bg-foreground px-5 py-2.5 text-[13px] font-medium text-background hover:bg-foreground/90 transition-colors"
            >
              Edit
            </Link>
            <DeleteButton
              id={episode.id}
              name={`Episode ${episode.episodeNumber}`}
              action={deleteEpisode}
            />
          </RoleGate>
          <Link
            href="/episodes"
            className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to list
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          {/* Description */}
          {episode.description && (
            <section className="rounded border p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Description
              </h2>
              <p className="mt-2 text-sm">{episode.description}</p>
            </section>
          )}

          {/* Script */}
          {episode.script && (
            <section className="rounded border p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Script / Content
              </h2>
              <pre className="mt-2 whitespace-pre-wrap font-mono text-sm">
                {episode.script}
              </pre>
            </section>
          )}

          {/* Scenes */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                📝 Scenes ({episode.scenes.length})
              </h2>
              <RoleGate allowedRoles={["editor", "admin"]}>
                <Link
                  href={`/episodes/${episode.id}/scenes/new`}
                  className="text-[13px] font-medium text-foreground hover:underline"
                >
                  + Add scene
                </Link>
              </RoleGate>
            </div>

            {episode.scenes.length === 0 ? (
              <div className="rounded border border-dashed p-6 text-center text-sm text-muted-foreground">
                No scenes yet. Add scenes to break down this episode.
              </div>
            ) : (
              <div className="space-y-2">
                {episode.scenes.map((scene) => (
                  <Link
                    key={scene.id}
                    href={`/episodes/${episode.id}/scenes/${scene.id}`}
                    className="block rounded border p-4 transition-all hover:border-foreground/40 hover:shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      {scene.imageUrl && (
                        <Image
                          src={scene.imageUrl}
                          alt={scene.title}
                          width={64}
                          height={64}
                          className="h-16 w-16 rounded object-cover"
                          loading="lazy"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-muted-foreground">
                            Scene {scene.sceneNumber}
                          </span>
                          <h3 className="font-semibold">{scene.title}</h3>
                        </div>
                        {scene.location && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            📍 {scene.location.name}
                          </div>
                        )}
                        {scene.content && (
                          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                            {scene.content}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {episode.thumbnailUrl && (
            <div className="overflow-hidden rounded border relative w-full aspect-video">
              <Image
                src={episode.thumbnailUrl}
                alt={episode.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 300px"
                priority
              />
            </div>
          )}

          <div className="rounded border p-4 text-sm">
            <h3 className="font-semibold">Details</h3>
            <dl className="mt-3 space-y-2">
              <div>
                <dt className="text-xs text-muted-foreground">Episode Number</dt>
                <dd className="font-medium">#{episode.episodeNumber}</dd>
              </div>
              {episode.duration && (
                <div>
                  <dt className="text-xs text-muted-foreground">Duration</dt>
                  <dd className="font-medium">{episode.duration} seconds</dd>
                </div>
              )}
              {episode.publishDate && (
                <div>
                  <dt className="text-xs text-muted-foreground">Publish Date</dt>
                  <dd className="font-medium">
                    {new Date(episode.publishDate).toLocaleDateString()}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-muted-foreground">Created</dt>
                <dd className="font-medium">
                  {episode.createdAt.toLocaleDateString()}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Updated</dt>
                <dd className="font-medium">
                  {episode.updatedAt.toLocaleDateString()}
                </dd>
              </div>
            </dl>

            {episode.instagramUrl && (
              <a
                href={episode.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 block rounded bg-foreground px-3 py-2 text-center text-xs font-medium text-background hover:bg-foreground/90 transition-colors"
              >
                View on Instagram →
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
