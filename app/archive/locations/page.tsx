import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStory } from "@/lib/story";
import { RoleGate } from "@/components/arc/RoleGate";
import { LocationsPageClient } from "./LocationsPageClient";

export default async function LocationsPage() {
  const currentStory = await requireStory();
  const [locations, customTags] = await Promise.all([
    prisma.location.findMany({
      where: { storyId: currentStory.id },
      orderBy: { order: "asc" },
      select: {
        id: true,
        name: true,
        summary: true,
        imageUrl: true,
        tags: true,
        order: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.tag.findMany({
      where: { storyId: currentStory.id },
      select: { name: true, color: true },
    }),
  ]);

  const tagColorMap = new Map<string, string | null>(
    customTags.map((t) => [t.name, t.color])
  );

  return (
    <LocationsPageClient
      storyId={currentStory.id}
      locations={locations}
      tagColorMap={tagColorMap}
      newLocationButton={
        <RoleGate allowedRoles={["editor", "admin"]}>
          <Link
            href="/archive/locations/new"
            className="inline-flex items-center justify-center rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:bg-foreground/90 hover:scale-[1.02] hover:shadow-lg transition-all whitespace-nowrap touch-manipulation"
          >
            New location
          </Link>
        </RoleGate>
      }
    />
  );
}
