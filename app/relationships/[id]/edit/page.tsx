import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStory } from "@/lib/story";
import { requireRole } from "@/lib/auth";

async function updateRelationship(formData: FormData) {
  "use server";
  await requireRole("editor");

  const id = String(formData.get("id") ?? "");
  const type = String(formData.get("type") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!id || !type) {
    return;
  }

  await prisma.relationship.update({
    where: { id },
    data: {
      type,
      notes: notes || null,
    },
  });

  redirect(`/relationships/${id}`);
}

type EditRelationshipPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditRelationshipPage({
  params,
}: EditRelationshipPageProps) {
  await requireRole("editor");
  const { id } = await params;
  const relationship = await prisma.relationship.findUnique({ where: { id } });

  if (!relationship) {
    notFound();
  }

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

  // Get source and target entity names
  const getEntityName = (type: string, id: string) => {
    let items: { id: string; name: string }[] = [];
    switch (type) {
      case "character":
        items = characters;
        break;
      case "world":
        items = worlds;
        break;
      case "location":
        items = locations;
        break;
      case "object":
        items = objects;
        break;
    }
    return items.find((item) => item.id === id)?.name || "Unknown";
  };

  const getEntityEmoji = (type: string) => {
    switch (type) {
      case "character":
        return "👤";
      case "world":
        return "🌍";
      case "location":
        return "📍";
      case "object":
        return "🔮";
      default:
        return "❓";
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <div className="text-sm text-muted-foreground">
          Relationships / Edit
        </div>
        <h1 className="text-3xl font-semibold">Edit relationship</h1>
      </div>

      <div className="rounded border p-4 bg-muted/50">
        <div className="flex items-center gap-4 text-sm">
          <div>
            {getEntityEmoji(relationship.sourceType)}{" "}
            <span className="font-semibold">
              {getEntityName(relationship.sourceType, relationship.sourceId)}
            </span>
          </div>
          <span className="text-muted-foreground">→</span>
          <div>
            {getEntityEmoji(relationship.targetType)}{" "}
            <span className="font-semibold">
              {getEntityName(relationship.targetType, relationship.targetId)}
            </span>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Source and target entities cannot be changed
        </p>
      </div>

      <form action={updateRelationship} className="space-y-5">
        <input type="hidden" name="id" value={relationship.id} />

        <label className="block text-sm font-medium">
          Relationship Type
          <input
            name="type"
            required
            defaultValue={relationship.type}
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
            defaultValue={relationship.notes || ""}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Optional context about this relationship..."
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
            href={`/relationships/${relationship.id}`}
            className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
