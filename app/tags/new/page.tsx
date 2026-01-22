import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStory } from "@/lib/story";
import { ColorPicker } from "@/components/arc/ColorPicker";
import { requireRole } from "@/lib/auth";

async function createTag(formData: FormData) {
  "use server";
  await requireRole("editor");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const currentStory = await requireStory();

  const color = String(formData.get("color") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;

  // Check if tag already exists
  const existing = await prisma.tag.findUnique({
    where: {
      storyId_name: {
        storyId: currentStory.id,
        name,
      },
    },
  });

  if (existing) {
    // Update existing tag
    await prisma.tag.update({
      where: { id: existing.id },
      data: { color, description },
    });
  } else {
    // Create new tag
    await prisma.tag.create({
      data: {
        name,
        color,
        description,
        storyId: currentStory.id,
      },
    });
  }

  redirect("/tags");
}

type NewTagPageProps = {
  searchParams: Promise<{ name?: string }>;
};

export default async function NewTagPage({ searchParams }: NewTagPageProps) {
  await requireRole("editor");
  const params = await searchParams;
  const suggestedName = params.name || "";

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <div className="text-sm text-muted-foreground">Tags</div>
        <h1 className="text-3xl font-semibold">Create custom tag</h1>
        <p className="text-sm text-muted-foreground">
          Define a custom color and description for this tag.
        </p>
      </div>

      <form action={createTag} className="space-y-6">
        <label className="block text-sm font-medium">
          Tag Name
          <input
            name="name"
            required
            defaultValue={suggestedName}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="e.g. protagonist, villain, cyberpunk"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Lowercase recommended for consistency
          </p>
        </label>

        <label className="block text-sm font-medium">
          Custom Color
          <ColorPicker name="color" defaultValue="#3b82f6" />
          <p className="mt-1 text-xs text-muted-foreground">
            Leave default for auto-generated color
          </p>
        </label>

        <label className="block text-sm font-medium">
          Description (Optional)
          <textarea
            name="description"
            rows={3}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="What does this tag represent?"
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="rounded bg-foreground px-5 py-2.5 text-[13px] font-medium text-background hover:bg-foreground/90 transition-colors"
          >
            Create tag
          </button>
          <Link
            href="/tags"
            className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
