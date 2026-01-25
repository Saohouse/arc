import { getCurrentStory } from "@/lib/story";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ArcShellClient } from "./ArcShellClient";

// Server Component Wrapper
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
    <ArcShellClient
      currentUser={currentUser}
      currentStory={currentStory}
      allStories={allStories}
    >
      {children}
    </ArcShellClient>
  );
}
