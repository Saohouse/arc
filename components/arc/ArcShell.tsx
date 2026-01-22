import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { StorySelector } from "@/components/arc/StorySelector";
import { getCurrentStory } from "@/lib/story";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserMenu } from "@/components/arc/UserMenu";
import { headers } from "next/headers";

const nav = [
  { href: "/archive", label: "📚 Archive" },
  { href: "/episodes", label: "📺 Episodes" },
  { href: "/timeline", label: "📅 Timeline" },
  { href: "/relationships", label: "🔗 Relationships" },
  { href: "/continuity", label: "⏱️ Continuity" },
  { href: "/tags", label: "🏷️ Tags" },
  { href: "/map", label: "🗺️ Map" },
];

export async function ArcShell({ children }: { children: React.ReactNode }) {
  const [currentStory, allStories, currentUser] = await Promise.all([
    getCurrentStory(),
    prisma.story.findMany({ orderBy: { createdAt: "asc" } }),
    getCurrentUser(),
  ]);

  // If no user is logged in, render pages without the ArcShell layout
  // (login, signup pages will handle their own layout)
  if (!currentUser) {
    return <>{children}</>;
  }

  // If logged in but no story exists, just render children directly
  // (home page will show welcome screen, or stories/new will show create form)
  if (!currentStory) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <aside className="w-64 shrink-0 border-r min-h-screen p-6 flex flex-col">
          <Link href="/" className="mb-6 block transition-opacity hover:opacity-60">
            <div className="text-xl font-semibold tracking-tight">ARC</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
              Archive · Relationships · Continuity
            </div>
          </Link>

          <StorySelector currentStory={currentStory} allStories={allStories} />

          <Separator className="my-6" />

          <nav className="flex-1 space-y-0.5">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded px-3 py-2.5 text-[13px] tracking-tight hover:bg-muted transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {currentUser && (
            <>
              <Separator className="my-6" />
              <UserMenu user={currentUser} />
            </>
          )}
        </aside>

        <main className="flex-1 p-8 max-w-7xl">{children}</main>
      </div>
    </div>
  );
}