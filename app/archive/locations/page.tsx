import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentStory } from "@/lib/story";
import { RoleGate } from "@/components/arc/RoleGate";
import { LocationsPageClient } from "./LocationsPageClient";

export default async function LocationsPage() {
  const currentStory = await getCurrentStory();
  const [locations, customTags] = await Promise.all([
    prisma.location.findMany({
      where: { storyId: currentStory.id },
      orderBy: { name: "asc" },
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
      locations={locations}
      tagColorMap={tagColorMap}
      newLocationButton={
        <RoleGate allowedRoles={["editor", "admin"]}>
          <Link
            href="/archive/locations/new"
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90"
          >
            New location
          </Link>
        </RoleGate>
      }
    />
  );
}
