import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { setCurrentStory } from "@/lib/story";
import { getCurrentUser } from "@/lib/auth";

async function createStory(formData: FormData) {
  "use server";

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return;
  }

  const description = String(formData.get("description") ?? "").trim();

  // Create story and add creator as owner in a transaction
  const story = await prisma.story.create({
    data: {
      name,
      description: description || null,
      members: {
        create: {
          userId: currentUser.id,
          role: "owner",
          viewedAt: new Date(), // Mark as viewed immediately for creator
        },
      },
    },
  });

  // Set as current story
  await setCurrentStory(story.id);

  redirect("/");
}

export default function NewStoryPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="w-full max-w-2xl space-y-12">
        {/* Header with ARC branding */}
        <div className="text-center space-y-4">
          <div className="text-5xl font-bold tracking-tight">ARC</div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            Archive · Relationships · Continuity
          </div>
        </div>

        {/* Form Card */}
        <div className="rounded-lg border bg-card p-8 shadow-sm space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-semibold tracking-tight">Create Your Story</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Start building your universe
            </p>
          </div>

          <form action={createStory} className="space-y-6">
            <label className="block">
              <span className="text-sm font-medium">Story Name</span>
              <input
                name="name"
                required
                className="mt-2 w-full rounded-md border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
                placeholder="e.g. The Archive Chronicles, My Fantasy World"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium">Description</span>
              <textarea
                name="description"
                rows={4}
                className="mt-2 w-full rounded-md border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
                placeholder="Brief description of your story universe (optional)"
              />
            </label>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-4">
              <button
                type="submit"
                className="w-full sm:w-auto rounded-lg bg-foreground px-8 py-3 text-sm font-semibold text-background hover:bg-foreground/90 transition-colors shadow-sm"
              >
                Create Story
              </button>
              <Link
                href="/"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>

        {/* Help text */}
        <p className="text-center text-xs text-muted-foreground">
          You can create multiple stories and switch between them anytime
        </p>
      </div>
    </div>
  );
}
