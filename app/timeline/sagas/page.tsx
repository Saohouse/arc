import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentStory } from "@/lib/story";
import { RoleGate } from "@/components/arc/RoleGate";

export default async function SagasPage() {
  const currentStory = await getCurrentStory();
  const sagas = await prisma.saga.findMany({
    where: { storyId: currentStory.id },
    orderBy: { number: "asc" },
    include: {
      _count: {
        select: { arcs: true },
      },
    },
  });

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm text-muted-foreground">Timeline</div>
          <h1 className="text-3xl font-semibold">📚 Sagas & Seasons</h1>
          <p className="text-sm text-muted-foreground">
            Organize your arcs into seasons, phases, or story sagas.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/timeline"
            className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to Timeline
          </Link>
          <RoleGate allowedRoles={["editor", "admin"]}>
            <Link
              href="/timeline/sagas/new"
              className="rounded bg-foreground px-5 py-2.5 text-[13px] font-medium text-background hover:bg-foreground/90 transition-colors"
            >
              New Saga
            </Link>
          </RoleGate>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded border p-4">
          <div className="text-2xl font-bold">{sagas.length}</div>
          <div className="text-xs text-muted-foreground">Total Sagas</div>
        </div>
        <div className="rounded border p-4">
          <div className="text-2xl font-bold">
            {sagas.filter((s) => s.status === "active").length}
          </div>
          <div className="text-xs text-muted-foreground">Active</div>
        </div>
        <div className="rounded border p-4">
          <div className="text-2xl font-bold">
            {sagas.reduce((sum, s) => sum + s._count.arcs, 0)}
          </div>
          <div className="text-xs text-muted-foreground">Total Arcs</div>
        </div>
      </div>

      {/* Sagas List */}
      {sagas.length === 0 ? (
        <div className="rounded border border-dashed p-12 text-center text-sm text-muted-foreground">
          No sagas yet. Create your first saga to organize your story arcs into seasons or phases.
        </div>
      ) : (
        <div className="space-y-3">
          {sagas.map((saga) => (
            <Link
              key={saga.id}
              href={`/timeline/sagas/${saga.id}`}
              className="block rounded border p-5 transition-all hover:border-foreground/40 hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-muted-foreground">
                      #{saga.number}
                    </span>
                    <h3 className="text-lg font-semibold">{saga.name}</h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(saga.status)}`}
                    >
                      {saga.status.charAt(0).toUpperCase() + saga.status.slice(1)}
                    </span>
                  </div>
                  {saga.description && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {saga.description}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <span>🎯 {saga._count.arcs} arcs</span>
                    {saga.startDate && (
                      <span>
                        📅 Start: {new Date(saga.startDate).toLocaleDateString()}
                      </span>
                    )}
                    {saga.endDate && (
                      <span>
                        🏁 End: {new Date(saga.endDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                {saga.color && (
                  <div
                    className="h-12 w-12 rounded flex-shrink-0"
                    style={{ backgroundColor: saga.color }}
                  />
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
