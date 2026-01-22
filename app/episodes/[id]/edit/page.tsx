import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { saveImageUpload } from "@/lib/uploads";
import { requireRole } from "@/lib/auth";
import { ImageUpload } from "@/components/arc/ImageUpload";

async function updateEpisode(formData: FormData) {
  "use server";
  await requireRole("editor");

  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const episodeNumber = Number(formData.get("episodeNumber") ?? "0");
  if (!title || episodeNumber <= 0 || !id) {
    return;
  }

  const description = String(formData.get("description") ?? "").trim();
  const script = String(formData.get("script") ?? "").trim();
  const status = String(formData.get("status") ?? "draft");
  const publishDateStr = String(formData.get("publishDate") ?? "");
  const instagramUrl = String(formData.get("instagramUrl") ?? "").trim();
  const duration = Number(formData.get("duration") ?? "0") || null;

  let thumbnailUrl = String(formData.get("existingThumbnail") ?? "");
  const thumbnailFile = formData.get("thumbnail");
  if (thumbnailFile instanceof File && thumbnailFile.size > 0) {
    const uploadedPath = await saveImageUpload(thumbnailFile, "episode");
    if (uploadedPath) {
      thumbnailUrl = uploadedPath;
    }
  }

  await prisma.episode.update({
    where: { id },
    data: {
      title,
      episodeNumber,
      description: description || null,
      script: script || null,
      status,
      publishDate: publishDateStr ? new Date(publishDateStr) : null,
      instagramUrl: instagramUrl || null,
      thumbnailUrl: thumbnailUrl || null,
      duration,
    },
  });

  redirect(`/episodes/${id}`);
}

type EditEpisodePageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditEpisodePage({
  params,
}: EditEpisodePageProps) {
  await requireRole("editor");
  const { id } = await params;
  const episode = await prisma.episode.findUnique({ where: { id } });

  if (!episode) {
    notFound();
  }

  const publishDateStr = episode.publishDate
    ? episode.publishDate.toISOString().split("T")[0]
    : "";

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <div className="text-sm text-muted-foreground">
          Episodes / EP {episode.episodeNumber.toString().padStart(2, "0")}
        </div>
        <h1 className="text-3xl font-semibold">Edit episode</h1>
      </div>

      <form action={updateEpisode} className="space-y-6">
        <input type="hidden" name="id" value={episode.id} />
        <input
          type="hidden"
          name="existingThumbnail"
          value={episode.thumbnailUrl || ""}
        />

        <div className="grid gap-6 md:grid-cols-2">
          <label className="block text-sm font-medium">
            Episode Number
            <input
              name="episodeNumber"
              type="number"
              required
              defaultValue={episode.episodeNumber}
              min="1"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </label>

          <label className="block text-sm font-medium">
            Status
            <select
              name="status"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              defaultValue={episode.status}
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
            defaultValue={episode.title}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="e.g. The Beginning, Discovery, The Chase"
          />
        </label>

        <label className="block text-sm font-medium">
          Description
          <textarea
            name="description"
            rows={2}
            defaultValue={episode.description || ""}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Brief summary of this episode..."
          />
        </label>

        <label className="block text-sm font-medium">
          Script / Content
          <textarea
            name="script"
            rows={8}
            defaultValue={episode.script || ""}
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
              defaultValue={episode.duration || ""}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="60"
            />
          </label>

          <label className="block text-sm font-medium md:col-span-2">
            Publish Date
            <input
              name="publishDate"
              type="date"
              defaultValue={publishDateStr}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </label>
        </div>

        <label className="block text-sm font-medium">
          Instagram URL
          <input
            name="instagramUrl"
            type="url"
            defaultValue={episode.instagramUrl || ""}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="https://instagram.com/p/..."
          />
        </label>

        <div>
          <ImageUpload
            name="thumbnail"
            label="Thumbnail"
            maxSizeMB={5}
          />
          {episode.thumbnailUrl && (
            <div className="mt-2 text-xs text-muted-foreground">
              Current: {episode.thumbnailUrl.split('/').pop()}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="rounded bg-foreground px-5 py-2.5 text-[13px] font-medium text-background hover:bg-foreground/90 transition-colors"
          >
            Save changes
          </button>
          <Link
            href={`/episodes/${episode.id}`}
            className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
