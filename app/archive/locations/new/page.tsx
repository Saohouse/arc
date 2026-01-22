import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { saveImageUpload } from "@/lib/uploads";
import { getCurrentStory } from "@/lib/story";
import { requireRole } from "@/lib/auth";

async function createLocation(formData: FormData) {
  "use server";
  await requireRole("editor");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return;
  }

  const currentStory = await getCurrentStory();

  const summary = String(formData.get("summary") ?? "").trim();
  const overview = String(formData.get("overview") ?? "").trim();
  const tagsRaw = String(formData.get("tags") ?? "").trim();
  const tags = tagsRaw
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .join(",");

  const imageFile = formData.get("image");
  const imageUrl =
    imageFile instanceof File
      ? await saveImageUpload(imageFile, "location")
      : null;

  const location = await prisma.location.create({
    data: {
      name,
      summary: summary || null,
      overview: overview || null,
      imageUrl,
      tags,
      storyId: currentStory.id,
    },
  });

  redirect(`/archive/locations/${location.id}`);
}

export default async function NewLocationPage() {
  await requireRole("editor");
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <div className="text-sm text-muted-foreground">
          Archive / Locations
        </div>
        <h1 className="text-3xl font-semibold">New location</h1>
        <p className="text-sm text-muted-foreground">
          Capture the set and its canonical details.
        </p>
      </div>

      <form action={createLocation} className="space-y-5">
        <label className="block text-sm font-medium">
          Name
          <input
            name="name"
            required
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="e.g. Atelier 9, Neon Alley"
          />
        </label>

        <label className="block text-sm font-medium">
          Summary
          <input
            name="summary"
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="One-line setting description"
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
            placeholder="district, faction, vibe"
          />
        </label>

        <label className="block text-sm font-medium">
          Overview
          <textarea
            name="overview"
            rows={6}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Key scenes, physical details, ownership."
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90"
          >
            Create location
          </button>
          <Link
            href="/archive/locations"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
