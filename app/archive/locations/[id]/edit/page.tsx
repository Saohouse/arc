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

  const locationType = String(formData.get("locationType") ?? "").trim() || null;
  const parentLocationId = String(formData.get("parentLocationId") ?? "").trim() || null;

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
    const uploadedPath = await saveImageUpload(imageData, "location");
    if (uploadedPath) {
      imageUrl = uploadedPath;
    }
  } else if (imageFile instanceof File && imageFile.size > 0) {
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
      locationType,
      parentLocationId,
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
  const location = await prisma.location.findUnique({ 
    where: { id },
    include: {
      story: {
        select: { id: true }
      }
    }
  });

  if (!location) {
    notFound();
  }

  // Fetch all locations for parent selection (exclude self and descendants)
  const allLocations = await prisma.location.findMany({
    where: { 
      storyId: location.storyId,
      id: { not: location.id }
    },
    select: {
      id: true,
      name: true,
      locationType: true,
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-2xl space-y-6">
      <div className="space-y-3">
        {/* Back Button */}
        <Link
          href={`/archive/locations/${location.id}`}
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
          Back to {location.name}
        </Link>

        {/* Breadcrumb Navigation - Hidden on mobile */}
        <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/archive" className="hover:text-foreground transition-colors">
            Archive
          </Link>
          <span>/</span>
          <Link href="/archive/locations" className="hover:text-foreground transition-colors">
            Locations
          </Link>
          <span>/</span>
          <span className="text-foreground">{location.name}</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Edit location</h1>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <label className="block text-sm font-medium">
            Location Type
            <select
              name="locationType"
              defaultValue={location.locationType || ""}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="">Standalone location</option>
              <option value="country">🌍 Country</option>
              <option value="province">🏛️ Province</option>
              <option value="city">🏙️ City</option>
              <option value="town">🏘️ Town</option>
            </select>
          </label>

          <label className="block text-sm font-medium">
            Parent Location
            <select
              name="parentLocationId"
              defaultValue={location.parentLocationId || ""}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="">None (top-level)</option>
              {allLocations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.locationType === "country" && "🌍 "}
                  {loc.locationType === "province" && "🏛️ "}
                  {loc.locationType === "city" && "🏙️ "}
                  {loc.locationType === "town" && "🏘️ "}
                  {loc.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block text-sm font-medium">
          Summary
          <input
            name="summary"
            defaultValue={location.summary || ""}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="One-line descriptor"
          />
        </label>

        <ImageUpload
          name="image"
          label="Location Image"
          currentImageUrl={location.imageUrl}
          maxSizeMB={5}
        />

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
            className="inline-flex items-center justify-center rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:bg-foreground/90 hover:scale-[1.02] hover:shadow-lg transition-all whitespace-nowrap touch-manipulation"
          >
            Save changes
          </button>
          <Link
            href={`/archive/locations/${location.id}`}
            className="inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted hover:border-foreground/30 hover:scale-[1.02] hover:shadow-md transition-all whitespace-nowrap touch-manipulation"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
