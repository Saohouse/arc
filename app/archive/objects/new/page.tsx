import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { saveImageUpload } from "@/lib/uploads";
import { requireStory } from "@/lib/story";
import { requireRole } from "@/lib/auth";

async function createObject(formData: FormData) {
  "use server";
  await requireRole("editor");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return;
  }

  const currentStory = await requireStory();

  const category = String(formData.get("category") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const tagsRaw = String(formData.get("tags") ?? "").trim();
  const tags = tagsRaw
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .join(",");

  const imageFile = formData.get("image");
  const imageUrl =
    imageFile instanceof File
      ? await saveImageUpload(imageFile, "object")
      : null;

  const object = await prisma.object.create({
    data: {
      name,
      category: category || null,
      description: description || null,
      imageUrl,
      tags,
      storyId: currentStory.id,
    },
  });

  redirect(`/archive/objects/${object.id}`);
}

export default async function NewObjectPage() {
  await requireRole("editor");
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <div className="text-sm text-muted-foreground">Archive / Objects</div>
        <h1 className="text-3xl font-semibold">New object</h1>
        <p className="text-sm text-muted-foreground">
          Add a weapon, tool, artifact, or collectible.
        </p>
      </div>

      <form action={createObject} className="space-y-5">
        <label className="block text-sm font-medium">
          Name
          <input
            name="name"
            required
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="e.g. Neon Katana, Data Crystal"
          />
        </label>

        <label className="block text-sm font-medium">
          Category
          <input
            name="category"
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="weapon, tool, artifact, collectible"
          />
        </label>

        <label className="block text-sm font-medium">
          Image (JPG or PNG)
          <input
            name="image"
            type="file"
            accept="image/jpeg,image/png"
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </label>

        <label className="block text-sm font-medium">
          Tags
          <input
            name="tags"
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="rare, magical, tech"
          />
        </label>

        <label className="block text-sm font-medium">
          Description
          <textarea
            name="description"
            rows={6}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Lore, function, and canonical details."
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="rounded bg-foreground px-5 py-2.5 text-[13px] font-medium text-background hover:bg-foreground/90 transition-colors"
          >
            Create object
          </button>
          <Link
            href="/archive/objects"
            className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
