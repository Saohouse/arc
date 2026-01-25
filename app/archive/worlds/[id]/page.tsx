import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DeleteButton } from "@/components/arc/DeleteButton";
import { Tag } from "@/components/arc/Tag";
import { parseTagsString } from "@/lib/tags";
import { RoleGate } from "@/components/arc/RoleGate";
import { requireRole } from "@/lib/auth";

async function deleteWorld(formData: FormData) {
  "use server";
  await requireRole("editor");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.world.delete({ where: { id } });
  redirect("/archive/worlds");
}

type WorldPageProps = {
  params: Promise<{ id: string }>;
};

export default async function WorldPage({ params }: WorldPageProps) {
  const { id } = await params;
  const world = await prisma.world.findUnique({
    where: { id },
  });

  if (!world) {
    notFound();
  }

  const tags = parseTagsString(world.tags);

  // Fetch custom tag colors (skip if no tags)
  const customTags = tags.length > 0
    ? await prisma.tag.findMany({
        where: {
          storyId: world.storyId,
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
          <div className="text-sm text-muted-foreground">Archive / Worlds</div>
          <h1 className="text-3xl font-semibold">{world.name}</h1>
          {world.summary ? (
            <p className="text-sm text-muted-foreground">{world.summary}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <RoleGate allowedRoles={["editor", "admin"]}>
            <Link
              href={`/archive/worlds/${world.id}/edit`}
              className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90"
            >
              Edit
            </Link>
            <DeleteButton id={world.id} name={world.name} action={deleteWorld} />
          </RoleGate>
          <Link
            href="/archive/worlds"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Back to list
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <div className="space-y-3">
          {world.imageUrl ? (
            <div className="overflow-hidden rounded-lg border relative h-60 w-full">
              <Image
                src={world.imageUrl}
                alt={world.name}
                fill
                className="object-cover"
                sizes="240px"
                priority
              />
            </div>
          ) : (
            <div className="flex h-60 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
              No cover image yet
            </div>
          )}

          <div className="rounded-lg border p-4 text-xs text-muted-foreground">
            <div>Created {world.createdAt.toLocaleDateString()}</div>
            <div>Updated {world.updatedAt.toLocaleDateString()}</div>
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-lg border p-4">
            <div className="text-sm font-semibold">Overview</div>
            <p className="mt-2 text-sm text-muted-foreground">
              {world.overview || "No overview yet."}
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
        </div>
      </div>
    </div>
  );
}
