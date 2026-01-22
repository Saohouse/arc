import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentStory } from "@/lib/story";
import { parseTagsString } from "@/lib/tags";
import { ColorPicker } from "@/components/arc/ColorPicker";
import { DeleteTagButton } from "@/components/arc/DeleteTagButton";
import { requireRole } from "@/lib/auth";

async function updateTag(formData: FormData) {
  "use server";
  await requireRole("editor");

  const id = String(formData.get("id") ?? "");
  const newName = String(formData.get("name") ?? "").trim();
  const oldName = String(formData.get("oldName") ?? "").trim();
  if (!id || !newName) return;

  const currentStory = await getCurrentStory();

  const color = String(formData.get("color") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;

  // Update the Tag record
  await prisma.tag.update({
    where: { id },
    data: { name: newName, color, description },
  });

  // If name changed, update all entities using this tag
  if (oldName !== newName) {
    const [characters, worlds, locations, objects] = await Promise.all([
      prisma.character.findMany({
        where: { storyId: currentStory.id },
      }),
      prisma.world.findMany({
        where: { storyId: currentStory.id },
      }),
      prisma.location.findMany({
        where: { storyId: currentStory.id },
      }),
      prisma.object.findMany({
        where: { storyId: currentStory.id },
      }),
    ]);

    // Update each entity's tags
    const updatePromises = [];

    for (const char of characters) {
      if (char.tags) {
        const tags = parseTagsString(char.tags);
        if (tags.includes(oldName)) {
          const newTags = tags.map((t) => (t === oldName ? newName : t));
          updatePromises.push(
            prisma.character.update({
              where: { id: char.id },
              data: { tags: newTags.join(", ") },
            })
          );
        }
      }
    }

    for (const world of worlds) {
      if (world.tags) {
        const tags = parseTagsString(world.tags);
        if (tags.includes(oldName)) {
          const newTags = tags.map((t) => (t === oldName ? newName : t));
          updatePromises.push(
            prisma.world.update({
              where: { id: world.id },
              data: { tags: newTags.join(", ") },
            })
          );
        }
      }
    }

    for (const location of locations) {
      if (location.tags) {
        const tags = parseTagsString(location.tags);
        if (tags.includes(oldName)) {
          const newTags = tags.map((t) => (t === oldName ? newName : t));
          updatePromises.push(
            prisma.location.update({
              where: { id: location.id },
              data: { tags: newTags.join(", ") },
            })
          );
        }
      }
    }

    for (const obj of objects) {
      if (obj.tags) {
        const tags = parseTagsString(obj.tags);
        if (tags.includes(oldName)) {
          const newTags = tags.map((t) => (t === oldName ? newName : t));
          updatePromises.push(
            prisma.object.update({
              where: { id: obj.id },
              data: { tags: newTags.join(", ") },
            })
          );
        }
      }
    }

    await Promise.all(updatePromises);
  }

  redirect("/tags");
}

async function deleteTag(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.tag.delete({ where: { id } });
  redirect("/tags");
}

type EditTagPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditTagPage({ params }: EditTagPageProps) {
  await requireRole("editor");
  const { id } = await params;
  const tag = await prisma.tag.findUnique({ where: { id } });

  if (!tag) {
    notFound();
  }

  // Count usage
  const currentStory = await getCurrentStory();
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

  let usageCount = 0;
  [...characters, ...worlds, ...locations, ...objects].forEach((entity) => {
    if (entity.tags && parseTagsString(entity.tags).includes(tag.name)) {
      usageCount++;
    }
  });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <div className="text-sm text-muted-foreground">Tags / {tag.name}</div>
        <h1 className="text-3xl font-semibold">Edit tag</h1>
        <p className="text-sm text-muted-foreground">
          Used {usageCount} {usageCount === 1 ? "time" : "times"} across your
          story
        </p>
      </div>

      <form action={updateTag} className="space-y-6">
        <input type="hidden" name="id" value={tag.id} />
        <input type="hidden" name="oldName" value={tag.name} />

        <label className="block text-sm font-medium">
          Tag Name
          <input
            name="name"
            required
            defaultValue={tag.name}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Renaming will update all {usageCount} entities using this tag
          </p>
        </label>

        <label className="block text-sm font-medium">
          Custom Color
          <ColorPicker name="color" defaultValue={tag.color || "#3b82f6"} />
        </label>

        <label className="block text-sm font-medium">
          Description (Optional)
          <textarea
            name="description"
            rows={3}
            defaultValue={tag.description || ""}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="What does this tag represent?"
          />
        </label>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-3">
            <button
              type="submit"
              className="rounded bg-foreground px-5 py-2.5 text-[13px] font-medium text-background hover:bg-foreground/90 transition-colors"
            >
              Save changes
            </button>
            <Link
              href="/tags"
              className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </Link>
          </div>

          <DeleteTagButton
            tagId={tag.id}
            tagName={tag.name}
            deleteAction={deleteTag}
          />
        </div>
      </form>
    </div>
  );
}
