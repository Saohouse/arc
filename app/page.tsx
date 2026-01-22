import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentStory } from "@/lib/story";
import { RoleGate } from "@/components/arc/RoleGate";

type ActivityItem = {
  id: string;
  type: "character" | "world" | "location" | "object";
  name: string;
  summary?: string | null;
  createdAt: Date;
};

export default async function HomePage() {
  const currentStory = await getCurrentStory();

  const [characters, worlds, locations, objects] = await Promise.all([
    prisma.character.findMany({
      where: { storyId: currentStory.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, title: true, createdAt: true },
    }),
    prisma.world.findMany({
      where: { storyId: currentStory.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, summary: true, createdAt: true },
    }),
    prisma.location.findMany({
      where: { storyId: currentStory.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, summary: true, createdAt: true },
    }),
    prisma.object.findMany({
      where: { storyId: currentStory.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, category: true, createdAt: true },
    }),
  ]);

  const [totalCharacters, totalWorlds, totalLocations, totalObjects] =
    await Promise.all([
      prisma.character.count({ where: { storyId: currentStory.id } }),
      prisma.world.count({ where: { storyId: currentStory.id } }),
      prisma.location.count({ where: { storyId: currentStory.id } }),
      prisma.object.count({ where: { storyId: currentStory.id } }),
    ]);

  // Merge all activity and sort by createdAt
  const activity: ActivityItem[] = [
    ...characters.map((c) => ({
      id: c.id,
      type: "character" as const,
      name: c.name,
      summary: c.title,
      createdAt: c.createdAt,
    })),
    ...worlds.map((w) => ({
      id: w.id,
      type: "world" as const,
      name: w.name,
      summary: w.summary,
      createdAt: w.createdAt,
    })),
    ...locations.map((l) => ({
      id: l.id,
      type: "location" as const,
      name: l.name,
      summary: l.summary,
      createdAt: l.createdAt,
    })),
    ...objects.map((o) => ({
      id: o.id,
      type: "object" as const,
      name: o.name,
      summary: o.category,
      createdAt: o.createdAt,
    })),
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 10);

  const typeConfig = {
    character: {
      label: "Character",
      emoji: "👤",
      href: (id: string) => `/archive/characters/${id}`,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/30",
    },
    world: {
      label: "World",
      emoji: "🌍",
      href: (id: string) => `/archive/worlds/${id}`,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-950/30",
    },
    location: {
      label: "Location",
      emoji: "📍",
      href: (id: string) => `/archive/locations/${id}`,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
    },
    object: {
      label: "Object",
      emoji: "🔮",
      href: (id: string) => `/archive/objects/${id}`,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/30",
    },
  };

  return (
    <div className="space-y-12">
      {/* Hero section */}
      <div className="space-y-3">
        <h1 className="text-5xl font-semibold tracking-tight">
          Archive · Relationships · Continuity
        </h1>
        <p className="text-base text-muted-foreground tracking-tight">
          Visual world-building and canon system for the Sao House universe
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Link
          href="/archive/characters"
          className="group rounded border bg-card p-8 transition-all hover:border-foreground/40 hover:shadow-sm"
        >
          <div className="text-4xl font-semibold tracking-tight">{totalCharacters}</div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-2">
            👤 {totalCharacters === 1 ? "Character" : "Characters"}
          </div>
        </Link>

        <Link
          href="/archive/worlds"
          className="group rounded border bg-card p-8 transition-all hover:border-foreground/40 hover:shadow-sm"
        >
          <div className="text-4xl font-semibold tracking-tight">{totalWorlds}</div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-2">
            🌍 {totalWorlds === 1 ? "World" : "Worlds"}
          </div>
        </Link>

        <Link
          href="/archive/locations"
          className="group rounded border bg-card p-8 transition-all hover:border-foreground/40 hover:shadow-sm"
        >
          <div className="text-4xl font-semibold tracking-tight">{totalLocations}</div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-2">
            📍 {totalLocations === 1 ? "Location" : "Locations"}
          </div>
        </Link>

        <Link
          href="/archive/objects"
          className="group rounded border bg-card p-8 transition-all hover:border-foreground/40 hover:shadow-sm"
        >
          <div className="text-4xl font-semibold tracking-tight">{totalObjects}</div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-2">
            🔮 {totalObjects === 1 ? "Object" : "Objects"}
          </div>
        </Link>
      </div>

      {/* Activity timeline */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">Recent Activity</h2>
          <Link
            href="/archive"
            className="text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          >
            View all →
          </Link>
        </div>

        {activity.length === 0 ? (
          <div className="rounded border border-dashed p-12 text-center">
            <p className="text-sm text-muted-foreground tracking-tight">
              No activity yet. Start building your universe by creating
              characters, worlds, locations, or objects.
            </p>
            <RoleGate allowedRoles={["editor", "admin"]}>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link
                  href="/archive/characters/new"
                  className="rounded bg-foreground px-5 py-2.5 text-[13px] font-medium text-background hover:bg-foreground/90 transition-colors"
                >
                  New Character
                </Link>
                <Link
                  href="/archive/worlds/new"
                  className="rounded border px-5 py-2.5 text-[13px] font-medium hover:bg-muted transition-colors"
                >
                  New World
                </Link>
                <Link
                  href="/archive/locations/new"
                  className="rounded border px-5 py-2.5 text-[13px] font-medium hover:bg-muted transition-colors"
                >
                  New Location
                </Link>
                <Link
                  href="/archive/objects/new"
                  className="rounded border px-5 py-2.5 text-[13px] font-medium hover:bg-muted transition-colors"
                >
                  New Object
                </Link>
              </div>
            </RoleGate>
          </div>
        ) : (
          <div className="space-y-2">
            {activity.map((item) => {
              const config = typeConfig[item.type];
              return (
                <Link
                  key={`${item.type}-${item.id}`}
                  href={config.href(item.id)}
                  className="block rounded border bg-card p-5 transition-all hover:border-foreground/40 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-3">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] uppercase tracking-wider font-medium ${config.bg} ${config.color}`}
                        >
                          {config.label}
                        </span>
                        <span className="text-base font-semibold tracking-tight">
                          {item.name}
                        </span>
                      </div>
                      {item.summary ? (
                        <p className="text-[13px] text-muted-foreground tracking-tight">
                          {item.summary}
                        </p>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-[11px] uppercase tracking-wider text-muted-foreground">
                      {formatRelativeTime(item.createdAt)}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
