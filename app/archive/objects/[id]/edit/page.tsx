import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { saveImageUpload } from "@/lib/uploads";
import { requireRole } from "@/lib/auth";
import { ImageUpload } from "@/components/arc/ImageUpload";

async function updateObject(formData: FormData) {
  "use server";
  await requireRole("editor");

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!name || !id) {
    return;
  }

  const category = String(formData.get("category") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const tagsRaw = String(formData.get("tags") ?? "").trim();
  const tags = tagsRaw
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .join(",");

  const imageFile = formData.get("image");
  let imageUrl = String(formData.get("existingImageUrl") ?? "");

  if (imageFile instanceof File && imageFile.size > 0) {
    const uploadedPath = await saveImageUpload(imageFile, "object");
    if (uploadedPath) {
      imageUrl = uploadedPath;
    }
  }

  await prisma.object.update({
    where: { id },
    data: {
      name,
      category: category || null,
      imageUrl: imageUrl || null,
      description: description || null,
      tags,
    },
  });

  redirect(`/archive/objects/${id}`);
}

type EditObjectPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditObjectPage({ params }: EditObjectPageProps) {
  await requireRole("editor");
  const { id } = await params;
  const object = await prisma.object.findUnique({ where: { id } });

  if (!object) {
    notFound();
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <div className="text-sm text-muted-foreground">
          Archive / Objects / {object.name}
        </div>
        <h1 className="text-3xl font-semibold">Edit object</h1>
        <p className="text-sm text-muted-foreground">
          Update item details.
        </p>
      </div>

      <form action={updateObject} className="space-y-5">
        <input type="hidden" name="id" value={object.id} />
        <input
          type="hidden"
          name="existingImageUrl"
          value={object.imageUrl || ""}
        />

        <label className="block text-sm font-medium">
          Name
          <input
            name="name"
            required
            defaultValue={object.name}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="e.g. Neon Katana, Data Crystal"
          />
        </label>

        <label className="block text-sm font-medium">
          Category
          <input
            name="category"
            defaultValue={object.category || ""}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="weapon, tool, artifact, collectible"
          />
        </label>

        <ImageUpload
          name="image"
          label="Object Image"
          currentImageUrl={object.imageUrl}
          maxSizeMB={5}
        />

        <label className="block text-sm font-medium">
          Tags
          <input
            name="tags"
            defaultValue={object.tags}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="rare, magical, tech"
          />
        </label>

        <label className="block text-sm font-medium">
          Description
          <textarea
            name="description"
            rows={6}
            defaultValue={object.description || ""}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Lore, function, and canonical details."
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="rounded bg-foreground px-5 py-2.5 text-[13px] font-medium text-background hover:bg-foreground/90 transition-colors"
          >
            Save changes
          </button>
          <Link
            href={`/archive/objects/${object.id}`}
            className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
