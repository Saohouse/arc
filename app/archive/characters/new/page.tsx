import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { saveImageUpload } from "@/lib/uploads";
import { requireStory } from "@/lib/story";
import { LocationSelector } from "@/components/arc/LocationSelector";
import { requireRole } from "@/lib/auth";
import { ImageUpload } from "@/components/arc/ImageUpload";
import { TraitSelector } from "@/components/arc/TraitSelector";
import { Sparkles, Zap } from "lucide-react";

async function createCharacter(formData: FormData) {
  "use server";
  await requireRole("editor");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return;
  }

  const currentStory = await requireStory();

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
      psychologyTraits,
      homeLocationId: homeLocationId || null,
      storyId: currentStory.id,
    },
  });

  redirect(`/archive/characters/${character.id}`);
}

export default async function NewCharacterPage() {
  await requireRole("editor");
  const currentStory = await requireStory();
  
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

      {/* Choice between Quick Create and Wizard */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/archive/characters/new/wizard"
          className="group relative overflow-hidden rounded-lg border p-6 transition-all hover:border-purple-500 hover:shadow-lg"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <h3 className="font-semibold">Character Wizard</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Use the Frank Daniel Method to develop any character type through systematic questioning.
            </p>
            <div className="text-xs text-muted-foreground">
              ✓ Works for all character types<br />
              ✓ 11 sections, 80+ questions<br />
              ✓ Auto-save & resume later
            </div>
          </div>
        </Link>

        <div className="rounded-lg border p-6 bg-card">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-semibold">Quick Create</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Fill in basic information and create your character immediately.
          </p>
          <div className="text-xs text-muted-foreground mb-4">
            ✓ Fast and simple<br />
            ✓ Essential fields only<br />
            ✓ Add details later
          </div>
        </div>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Quick Create Form</span>
        </div>
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

        <ImageUpload
          name="image"
          label="Portrait"
          maxSizeMB={5}
        />

        <label className="block text-sm font-medium">
          Tags
          <input
            name="tags"
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="faction, timeline, motif"
          />
        </label>

        <TraitSelector
          name="psychologyTraits"
          label="Psychology Traits"
          selectedTraits={[]}
        />

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
