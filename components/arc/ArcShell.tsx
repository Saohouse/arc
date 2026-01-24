import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { StorySelector } from "@/components/arc/StorySelector";
import { getCurrentStory } from "@/lib/story";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserMenu } from "@/components/arc/UserMenu";

const nav = [
  { href: "/archive", label: "Archive", icon: "📚" },
  { href: "/episodes", label: "Episodes", icon: "📺" },
  { href: "/timeline", label: "Timeline", icon: "📅" },
  { href: "/relationships", label: "Relationships", icon: "🔗" },
  { href: "/continuity", label: "Continuity", icon: "⏱️" },
  { href: "/tags", label: "Tags", icon: "🏷️" },
  { href: "/map", label: "Map", icon: "🗺️" },
];

export async function ArcShell({ children }: { children: React.ReactNode }) {
  const currentUser = await getCurrentUser();
  
  // Get stories user has access to
  const allStories = currentUser
    ? await prisma.story.findMany({
        where: {
          members: {
            some: {
              userId: currentUser.id,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      })
    : [];

  const currentStory = await getCurrentStory();

  // If no user is logged in, render pages without the ArcShell layout
  if (!currentUser) {
    return <>{children}</>;
  }

  // If logged in but no story exists, just render children directly
  if (!currentStory) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen gradient-bg">
      <div className="flex">
        {/* Sidebar with glassmorphism */}
        <aside className="w-72 shrink-0 min-h-screen p-6 flex flex-col glass-strong sticky top-0 shadow-xl">
          {/* Logo */}
          <Link 
            href="/" 
            className="mb-8 block group"
          >
            <div className="text-2xl font-bold tracking-tight text-foreground/90 group-hover:text-foreground transition-colors">
              ARC
            </div>
            <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mt-1.5 group-hover:text-accent transition-colors">
              Archive · Relationships · Continuity
            </div>
          </Link>

          {/* Story Selector */}
          <div className="mb-6">
            <StorySelector currentStory={currentStory} allStories={allStories} />
          </div>

          <Separator className="my-6 bg-border/50" />

          {/* Navigation */}
          <nav className="flex-1 space-y-1.5">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="nav-link flex items-center gap-3"
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* User Menu */}
          {currentUser && (
            <>
              <Separator className="my-6 bg-border/50" />
              <UserMenu user={currentUser} />
            </>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-10 max-w-7xl">
          {children}
        </main>
      </div>
    </div>
  );
}
