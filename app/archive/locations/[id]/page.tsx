import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DeleteButton } from "@/components/arc/DeleteButton";
import { Tag } from "@/components/arc/Tag";
import { parseTagsString } from "@/lib/tags";
import { RoleGate } from "@/components/arc/RoleGate";
import { requireRole } from "@/lib/auth";

async function deleteLocation(formData: FormData) {
  "use server";
  await requireRole("editor");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.location.delete({ where: { id } });
  redirect("/archive/locations");
}

type LocationPageProps = {
  params: Promise<{ id: string }>;
};

export default async function LocationPage({ params }: LocationPageProps) {
  const { id } = await params;
  const location = await prisma.location.findUnique({
    where: { id },
    include: {
      residents: {
        orderBy: { name: "asc" },
      },
    },
  });

  if (!location) {
    notFound();
  }

  const tags = parseTagsString(location.tags);

  // Fetch custom tag colors (skip if no tags)
  const customTags = tags.length > 0
    ? await prisma.tag.findMany({
        where: {
          storyId: location.storyId,
          name: { in: tags },
        },
        select: { id: true, name: true, color: true },
      })
    : [];

  const tagDataMap = new Map<string, { id: string; color: string | null }>(
    customTags.map((t) => [t.name, { id: t.id, color: t.color }])
  );

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="space-y-4">
        {/* Back Button */}
        <Link
          href="/archive/locations"
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
          Back to Locations
        </Link>

        {/* Breadcrumb - Hidden on mobile */}
        <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/archive" className="hover:text-foreground transition-colors">
            Archive
          </Link>
          <span>/</span>
          <Link href="/archive/locations" className="hover:text-foreground transition-colors">
            Locations
          </Link>
          <span>/</span>
          <span className="text-foreground">{location.name}</span>
        </div>

        {/* Title and Actions */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-semibold break-words">{location.name}</h1>
            {location.summary ? (
              <p className="text-sm text-muted-foreground mt-1">{location.summary}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 sm:flex-shrink-0">
            <RoleGate allowedRoles={["editor", "admin"]}>
              <Link
                href={`/archive/locations/${location.id}/edit`}
                className="inline-flex items-center justify-center rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:bg-foreground/90 hover:scale-[1.02] hover:shadow-lg transition-all whitespace-nowrap touch-manipulation"
              >
                Edit
              </Link>
              <DeleteButton
                id={location.id}
                name={location.name}
                action={deleteLocation}
              />
            </RoleGate>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <div className="space-y-3">
          {location.imageUrl ? (
            <div className="overflow-hidden rounded-lg border relative h-60 w-full">
              <Image
                src={location.imageUrl}
                alt={location.name}
                fill
                className="object-cover"
                sizes="240px"
                priority
              />
            </div>
          ) : (
            <div className="flex h-60 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
              No image yet
            </div>
          )}

          <div className="rounded-lg border p-4 text-xs text-muted-foreground">
            <div>Created {location.createdAt.toLocaleDateString()}</div>
            <div>Updated {location.updatedAt.toLocaleDateString()}</div>
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-lg border p-4">
            <div className="text-sm font-semibold">Overview</div>
            <p className="mt-2 text-sm text-muted-foreground">
              {location.overview || "No overview yet."}
            </p>
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
            <div className="text-sm font-semibold">Residents</div>
            {location.residents.length ? (
              <div className="mt-3 space-y-2">
                {location.residents.map((resident) => (
                  <Link
                    key={resident.id}
                    href={`/archive/characters/${resident.id}`}
                    className="block text-sm text-muted-foreground hover:text-foreground"
                  >
                    {resident.name}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                No residents assigned.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
