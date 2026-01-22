import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStory } from "@/lib/story";
import { saveImageUpload } from "@/lib/uploads";
import { requireRole } from "@/lib/auth";

async function createEpisode(formData: FormData) {
  "use server";
  await requireRole("editor");

  const title = String(formData.get("title") ?? "").trim();
  const episodeNumber = Number(formData.get("episodeNumber") ?? "0");
  if (!title || episodeNumber <= 0) {
    return;
  }

  const currentStory = await requireStory();

  const description = String(formData.get("description") ?? "").trim();
  const script = String(formData.get("script") ?? "").trim();
  const status = String(formData.get("status") ?? "draft");
  const publishDateStr = String(formData.get("publishDate") ?? "");
  const instagramUrl = String(formData.get("instagramUrl") ?? "").trim();
  const duration = Number(formData.get("duration") ?? "0") || null;

  const thumbnailFile = formData.get("thumbnail");
  const thumbnailUrl =
    thumbnailFile instanceof File && thumbnailFile.size > 0
      ? await saveImageUpload(thumbnailFile, "episode")
      : null;

  const episode = await prisma.episode.create({
    data: {
      title,
      episodeNumber,
      description: description || null,
      script: script || null,
      status,
      publishDate: publishDateStr ? new Date(publishDateStr) : null,
      instagramUrl: instagramUrl || null,
      thumbnailUrl,
      duration,
      storyId: currentStory.id,
    },
  });

  redirect(`/episodes/${episode.id}`);
}

export default async function NewEpisodePage() {
  await requireRole("editor");
  const currentStory = await requireStory();

  // Get the next episode number
  const lastEpisode = await prisma.episode.findFirst({
    where: { storyId: currentStory.id },
    orderBy: { episodeNumber: "desc" },
  });
  const nextEpisodeNumber = (lastEpisode?.episodeNumber ?? 0) + 1;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <div className="text-sm text-muted-foreground">Episodes</div>
        <h1 className="text-3xl font-semibold">New episode</h1>
        <p className="text-sm text-muted-foreground">
          Create a new story episode for your Instagram content.
        </p>
      </div>

      <form action={createEpisode} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <label className="block text-sm font-medium">
            Episode Number
            <input
              name="episodeNumber"
              type="number"
              required
              defaultValue={nextEpisodeNumber}
              min="1"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </label>

          <label className="block text-sm font-medium">
            Status
            <select
              name="status"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              defaultValue="draft"
            >
              <option value="draft">Draft</option>
              <option value="review">In Review</option>
              <option value="published">Published</option>
            </select>
          </label>
        </div>

        <label className="block text-sm font-medium">
          Title
          <input
            name="title"
            required
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="e.g. The Beginning, Discovery, The Chase"
          />
        </label>

        <label className="block text-sm font-medium">
          Description
          <textarea
            name="description"
            rows={2}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Brief summary of this episode..."
          />
        </label>

        <label className="block text-sm font-medium">
          Script / Content
          <textarea
            name="script"
            rows={8}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm font-mono"
            placeholder="Write your episode script, dialogue, or content here..."
          />
          <p className="mt-1 text-xs text-muted-foreground">
            The full script or content for this episode
          </p>
        </label>

        <div className="grid gap-6 md:grid-cols-3">
          <label className="block text-sm font-medium">
            Duration (seconds)
            <input
              name="duration"
              type="number"
              min="1"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="60"
            />
          </label>

          <label className="block text-sm font-medium md:col-span-2">
            Publish Date
            <input
              name="publishDate"
              type="date"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </label>
        </div>

        <label className="block text-sm font-medium">
          Instagram URL
          <input
            name="instagramUrl"
            type="url"
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="https://instagram.com/p/..."
          />
        </label>

        <label className="block text-sm font-medium">
          Thumbnail (JPG or PNG)
          <input
            name="thumbnail"
            type="file"
            accept="image/jpeg,image/png"
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="rounded bg-foreground px-5 py-2.5 text-[13px] font-medium text-background hover:bg-foreground/90 transition-colors"
          >
            Create episode
          </button>
          <Link
            href="/episodes"
            className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
