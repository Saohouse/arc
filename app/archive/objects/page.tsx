import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentStory } from "@/lib/story";
import { RoleGate } from "@/components/arc/RoleGate";
import { ObjectsPageClient } from "./ObjectsPageClient";

export default async function ObjectsPage() {
  const currentStory = await getCurrentStory();
  const [objects, customTags] = await Promise.all([
    prisma.object.findMany({
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
    <ObjectsPageClient
      objects={objects}
      tagColorMap={tagColorMap}
      newObjectButton={
        <RoleGate allowedRoles={["editor", "admin"]}>
          <Link
            href="/archive/objects/new"
            className="rounded bg-foreground px-5 py-2.5 text-[13px] font-medium text-background hover:bg-foreground/90 transition-colors"
          >
            New object
          </Link>
        </RoleGate>
      }
    />
  );
}
