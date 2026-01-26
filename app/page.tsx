import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentStory } from "@/lib/story";
import { getCurrentUser } from "@/lib/auth";
import { RoleGate } from "@/components/arc/RoleGate";
import { UserMenu } from "@/components/arc/UserMenu";
import { InvitationPopup } from "@/components/arc/InvitationPopup";

type ActivityItem = {
  id: string;
  type: "character" | "world" | "location" | "object";
  name: string;
  summary?: string | null;
  createdAt: Date;
};

export default async function HomePage() {
  const [currentStory, currentUser] = await Promise.all([
    getCurrentStory(),
    getCurrentUser(),
  ]);

  // Check for new invitations (not yet viewed)
  const newInvitations = currentUser
    ? await prisma.storyMember.findMany({
        where: {
          userId: currentUser.id,
          viewedAt: null,
          role: "member", // Only show for member invitations, not owner
        },
        include: {
          story: {
            include: {
              members: {
                where: { role: "owner" },
                include: { user: { select: { name: true } } },
              },
            },
          },
        },
      })
    : [];

  const invitations = newInvitations.map((membership) => ({
    storyId: membership.storyId,
    storyName: membership.story.name,
    storyDescription: membership.story.description,
    invitedBy: membership.story.members[0]?.user.name || "Someone",
    membershipId: membership.id,
  }));

  // Show welcome screen if no story exists
  if (!currentStory) {
    const isViewer = currentUser?.role === "viewer";
    
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="max-w-2xl text-center space-y-12">
          {/* Main content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-7xl font-bold tracking-tight">ARC</h1>
              <p className="text-sm uppercase tracking-widest text-muted-foreground">
                Archive · Relationships · Continuity
              </p>
            </div>
            
            <div className="space-y-6 pt-4">
              <p className="text-xl text-muted-foreground">
                Your world-building companion for creating and managing rich story universes
              </p>
              
              {isViewer ? (
                <div className="rounded-lg border bg-muted/30 p-6 space-y-2">
                  <p className="text-base font-medium">
                    No stories have been created yet
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Contact an admin or editor to create the first story
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <p className="text-base text-muted-foreground">
                    Start building your universe by creating your first story
                  </p>
                  <form action="/stories/new" method="GET">
                    <button
                      type="submit"
                      className="rounded-lg bg-foreground px-8 py-4 text-base font-semibold text-background hover:bg-foreground/90 transition-colors shadow-sm"
                    >
                      Create Your First Story
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>

          {/* User info and logout */}
          {currentUser && (
            <div className="pt-8 border-t space-y-4">
              <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-foreground font-semibold text-xs">
                  {currentUser.name[0].toUpperCase()}
                </div>
                <div>
                  <span className="font-medium text-foreground">{currentUser.name}</span>
                  <span className="mx-2">·</span>
                  <span className="capitalize">{currentUser.role}</span>
                </div>
              </div>
              <form action="/api/auth/logout" method="POST">
                <button
                  type="submit"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
                >
                  Log out
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    );
  }

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
    <div className="space-y-8 sm:space-y-12">
      {/* Hero section */}
      <div className="space-y-2 sm:space-y-3">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight">
          Archive · Relationships · Continuity
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground tracking-tight">
          Visual world-building and canon system for the {currentStory.name} universe
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:gap-6 grid-cols-2 md:grid-cols-4">
        <Link
          href="/archive/characters"
          className="card-enhanced group aspect-square p-6 flex flex-col items-center justify-center text-center"
        >
          <div className="text-4xl sm:text-5xl font-bold tracking-tight bg-gradient-to-br from-blue-600 to-blue-400 dark:from-blue-400 dark:to-blue-600 bg-clip-text text-transparent">
            {totalCharacters}
          </div>
          <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.15em] text-muted-foreground mt-3 font-semibold">
            👤 {totalCharacters === 1 ? "Character" : "Characters"}
          </div>
        </Link>

        <Link
          href="/archive/worlds"
          className="card-enhanced group aspect-square p-6 flex flex-col items-center justify-center text-center"
        >
          <div className="text-4xl sm:text-5xl font-bold tracking-tight bg-gradient-to-br from-purple-600 to-purple-400 dark:from-purple-400 dark:to-purple-600 bg-clip-text text-transparent">
            {totalWorlds}
          </div>
          <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.15em] text-muted-foreground mt-3 font-semibold">
            🌍 {totalWorlds === 1 ? "World" : "Worlds"}
          </div>
        </Link>

        <Link
          href="/archive/locations"
          className="card-enhanced group aspect-square p-6 flex flex-col items-center justify-center text-center"
        >
          <div className="text-4xl sm:text-5xl font-bold tracking-tight bg-gradient-to-br from-emerald-600 to-emerald-400 dark:from-emerald-400 dark:to-emerald-600 bg-clip-text text-transparent">
            {totalLocations}
          </div>
          <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.15em] text-muted-foreground mt-3 font-semibold">
            📍 {totalLocations === 1 ? "Location" : "Locations"}
          </div>
        </Link>

        <Link
          href="/archive/objects"
          className="card-enhanced group aspect-square p-6 flex flex-col items-center justify-center text-center"
        >
          <div className="text-4xl sm:text-5xl font-bold tracking-tight bg-gradient-to-br from-amber-600 to-amber-400 dark:from-amber-400 dark:to-amber-600 bg-clip-text text-transparent">
            {totalObjects}
          </div>
          <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.15em] text-muted-foreground mt-3 font-semibold">
            🔮 {totalObjects === 1 ? "Object" : "Objects"}
          </div>
        </Link>
      </div>

      {/* Activity timeline */}
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">Recent Activity</h2>
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
                  className="inline-flex items-center justify-center rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:bg-foreground/90 hover:scale-[1.02] hover:shadow-lg transition-all whitespace-nowrap touch-manipulation"
                >
                  New Character
                </Link>
                <Link
                  href="/archive/worlds/new"
                  className="inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted hover:border-foreground/30 hover:scale-[1.02] hover:shadow-md transition-all whitespace-nowrap touch-manipulation"
                >
                  New World
                </Link>
                <Link
                  href="/archive/locations/new"
                  className="inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted hover:border-foreground/30 hover:scale-[1.02] hover:shadow-md transition-all whitespace-nowrap touch-manipulation"
                >
                  New Location
                </Link>
                <Link
                  href="/archive/objects/new"
                  className="inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted hover:border-foreground/30 hover:scale-[1.02] hover:shadow-md transition-all whitespace-nowrap touch-manipulation"
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
                  className="card-enhanced block p-6"
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

      {/* Show invitation popup if there are new invitations */}
      <InvitationPopup invitations={invitations} />
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
