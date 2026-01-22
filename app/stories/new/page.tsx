import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { setCurrentStory } from "@/lib/story";

async function createStory(formData: FormData) {
  "use server";

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return;
  }

  const description = String(formData.get("description") ?? "").trim();

  const story = await prisma.story.create({
    data: {
      name,
      description: description || null,
    },
  });

  // Set as current story
  await setCurrentStory(story.id);

  redirect("/");
}

export default function NewStoryPage() {
  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-4xl font-semibold tracking-tight">New Story</h1>
        <p className="mt-3 text-base text-muted-foreground tracking-tight">
          Create a new story/universe to organize your world-building.
        </p>
      </div>

      <form action={createStory} className="space-y-6">
        <label className="block">
          <span className="text-sm font-medium">Story Name</span>
          <input
            name="name"
            required
            className="mt-2 w-full rounded border bg-background px-4 py-2.5 text-sm"
            placeholder="e.g. Sao House World Story, The Archive Chronicles"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Description</span>
          <textarea
            name="description"
            rows={4}
            className="mt-2 w-full rounded border bg-background px-4 py-2.5 text-sm"
            placeholder="Brief description of this story/universe"
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="rounded bg-foreground px-5 py-2.5 text-[13px] font-medium text-background hover:bg-foreground/90 transition-colors"
          >
            Create Story
          </button>
          <Link
            href="/"
            className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
