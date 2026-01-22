import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { saveImageUpload } from "@/lib/uploads";
import { getCurrentStory } from "@/lib/story";
import { LocationSelector } from "@/components/arc/LocationSelector";
import { requireRole } from "@/lib/auth";

async function createCharacter(formData: FormData) {
  "use server";
  await requireRole("editor");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return;
  }

  const currentStory = await getCurrentStory();

  const title = String(formData.get("title") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const tagsRaw = String(formData.get("tags") ?? "").trim();
  const tags = tagsRaw
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .join(",");
  const homeLocationId = String(formData.get("homeLocationId") ?? "").trim();

  const imageFile = formData.get("image");
  const imageUrl =
    imageFile instanceof File
      ? await saveImageUpload(imageFile, "character")
      : null;

  const character = await prisma.character.create({
    data: {
      name,
      title: title || null,
      imageUrl,
      bio: bio || null,
      tags,
      homeLocationId: homeLocationId || null,
      storyId: currentStory.id,
    },
  });

  redirect(`/archive/characters/${character.id}`);
}

export default async function NewCharacterPage() {
  await requireRole("editor");
  const currentStory = await getCurrentStory();
  const locations = await prisma.location.findMany({
    where: { storyId: currentStory.id },
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <div className="text-sm text-muted-foreground">Archive / Characters</div>
        <h1 className="text-3xl font-semibold">New character</h1>
        <p className="text-sm text-muted-foreground">
          Create a structured canon profile.
        </p>
      </div>

      <form action={createCharacter} className="space-y-5">
        <label className="block text-sm font-medium">
          Name
          <input
            name="name"
            required
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="e.g. Sao, Quinn"
          />
        </label>

        <label className="block text-sm font-medium">
          Title
          <input
            name="title"
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Role, archetype, or honorific"
          />
        </label>

        <label className="block text-sm font-medium">
          Portrait (JPG or PNG)
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
            placeholder="faction, timeline, motif"
          />
        </label>

        <LocationSelector locations={locations} />

        <label className="block text-sm font-medium">
          Bio
          <textarea
            name="bio"
            rows={6}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Canonical background and arc notes."
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90"
          >
            Create character
          </button>
          <Link
            href="/archive/characters"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
