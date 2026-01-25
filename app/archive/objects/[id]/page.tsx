import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DeleteButton } from "@/components/arc/DeleteButton";
import { Tag } from "@/components/arc/Tag";
import { parseTagsString } from "@/lib/tags";
import { RoleGate } from "@/components/arc/RoleGate";
import { requireRole } from "@/lib/auth";

async function deleteObject(formData: FormData) {
  "use server";
  await requireRole("editor");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.object.delete({ where: { id } });
  redirect("/archive/objects");
}

type ObjectPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ObjectPage({ params }: ObjectPageProps) {
  const { id } = await params;
  const object = await prisma.object.findUnique({
    where: { id },
  });

  if (!object) {
    notFound();
  }

  const tags = parseTagsString(object.tags);

  // Fetch custom tag colors (skip if no tags)
  const customTags = tags.length > 0
    ? await prisma.tag.findMany({
        where: {
          storyId: object.storyId,
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
            Archive / Objects
          </div>
          <h1 className="text-3xl font-semibold">{object.name}</h1>
          {object.category ? (
            <p className="text-sm text-muted-foreground">{object.category}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <RoleGate allowedRoles={["editor", "admin"]}>
            <Link
              href={`/archive/objects/${object.id}/edit`}
              className="rounded bg-foreground px-5 py-2.5 text-[13px] font-medium text-background hover:bg-foreground/90 transition-colors"
            >
              Edit
            </Link>
            <DeleteButton
              id={object.id}
              name={object.name}
              action={deleteObject}
            />
          </RoleGate>
          <Link
            href="/archive/objects"
            className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to list
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <div className="space-y-3">
          {object.imageUrl ? (
            <div className="overflow-hidden rounded-lg border relative h-60 w-full">
              <Image
                src={object.imageUrl}
                alt={object.name}
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
            <div>Created {object.createdAt.toLocaleDateString()}</div>
            <div>Updated {object.updatedAt.toLocaleDateString()}</div>
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-lg border p-4">
            <div className="text-sm font-semibold">Description</div>
            <p className="mt-2 text-sm text-muted-foreground">
              {object.description || "No description yet."}
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
