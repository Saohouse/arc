import Link from "next/link";

export default function ArchivePage() {
  return (
    <div className="space-y-8 sm:space-y-12">
      <div>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">📚 Archive</h1>
        <p className="mt-2 sm:mt-3 text-sm sm:text-base text-muted-foreground tracking-tight">
          Unified library for characters, worlds, locations, and objects.
        </p>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/archive/characters"
          className="rounded border p-6 sm:p-8 transition-all hover:border-foreground/40 hover:shadow-sm touch-manipulation"
        >
          <div className="text-base sm:text-lg font-semibold tracking-tight">👤 Characters</div>
          <p className="mt-2 sm:mt-3 text-xs sm:text-[13px] text-muted-foreground tracking-tight">
            Canon profiles and identity anchors.
          </p>
        </Link>
        <Link
          href="/archive/worlds"
          className="rounded border p-6 sm:p-8 transition-all hover:border-foreground/40 hover:shadow-sm touch-manipulation"
        >
          <div className="text-base sm:text-lg font-semibold tracking-tight">🌍 Worlds</div>
          <p className="mt-2 sm:mt-3 text-xs sm:text-[13px] text-muted-foreground tracking-tight">
            Settings, timelines, and canon rules.
          </p>
        </Link>
        <Link
          href="/archive/locations"
          className="rounded border p-6 sm:p-8 transition-all hover:border-foreground/40 hover:shadow-sm touch-manipulation"
        >
          <div className="text-base sm:text-lg font-semibold tracking-tight">📍 Locations</div>
          <p className="mt-2 sm:mt-3 text-xs sm:text-[13px] text-muted-foreground tracking-tight">
            Places, hubs, and set pieces.
          </p>
        </Link>
        <Link
          href="/archive/objects"
          className="rounded border p-6 sm:p-8 transition-all hover:border-foreground/40 hover:shadow-sm touch-manipulation"
        >
          <div className="text-base sm:text-lg font-semibold tracking-tight">🔮 Objects</div>
          <p className="mt-2 sm:mt-3 text-xs sm:text-[13px] text-muted-foreground tracking-tight">
            Weapons, tools, and artifacts.
          </p>
        </Link>
      </div>
    </div>
  );
}