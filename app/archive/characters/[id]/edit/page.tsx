import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { saveImageUpload } from "@/lib/uploads";
import { requireStory } from "@/lib/story";
import { LocationSelector } from "@/components/arc/LocationSelector";
import { requireRole } from "@/lib/auth";
import { ImageUpload } from "@/components/arc/ImageUpload";
import { TraitSelector } from "@/components/arc/TraitSelector";

async function updateCharacter(formData: FormData) {
  "use server";
  await requireRole("editor");

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!name || !id) {
    return;
  }

  const title = String(formData.get("title") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const tagsRaw = String(formData.get("tags") ?? "").trim();
  const tags = tagsRaw
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .join(",");
  const psychologyTraits = String(formData.get("psychologyTraits") ?? "").trim();
  const homeLocationId = String(formData.get("homeLocationId") ?? "").trim();

  const imageFile = formData.get("image");
  const imageData = formData.get("image_data"); // Cropped image data URL
  const imageRemove = formData.get("image_remove"); // Remove image flag
  let imageUrl = String(formData.get("existingImageUrl") ?? "");

  // Handle image removal
  if (imageRemove === "true") {
    imageUrl = "";
  }
  // Handle cropped image (data URL) or regular file upload
  else if (imageData && typeof imageData === 'string' && imageData.startsWith('data:')) {
    const uploadedPath = await saveImageUpload(imageData, "character");
    if (uploadedPath) {
      imageUrl = uploadedPath;
    }
  } else if (imageFile instanceof File && imageFile.size > 0) {
    const uploadedPath = await saveImageUpload(imageFile, "character");
    if (uploadedPath) {
      imageUrl = uploadedPath;
    }
  }

  await prisma.character.update({
    where: { id },
    data: {
      name,
      title: title || null,
      imageUrl: imageUrl || null,
      bio: bio || null,
      tags,
      psychologyTraits,
      homeLocationId: homeLocationId || null,
    },
  });

  redirect(`/archive/characters/${id}`);
}

type EditCharacterPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditCharacterPage({
  params,
}: EditCharacterPageProps) {
  await requireRole("editor");
  const { id } = await params;
  const currentStory = await requireStory();
  const [character, locations] = await Promise.all([
    prisma.character.findUnique({ where: { id } }),
    prisma.location.findMany({
      where: { storyId: currentStory.id },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        locationType: true,
        parentLocationId: true,
        parent: {
          select: {
            id: true,
            name: true,
            locationType: true,
          },
        },
      },
    }),
  ]);

  if (!character) {
    notFound();
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="space-y-3">
        {/* Back Button */}
        <Link
          href={`/archive/characters/${character.id}`}
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
          Back to {character.name}
        </Link>

        {/* Breadcrumb Navigation - Hidden on mobile */}
        <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/archive" className="hover:text-foreground transition-colors">
            Archive
          </Link>
          <span>/</span>
          <Link href="/archive/characters" className="hover:text-foreground transition-colors">
            Characters
          </Link>
          <span>/</span>
          <span className="text-foreground">{character.name}</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Edit character</h1>
        <p className="text-sm text-muted-foreground">
          Update canon profile details.
        </p>
        {!character.wizardData && (
          <div className="mt-3 flex items-center gap-2 p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/30">
            <span className="text-sm text-purple-900 dark:text-purple-200">
              💡 Want deeper character development?
            </span>
            <Link
              href={`/archive/characters/${character.id}/wizard`}
              className="text-sm font-medium text-purple-700 dark:text-purple-300 hover:underline"
            >
              Complete Frank Daniel Wizard →
            </Link>
          </div>
        )}
        {character.wizardData && (
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            ✨ Character developed using Frank Daniel Method •
            <Link
              href={`/archive/characters/${character.id}/wizard`}
              className="text-sm text-muted-foreground hover:text-foreground underline"
            >
              Review or update wizard answers
            </Link>
          </div>
        )}
      </div>

      <form action={updateCharacter} className="space-y-5">
        <input type="hidden" name="id" value={character.id} />
        <input
          type="hidden"
          name="existingImageUrl"
          value={character.imageUrl || ""}
        />

        <label className="block text-sm font-medium">
          Name
          <input
            name="name"
            required
            defaultValue={character.name}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="e.g. Sao, Quinn"
          />
        </label>

        <label className="block text-sm font-medium">
          Title
          <input
            name="title"
            defaultValue={character.title || ""}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Role, archetype, or honorific"
          />
        </label>

        <ImageUpload
          name="image"
          label="Portrait"
          currentImageUrl={character.imageUrl}
          maxSizeMB={5}
        />

        <LocationSelector
          locations={locations}
          defaultValue={character.homeLocationId || undefined}
        />

        <label className="block text-sm font-medium">
          Tags
          <input
            name="tags"
            defaultValue={character.tags}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="faction, timeline, motif"
          />
        </label>

        <TraitSelector
          name="psychologyTraits"
          label="Psychology Traits"
          selectedTraits={character.psychologyTraits ? character.psychologyTraits.split(",").filter(Boolean) : []}
        />

        <label className="block text-sm font-medium">
          Bio
          <textarea
            name="bio"
            rows={6}
            defaultValue={character.bio || ""}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Canonical background and arc notes."
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:bg-foreground/90 hover:scale-[1.02] hover:shadow-lg transition-all whitespace-nowrap touch-manipulation"
          >
            Save changes
          </button>
          <Link
            href={`/archive/characters/${character.id}`}
            className="inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted hover:border-foreground/30 hover:scale-[1.02] hover:shadow-md transition-all whitespace-nowrap touch-manipulation"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
