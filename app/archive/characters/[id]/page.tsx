import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DeleteButton } from "@/components/arc/DeleteButton";
import { Tag } from "@/components/arc/Tag";
import { parseTagsString } from "@/lib/tags";
import { RoleGate } from "@/components/arc/RoleGate";
import { requireRole } from "@/lib/auth";

async function deleteCharacter(formData: FormData) {
  "use server";
  await requireRole("editor");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.character.delete({ where: { id } });
  redirect("/archive/characters");
}

type CharacterPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CharacterPage({ params }: CharacterPageProps) {
  const { id } = await params;
  const character = await prisma.character.findUnique({
    where: { id },
    include: { homeLocation: true },
  });

  if (!character) {
    notFound();
  }

  const tags = character.tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  // Fetch custom tag colors and IDs
  const customTags = await prisma.tag.findMany({
    where: {
      storyId: character.storyId,
      name: { in: tags },
    },
    select: { id: true, name: true, color: true },
  });

  const tagDataMap = new Map<string, { id: string; color: string | null }>(
    customTags.map((t) => [t.name, { id: t.id, color: t.color }])
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm text-muted-foreground">
            Archive / Characters
          </div>
          <h1 className="text-3xl font-semibold">{character.name}</h1>
          {character.title ? (
            <p className="text-sm text-muted-foreground">{character.title}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <RoleGate allowedRoles={["editor", "admin"]}>
            <Link
              href={`/archive/characters/${character.id}/edit`}
              className="rounded-lg bg-foreground px-5 py-2.5 text-[13px] font-medium text-background hover:bg-foreground/90 transition-all"
            >
              Edit
            </Link>
            <DeleteButton
              id={character.id}
              name={character.name}
              action={deleteCharacter}
            />
          </RoleGate>
          <Link
            href="/archive/characters"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Back to list
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <div className="space-y-3">
          {character.imageUrl ? (
            <div className="overflow-hidden rounded-lg border">
              <img
                src={character.imageUrl}
                alt={character.name}
                className="h-60 w-full object-cover"
              />
            </div>
          ) : (
            <div className="flex h-60 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
              No portrait yet
            </div>
          )}

          <div className="rounded-lg border p-4 text-xs text-muted-foreground">
            <div>Created {character.createdAt.toLocaleDateString()}</div>
            <div>Updated {character.updatedAt.toLocaleDateString()}</div>
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-lg border p-4">
            <div className="text-sm font-semibold">Bio</div>
            <p className="mt-2 text-sm text-muted-foreground">
              {character.bio || "No bio yet."}
            </p>
          </section>

          <section className="rounded-lg border p-4">
            <div className="text-sm font-semibold">Home location</div>
            {character.homeLocation ? (
              <Link
                href={`/archive/locations/${character.homeLocation.id}`}
                className="mt-2 block text-sm text-muted-foreground hover:text-foreground"
              >
                {character.homeLocation.name}
              </Link>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                No home location set.
              </p>
            )}
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
