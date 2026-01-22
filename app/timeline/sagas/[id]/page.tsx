import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentStory } from "@/lib/story";
import { RoleGate } from "@/components/arc/RoleGate";
import { DeleteButton } from "@/components/arc/DeleteButton";
import { requireRole } from "@/lib/auth";

async function deleteSaga(sagaId: string) {
  "use server";
  await requireRole("editor");

  const currentStory = await getCurrentStory();

  await prisma.saga.deleteMany({
    where: { id: sagaId, storyId: currentStory.id },
  });

  redirect("/timeline/sagas");
}

export default async function SagaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const currentStory = await getCurrentStory();

  const saga = await prisma.saga.findFirst({
    where: { id, storyId: currentStory.id },
    include: {
      arcs: {
        orderBy: { startEpisodeNumber: "asc" },
      },
    },
  });

  if (!saga) {
    notFound();
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400";
      case "active":
        return "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400";
      case "planning":
        return "bg-gray-100 text-gray-700 dark:bg-gray-950/30 dark:text-gray-400";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-950/30 dark:text-gray-400";
    }
  };

  const getArcTypeColor = (type: string) => {
    switch (type) {
      case "character":
        return "bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400";
      case "plot":
        return "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400";
      case "location":
        return "bg-teal-100 text-teal-700 dark:bg-teal-950/30 dark:text-teal-400";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-950/30 dark:text-gray-400";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm text-muted-foreground">
            Timeline / <Link href="/timeline/sagas" className="hover:text-foreground transition-colors">Sagas</Link>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">
              #{saga.number}
            </span>
            <h1 className="text-3xl font-semibold">{saga.name}</h1>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(saga.status)}`}
            >
              {saga.status.charAt(0).toUpperCase() + saga.status.slice(1)}
            </span>
          </div>
        </div>
        <RoleGate allowedRoles={["editor", "admin"]}>
          <div className="flex items-center gap-3">
            <Link
              href={`/timeline/sagas/${saga.id}/edit`}
              className="rounded border px-4 py-2 text-[13px] hover:border-foreground/40 transition-colors"
            >
              Edit
            </Link>
            <DeleteButton
              itemName={saga.name}
              onDelete={async () => {
                "use server";
                await deleteSaga(saga.id);
              }}
            />
          </div>
        </RoleGate>
      </div>

      {/* Details Card */}
      <div className="rounded border p-6 space-y-4">
        {saga.color && (
          <div className="flex items-center gap-3">
            <div
              className="h-8 w-8 rounded"
              style={{ backgroundColor: saga.color }}
            />
            <span className="text-xs text-muted-foreground">Saga Color</span>
          </div>
        )}

        {saga.description && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Description</h3>
            <p className="mt-1 text-sm">{saga.description}</p>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {saga.startDate && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Start Date</h3>
              <p className="mt-1 text-sm">
                {new Date(saga.startDate).toLocaleDateString()}
              </p>
            </div>
          )}
          {saga.endDate && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">End Date</h3>
              <p className="mt-1 text-sm">
                {new Date(saga.endDate).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>

        <div>
          <h3 className="text-sm font-medium text-muted-foreground">Statistics</h3>
          <div className="mt-2 flex flex-wrap gap-4 text-sm">
            <span>🎯 {saga.arcs.length} arcs</span>
            <span>
              📖 Episodes{" "}
              {saga.arcs.length > 0
                ? `${Math.min(...saga.arcs.map((a) => a.startEpisodeNumber ?? Infinity))} - ${Math.max(...saga.arcs.map((a) => a.endEpisodeNumber ?? 0))}`
                : "N/A"}
            </span>
          </div>
        </div>
      </div>

      {/* Arcs in this Saga */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Arcs in This Saga</h2>
          <Link
            href="/timeline/arcs/new"
            className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Create New Arc →
          </Link>
        </div>

        {saga.arcs.length === 0 ? (
          <div className="rounded border border-dashed p-12 text-center text-sm text-muted-foreground">
            No arcs in this saga yet. Arcs can be assigned to this saga when creating or editing them.
          </div>
        ) : (
          <div className="space-y-3">
            {saga.arcs.map((arc) => (
              <Link
                key={arc.id}
                href={`/timeline/arcs/${arc.id}`}
                className="block rounded border p-4 transition-all hover:border-foreground/40 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium">{arc.name}</h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${getArcTypeColor(arc.type)}`}
                      >
                        {arc.type}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(arc.status)}`}
                      >
                        {arc.status}
                      </span>
                    </div>
                    {arc.description && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {arc.description}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {arc.startEpisodeNumber && (
                        <span>📖 Ep {arc.startEpisodeNumber}</span>
                      )}
                      {arc.endEpisodeNumber && (
                        <span>→ {arc.endEpisodeNumber}</span>
                      )}
                    </div>
                  </div>
                  {arc.color && (
                    <div
                      className="h-8 w-8 rounded flex-shrink-0"
                      style={{ backgroundColor: arc.color }}
                    />
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
