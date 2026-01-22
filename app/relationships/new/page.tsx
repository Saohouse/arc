import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStory } from "@/lib/story";
import { requireRole } from "@/lib/auth";

async function createRelationship(formData: FormData) {
  "use server";
  await requireRole("editor");

  const sourceType = String(formData.get("sourceType") ?? "");
  const sourceId = String(formData.get("sourceId") ?? "");
  const type = String(formData.get("type") ?? "").trim();
  const targetType = String(formData.get("targetType") ?? "");
  const targetId = String(formData.get("targetId") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();

  if (!sourceType || !sourceId || !type || !targetType || !targetId) {
    return;
  }

  const currentStory = await requireStory();

  await prisma.relationship.create({
    data: {
      sourceType,
      sourceId,
      type,
      targetType,
      targetId,
      notes: notes || null,
      storyId: currentStory.id,
    },
  });

  redirect("/relationships");
}

export default async function NewRelationshipPage() {
  await requireRole("editor");
  const currentStory = await requireStory();

  // Fetch all entities
  const [characters, worlds, locations, objects] = await Promise.all([
    prisma.character.findMany({
      where: { storyId: currentStory.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.world.findMany({
      where: { storyId: currentStory.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.location.findMany({
      where: { storyId: currentStory.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.object.findMany({
      where: { storyId: currentStory.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const entityGroups = [
    { type: "character", label: "👤 Characters", items: characters },
    { type: "world", label: "🌍 Worlds", items: worlds },
    { type: "location", label: "📍 Locations", items: locations },
    { type: "object", label: "🔮 Objects", items: objects },
  ];

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <div className="text-sm text-muted-foreground">Relationships</div>
        <h1 className="text-3xl font-semibold">New relationship</h1>
        <p className="text-sm text-muted-foreground">
          Create a connection between two entities.
        </p>
      </div>

      <form action={createRelationship} className="space-y-5">
        <div className="grid gap-5 md:grid-cols-2">
          {/* Source Entity */}
          <div className="space-y-3">
            <label className="block text-sm font-medium">Source Entity</label>
            <select
              name="sourceType"
              required
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              defaultValue=""
            >
              <option value="" disabled>
                Select type...
              </option>
              <option value="character">👤 Character</option>
              <option value="world">🌍 World</option>
              <option value="location">📍 Location</option>
              <option value="object">🔮 Object</option>
            </select>

            <select
              name="sourceId"
              required
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              defaultValue=""
            >
              <option value="" disabled>
                Select entity...
              </option>
              {entityGroups.map((group) => (
                <optgroup key={group.type} label={group.label}>
                  {group.items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Target Entity */}
          <div className="space-y-3">
            <label className="block text-sm font-medium">Target Entity</label>
            <select
              name="targetType"
              required
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              defaultValue=""
            >
              <option value="" disabled>
                Select type...
              </option>
              <option value="character">👤 Character</option>
              <option value="world">🌍 World</option>
              <option value="location">📍 Location</option>
              <option value="object">🔮 Object</option>
            </select>

            <select
              name="targetId"
              required
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              defaultValue=""
            >
              <option value="" disabled>
                Select entity...
              </option>
              {entityGroups.map((group) => (
                <optgroup key={group.type} label={group.label}>
                  {group.items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </div>

        <label className="block text-sm font-medium">
          Relationship Type
          <input
            name="type"
            required
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="e.g. allies, rivals, mentor, lives_in, owns, located_in"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Examples: allies, rivals, family, mentor, enemy, lives_in, works_at,
            owns, created_by, located_in
          </p>
        </label>

        <label className="block text-sm font-medium">
          Notes
          <textarea
            name="notes"
            rows={3}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Optional context about this relationship..."
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="rounded bg-foreground px-5 py-2.5 text-[13px] font-medium text-background hover:bg-foreground/90 transition-colors"
          >
            Create relationship
          </button>
          <Link
            href="/relationships"
            className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
