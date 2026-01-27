import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { saveImageUpload } from "@/lib/uploads";
import { requireStory } from "@/lib/story";
import { requireRole } from "@/lib/auth";
import { LocationCreateForm } from "@/components/arc/LocationCreateForm";

async function createLocation(formData: FormData) {
  "use server";
  await requireRole("editor");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return;
  }

  const currentStory = await requireStory();

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

  let imageUrl: string | null = null;
  // Handle cropped image (data URL) first, then fall back to regular file upload
  if (imageData && typeof imageData === 'string' && imageData.startsWith('data:')) {
    imageUrl = await saveImageUpload(imageData, "location");
  } else if (imageFile instanceof File && imageFile.size > 0) {
    imageUrl = await saveImageUpload(imageFile, "location");
  }

  const location = await prisma.location.create({
    data: {
      name,
      summary: summary || null,
      overview: overview || null,
      imageUrl,
      tags,
      locationType,
      ...(parentLocationId && {
        parent: { connect: { id: parentLocationId } }
      }),
      iconType,
      iconData,
      story: { connect: { id: currentStory.id } },
    },
  });

  redirect(`/archive/locations/${location.id}`);
}

export default async function NewLocationPage() {
  await requireRole("editor");
  const currentStory = await requireStory();
  
  // Fetch all locations for parent selection
  const allLocations = await prisma.location.findMany({
    where: { storyId: currentStory.id },
    select: {
      id: true,
      name: true,
      locationType: true,
    },
    orderBy: { name: "asc" },
  });

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

      <LocationCreateForm
        allLocations={allLocations}
        createAction={createLocation}
      />
    </div>
  );
}
