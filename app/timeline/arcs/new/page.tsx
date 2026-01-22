import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentStory } from "@/lib/story";
import { requireRole } from "@/lib/auth";

async function createArc(formData: FormData) {
  "use server";
  await requireRole("editor");

  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  if (!name || !type) {
    return;
  }

  const currentStory = await getCurrentStory();

  const description = String(formData.get("description") ?? "").trim();
  const status = String(formData.get("status") ?? "planning");
  const startEpisodeNumber =
    Number(formData.get("startEpisodeNumber") ?? "0") || null;
  const endEpisodeNumber =
    Number(formData.get("endEpisodeNumber") ?? "0") || null;
  const color = String(formData.get("color") ?? "").trim();
  const characterId = String(formData.get("characterId") ?? "").trim() || null;
  const locationId = String(formData.get("locationId") ?? "").trim() || null;
  const sagaId = String(formData.get("sagaId") ?? "").trim() || null;

  await prisma.arc.create({
    data: {
      name,
      type,
      description: description || null,
      status,
      startEpisodeNumber,
      endEpisodeNumber,
      color: color || null,
      characterId,
      locationId,
      sagaId,
      storyId: currentStory.id,
    },
  });

  redirect("/timeline");
}

export default async function NewArcPage() {
  await requireRole("editor");
  const currentStory = await getCurrentStory();

  const [episodes, characters, locations, sagas] = await Promise.all([
    prisma.episode.findMany({
      where: { storyId: currentStory.id },
      orderBy: { episodeNumber: "asc" },
      select: { id: true, episodeNumber: true, title: true },
    }),
    prisma.character.findMany({
      where: { storyId: currentStory.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.location.findMany({
      where: { storyId: currentStory.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.saga.findMany({
      where: { storyId: currentStory.id },
      orderBy: { number: "asc" },
      select: { id: true, name: true, number: true },
    }),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <div className="text-sm text-muted-foreground">Timeline / Arcs</div>
        <h1 className="text-3xl font-semibold">New arc</h1>
        <p className="text-sm text-muted-foreground">
          Create a story arc to track character journeys or plot threads across
          episodes.
        </p>
      </div>

      <form action={createArc} className="space-y-6">
        <label className="block text-sm font-medium">
          Arc Name
          <input
            name="name"
            required
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="e.g. Jin's Hero Journey, The Artifact Mystery"
          />
        </label>

        <div className="grid gap-6 md:grid-cols-3">
          <label className="block text-sm font-medium">
            Arc Type
            <select
              name="type"
              required
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              defaultValue=""
            >
              <option value="" disabled>
                Select type...
              </option>
              <option value="character">Character Arc</option>
              <option value="plot">Plot Arc</option>
              <option value="location">Location Arc</option>
            </select>
          </label>

          <label className="block text-sm font-medium">
            Status
            <select
              name="status"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              defaultValue="planning"
            >
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="resolved">Resolved</option>
            </select>
          </label>

          <label className="block text-sm font-medium">
            Saga/Season
            <select
              name="sagaId"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              defaultValue=""
            >
              <option value="">None</option>
              {sagas.map((saga) => (
                <option key={saga.id} value={saga.id}>
                  #{saga.number} - {saga.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block text-sm font-medium">
          Description
          <textarea
            name="description"
            rows={3}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Describe what happens in this arc..."
          />
        </label>

        <div className="grid gap-6 md:grid-cols-2">
          <label className="block text-sm font-medium">
            Start Episode
            <select
              name="startEpisodeNumber"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              defaultValue=""
            >
              <option value="">Not set</option>
              {episodes.map((ep) => (
                <option key={ep.id} value={ep.episodeNumber}>
                  EP {ep.episodeNumber.toString().padStart(2, "0")} -{" "}
                  {ep.title}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium">
            End Episode
            <select
              name="endEpisodeNumber"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              defaultValue=""
            >
              <option value="">Not set</option>
              {episodes.map((ep) => (
                <option key={ep.id} value={ep.episodeNumber}>
                  EP {ep.episodeNumber.toString().padStart(2, "0")} -{" "}
                  {ep.title}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Optional: Link to character or location */}
        <div className="rounded border p-4 bg-muted/50">
          <h3 className="text-sm font-semibold mb-3">Link to Entity (Optional)</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm">
              Character
              <select
                name="characterId"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                defaultValue=""
              >
                <option value="">None</option>
                {characters.map((char) => (
                  <option key={char.id} value={char.id}>
                    {char.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              Location
              <select
                name="locationId"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                defaultValue=""
              >
                <option value="">None</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            For character arcs, select the character. For location arcs, select
            the location.
          </p>
        </div>

        <label className="block text-sm font-medium">
          Color (for visualization)
          <input
            name="color"
            type="color"
            className="mt-1 h-10 w-full rounded-md border bg-background"
            defaultValue="#3b82f6"
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="rounded bg-foreground px-5 py-2.5 text-[13px] font-medium text-background hover:bg-foreground/90 transition-colors"
          >
            Create arc
          </button>
          <Link
            href="/timeline"
            className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
