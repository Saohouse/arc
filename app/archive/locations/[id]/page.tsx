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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm text-muted-foreground">
            Archive / Locations
          </div>
          <h1 className="text-3xl font-semibold">{location.name}</h1>
          {location.summary ? (
            <p className="text-sm text-muted-foreground">{location.summary}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <RoleGate allowedRoles={["editor", "admin"]}>
            <Link
              href={`/archive/locations/${location.id}/edit`}
              className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90"
            >
              Edit
            </Link>
            <DeleteButton
              id={location.id}
              name={location.name}
              action={deleteLocation}
            />
          </RoleGate>
          <Link
            href="/archive/locations"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Back to list
          </Link>
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
