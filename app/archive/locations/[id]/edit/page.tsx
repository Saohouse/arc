import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { saveImageUpload } from "@/lib/uploads";
import { requireRole } from "@/lib/auth";
import { LocationEditForm } from "@/components/arc/LocationEditForm";

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
  
  const iconType = String(formData.get("iconType") ?? "emoji");
  const iconData = String(formData.get("iconData") ?? "📍");

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
      iconType,
      iconData,
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

      <LocationEditForm
        location={location}
        allLocations={allLocations}
        updateAction={updateLocation}
      />
    </div>
  );
}
