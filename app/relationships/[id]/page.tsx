import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DeleteButton } from "@/components/arc/DeleteButton";
import { RoleGate } from "@/components/arc/RoleGate";
import { requireRole } from "@/lib/auth";

async function deleteRelationship(formData: FormData) {
  "use server";
  await requireRole("editor");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.relationship.delete({ where: { id } });
  redirect("/relationships");
}

type RelationshipPageProps = {
  params: Promise<{ id: string }>;
};

export default async function RelationshipPage({
  params,
}: RelationshipPageProps) {
  const { id } = await params;
  const relationship = await prisma.relationship.findUnique({
    where: { id },
  });

  if (!relationship) {
    notFound();
  }

  // Fetch source and target entities
  const getEntity = async (type: string, id: string) => {
    switch (type) {
      case "character":
        return prisma.character.findUnique({ where: { id } });
      case "world":
        return prisma.world.findUnique({ where: { id } });
      case "location":
        return prisma.location.findUnique({ where: { id } });
      case "object":
        return prisma.object.findUnique({ where: { id } });
      default:
        return null;
    }
  };

  const [sourceEntity, targetEntity] = await Promise.all([
    getEntity(relationship.sourceType, relationship.sourceId),
    getEntity(relationship.targetType, relationship.targetId),
  ]);

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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm text-muted-foreground">Relationships</div>
          <h1 className="text-3xl font-semibold">Relationship</h1>
        </div>
        <div className="flex items-center gap-3">
          <RoleGate allowedRoles={["editor", "admin"]}>
            <Link
              href={`/relationships/${relationship.id}/edit`}
              className="rounded bg-foreground px-5 py-2.5 text-[13px] font-medium text-background hover:bg-foreground/90 transition-colors"
            >
              Edit
            </Link>
            <DeleteButton
              id={relationship.id}
              name="this relationship"
              action={deleteRelationship}
            />
          </RoleGate>
          <Link
            href="/relationships"
            className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to list
          </Link>
        </div>
      </div>

      <div className="rounded-lg border p-6">
        <div className="flex items-center gap-4 text-lg">
          <div className="text-center">
            <div className="text-2xl">
              {getEntityEmoji(relationship.sourceType)}
            </div>
            <Link
              href={`/archive/${relationship.sourceType}s/${relationship.sourceId}`}
              className="mt-1 font-semibold hover:underline"
            >
              {sourceEntity?.name || "Unknown"}
            </Link>
            <div className="text-xs text-muted-foreground">
              {relationship.sourceType}
            </div>
          </div>

          <div className="flex-1 text-center">
            <div className="text-muted-foreground">→</div>
            <div className="mt-2 rounded bg-muted px-3 py-1 text-sm font-medium">
              {relationship.type}
            </div>
          </div>

          <div className="text-center">
            <div className="text-2xl">
              {getEntityEmoji(relationship.targetType)}
            </div>
            <Link
              href={`/archive/${relationship.targetType}s/${relationship.targetId}`}
              className="mt-1 font-semibold hover:underline"
            >
              {targetEntity?.name || "Unknown"}
            </Link>
            <div className="text-xs text-muted-foreground">
              {relationship.targetType}
            </div>
          </div>
        </div>

        {relationship.notes ? (
          <div className="mt-6 rounded bg-muted p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Notes
            </div>
            <p className="mt-2 text-sm">{relationship.notes}</p>
          </div>
        ) : null}

        <div className="mt-6 text-xs text-muted-foreground">
          <div>Created {relationship.createdAt.toLocaleDateString()}</div>
          <div>Updated {relationship.updatedAt.toLocaleDateString()}</div>
        </div>
      </div>
    </div>
  );
}
