import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStory } from "@/lib/story";

export default async function ArchivePage() {
  const currentStory = await requireStory();

  // Get counts for each category
  const [totalCharacters, totalWorlds, totalLocations, totalObjects] =
    await Promise.all([
      prisma.character.count({ where: { storyId: currentStory.id } }),
      prisma.world.count({ where: { storyId: currentStory.id } }),
      prisma.location.count({ where: { storyId: currentStory.id } }),
      prisma.object.count({ where: { storyId: currentStory.id } }),
    ]);

  return (
    <div className="space-y-8 sm:space-y-12">
      {/* Header */}
      <div className="space-y-2 sm:space-y-3">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight">
          📚 Archive
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground tracking-tight">
          Unified library for characters, worlds, locations, and objects in the {currentStory.name} universe
        </p>
      </div>

      {/* Category Cards */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/archive/characters"
          className="card-enhanced group p-8 sm:p-10 space-y-4 hover:scale-[1.02] transition-transform touch-manipulation"
        >
          <div className="space-y-2">
            <div className="text-5xl sm:text-6xl font-bold tracking-tight bg-gradient-to-br from-blue-600 to-blue-400 dark:from-blue-400 dark:to-blue-600 bg-clip-text text-transparent">
              {totalCharacters}
            </div>
            <div className="text-base sm:text-lg font-semibold tracking-tight">
              👤 Characters
            </div>
          </div>
          <p className="text-xs sm:text-[13px] text-muted-foreground tracking-tight leading-relaxed">
            Canon profiles and identity anchors.
          </p>
        </Link>

        <Link
          href="/archive/worlds"
          className="card-enhanced group p-8 sm:p-10 space-y-4 hover:scale-[1.02] transition-transform touch-manipulation"
        >
          <div className="space-y-2">
            <div className="text-5xl sm:text-6xl font-bold tracking-tight bg-gradient-to-br from-purple-600 to-purple-400 dark:from-purple-400 dark:to-purple-600 bg-clip-text text-transparent">
              {totalWorlds}
            </div>
            <div className="text-base sm:text-lg font-semibold tracking-tight">
              🌍 Worlds
            </div>
          </div>
          <p className="text-xs sm:text-[13px] text-muted-foreground tracking-tight leading-relaxed">
            Settings, timelines, and canon rules.
          </p>
        </Link>

        <Link
          href="/archive/locations"
          className="card-enhanced group p-8 sm:p-10 space-y-4 hover:scale-[1.02] transition-transform touch-manipulation"
        >
          <div className="space-y-2">
            <div className="text-5xl sm:text-6xl font-bold tracking-tight bg-gradient-to-br from-emerald-600 to-emerald-400 dark:from-emerald-400 dark:to-emerald-600 bg-clip-text text-transparent">
              {totalLocations}
            </div>
            <div className="text-base sm:text-lg font-semibold tracking-tight">
              📍 Locations
            </div>
          </div>
          <p className="text-xs sm:text-[13px] text-muted-foreground tracking-tight leading-relaxed">
            Places, hubs, and set pieces.
          </p>
        </Link>

        <Link
          href="/archive/objects"
          className="card-enhanced group p-8 sm:p-10 space-y-4 hover:scale-[1.02] transition-transform touch-manipulation"
        >
          <div className="space-y-2">
            <div className="text-5xl sm:text-6xl font-bold tracking-tight bg-gradient-to-br from-amber-600 to-amber-400 dark:from-amber-400 dark:to-amber-600 bg-clip-text text-transparent">
              {totalObjects}
            </div>
            <div className="text-base sm:text-lg font-semibold tracking-tight">
              🔮 Objects
            </div>
          </div>
          <p className="text-xs sm:text-[13px] text-muted-foreground tracking-tight leading-relaxed">
            Weapons, tools, and artifacts.
          </p>
        </Link>
      </div>
    </div>
  );
}