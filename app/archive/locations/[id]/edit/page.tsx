import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { saveImageUpload } from "@/lib/uploads";
import { requireRole } from "@/lib/auth";
import { ImageUpload } from "@/components/arc/ImageUpload";

async function updateLocation(formData: FormData) {
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
  let imageUrl = String(formData.get("existingImageUrl") ?? "");

  if (imageFile instanceof File && imageFile.size > 0) {
    const uploadedPath = await saveImageUpload(imageFile, "location");
    if (uploadedPath) {
      imageUrl = uploadedPath;
    }
  }

  await prisma.location.update({
    where: { id },
    data: {
      name,
      summary: summary || null,
      imageUrl: imageUrl || null,
      overview: overview || null,
      tags,
    },
  });

  redirect(`/archive/locations/${id}`);
}

type EditLocationPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditLocationPage({
  params,
}: EditLocationPageProps) {
  await requireRole("editor");
  const { id } = await params;
  const location = await prisma.location.findUnique({ where: { id } });

  if (!location) {
    notFound();
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <div className="text-sm text-muted-foreground">
          Archive / Locations / {location.name}
        </div>
        <h1 className="text-3xl font-semibold">Edit location</h1>
        <p className="text-sm text-muted-foreground">
          Update location setting details.
        </p>
      </div>

      <form action={updateLocation} className="space-y-5">
        <input type="hidden" name="id" value={location.id} />
        <input
          type="hidden"
          name="existingImageUrl"
          value={location.imageUrl || ""}
        />

        <label className="block text-sm font-medium">
          Name
          <input
            name="name"
            required
            defaultValue={location.name}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="e.g. The Archive, Sao's Apartment"
          />
        </label>

        <label className="block text-sm font-medium">
          Summary
          <input
            name="summary"
            defaultValue={location.summary || ""}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="One-line descriptor"
          />
        </label>

        <div>
          <ImageUpload
            name="image"
            label="Location Image"
            maxSizeMB={5}
          />
          {location.imageUrl && (
            <div className="mt-2 text-xs text-muted-foreground">
              Current: {location.imageUrl.split('/').pop()}
            </div>
          )}
        </div>

        <label className="block text-sm font-medium">
          Tags
          <input
            name="tags"
            defaultValue={location.tags}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="city, building, landmark"
          />
        </label>

        <label className="block text-sm font-medium">
          Overview
          <textarea
            name="overview"
            rows={6}
            defaultValue={location.overview || ""}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Location description, significance, atmosphere."
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
            href={`/archive/locations/${location.id}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
