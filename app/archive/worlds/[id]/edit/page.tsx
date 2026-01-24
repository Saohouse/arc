import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { saveImageUpload } from "@/lib/uploads";
import { requireRole } from "@/lib/auth";
import { ImageUpload } from "@/components/arc/ImageUpload";

async function updateWorld(formData: FormData) {
  "use server";
  await requireRole("editor");

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!name || !id) {
    return;
  }

  const summary = String(formData.get("summary") ?? "").trim();
  const overview = String(formData.get("overview") ?? "").trim();
  const tagsRaw = String(formData.get("tags") ?? "").trim();
  const tags = tagsRaw
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .join(",");

  const imageFile = formData.get("image");
  const imageData = formData.get("image_data"); // Cropped image data URL
  let imageUrl = String(formData.get("existingImageUrl") ?? "");

  // Handle cropped image (data URL) or regular file upload
  if (imageData && typeof imageData === 'string' && imageData.startsWith('data:')) {
    const uploadedPath = await saveImageUpload(imageData, "world");
    if (uploadedPath) {
      imageUrl = uploadedPath;
    }
  } else if (imageFile instanceof File && imageFile.size > 0) {
    const uploadedPath = await saveImageUpload(imageFile, "world");
    if (uploadedPath) {
      imageUrl = uploadedPath;
    }
  }

  await prisma.world.update({
    where: { id },
    data: {
      name,
      summary: summary || null,
      imageUrl: imageUrl || null,
      overview: overview || null,
      tags,
    },
  });

  redirect(`/archive/worlds/${id}`);
}

type EditWorldPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditWorldPage({ params }: EditWorldPageProps) {
  await requireRole("editor");
  const { id } = await params;
  const world = await prisma.world.findUnique({ where: { id } });

  if (!world) {
    notFound();
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <div className="text-sm text-muted-foreground">
          Archive / Worlds / {world.name}
        </div>
        <h1 className="text-3xl font-semibold">Edit world</h1>
        <p className="text-sm text-muted-foreground">
          Update world setting details.
        </p>
      </div>

      <form action={updateWorld} className="space-y-5">
        <input type="hidden" name="id" value={world.id} />
        <input
          type="hidden"
          name="existingImageUrl"
          value={world.imageUrl || ""}
        />

        <label className="block text-sm font-medium">
          Name
          <input
            name="name"
            required
            defaultValue={world.name}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="e.g. Neo Seoul, The Archive"
          />
        </label>

        <label className="block text-sm font-medium">
          Summary
          <input
            name="summary"
            defaultValue={world.summary || ""}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="One-line descriptor"
          />
        </label>

        <ImageUpload
          name="image"
          label="Cover Image"
          currentImageUrl={world.imageUrl}
          maxSizeMB={5}
        />

        <label className="block text-sm font-medium">
          Tags
          <input
            name="tags"
            defaultValue={world.tags}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="genre, theme, era"
          />
        </label>

        <label className="block text-sm font-medium">
          Overview
          <textarea
            name="overview"
            rows={6}
            defaultValue={world.overview || ""}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="World rules, history, atmosphere."
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90"
          >
            Save changes
          </button>
          <Link
            href={`/archive/worlds/${world.id}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
