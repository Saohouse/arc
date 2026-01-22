import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DeleteButton } from "@/components/arc/DeleteButton";
import { RoleGate } from "@/components/arc/RoleGate";
import { requireRole } from "@/lib/auth";

async function deleteArc(formData: FormData) {
  "use server";
  await requireRole("editor");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.arc.delete({ where: { id } });
  redirect("/timeline");
}

type ArcPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ArcPage({ params }: ArcPageProps) {
  const { id } = await params;
  const arc = await prisma.arc.findUnique({
    where: { id },
    include: {
      saga: true,
    },
  });

  if (!arc) {
    notFound();
  }

  // Fetch related entity if linked
  let linkedEntity: { name: string; type: string } | null = null;
  if (arc.characterId) {
    const character = await prisma.character.findUnique({
      where: { id: arc.characterId },
    });
    if (character) {
      linkedEntity = { name: character.name, type: "character" };
    }
  } else if (arc.locationId) {
    const location = await prisma.location.findUnique({
      where: { id: arc.locationId },
    });
    if (location) {
      linkedEntity = { name: location.name, type: "location" };
    }
  }

  // Get episodes in this arc
  const episodes =
    arc.startEpisodeNumber && arc.endEpisodeNumber
      ? await prisma.episode.findMany({
          where: {
            storyId: arc.storyId,
            episodeNumber: {
              gte: arc.startEpisodeNumber,
              lte: arc.endEpisodeNumber,
            },
          },
          orderBy: { episodeNumber: "asc" },
        })
      : [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "resolved":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400";
      case "active":
        return "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400";
      case "planning":
        return "bg-gray-100 text-gray-700 dark:bg-gray-950/30 dark:text-gray-400";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-950/30 dark:text-gray-400";
    }
  };

  const getTypeEmoji = (type: string) => {
    switch (type) {
      case "character":
        return "👤";
      case "plot":
        return "📖";
      case "location":
        return "📍";
      default:
        return "✨";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm text-muted-foreground">Timeline / Arcs</div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold">
              {getTypeEmoji(arc.type)} {arc.name}
            </h1>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(arc.status)}`}
            >
              {arc.status.charAt(0).toUpperCase() + arc.status.slice(1)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <RoleGate allowedRoles={["editor", "admin"]}>
            <Link
              href={`/timeline/arcs/${arc.id}/edit`}
              className="rounded bg-foreground px-5 py-2.5 text-[13px] font-medium text-background hover:bg-foreground/90 transition-colors"
            >
              Edit
            </Link>
            <DeleteButton id={arc.id} name={arc.name} action={deleteArc} />
          </RoleGate>
          <Link
            href="/timeline"
            className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to timeline
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          {/* Description */}
          {arc.description && (
            <section className="rounded border p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Description
              </h2>
              <p className="mt-2 text-sm">{arc.description}</p>
            </section>
          )}

          {/* Episodes in this arc */}
          {episodes.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">
                Episodes ({episodes.length})
              </h2>
              <div className="space-y-2">
                {episodes.map((ep) => (
                  <Link
                    key={ep.id}
                    href={`/episodes/${ep.id}`}
                    className="block rounded border p-4 transition-all hover:border-foreground/40 hover:shadow-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        EP {ep.episodeNumber.toString().padStart(2, "0")}
                      </span>
                      <h3 className="font-semibold">{ep.title}</h3>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="rounded border p-4 text-sm">
            <h3 className="font-semibold">Arc Details</h3>
            <dl className="mt-3 space-y-2">
              <div>
                <dt className="text-xs text-muted-foreground">Type</dt>
                <dd className="font-medium capitalize">{arc.type} Arc</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Status</dt>
                <dd className="font-medium capitalize">{arc.status}</dd>
              </div>
              {arc.startEpisodeNumber && (
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Start Episode
                  </dt>
                  <dd className="font-medium">
                    Episode {arc.startEpisodeNumber}
                  </dd>
                </div>
              )}
              {arc.endEpisodeNumber && (
                <div>
                  <dt className="text-xs text-muted-foreground">End Episode</dt>
                  <dd className="font-medium">Episode {arc.endEpisodeNumber}</dd>
                </div>
              )}
              {arc.saga && (
                <div>
                  <dt className="text-xs text-muted-foreground">Saga</dt>
                  <dd className="font-medium">
                    <Link
                      href={`/timeline/sagas/${arc.saga.id}`}
                      className="hover:text-foreground/70 transition-colors"
                    >
                      #{arc.saga.number} - {arc.saga.name}
                    </Link>
                  </dd>
                </div>
              )}
              {linkedEntity && (
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Linked {linkedEntity.type}
                  </dt>
                  <dd className="font-medium">{linkedEntity.name}</dd>
                </div>
              )}
              {arc.color && (
                <div>
                  <dt className="text-xs text-muted-foreground">Color</dt>
                  <dd className="flex items-center gap-2">
                    <div
                      className="h-4 w-4 rounded border"
                      style={{ backgroundColor: arc.color }}
                    ></div>
                    <span className="font-mono text-xs">{arc.color}</span>
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <div className="rounded border p-4 text-xs text-muted-foreground">
            <div>Created {arc.createdAt.toLocaleDateString()}</div>
            <div>Updated {arc.updatedAt.toLocaleDateString()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
