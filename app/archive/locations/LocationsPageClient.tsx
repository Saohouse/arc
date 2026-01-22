"use client";

import Link from "next/link";
import { useState } from "react";
import { Tag } from "@/components/arc/Tag";
import { parseTagsString } from "@/lib/tags";

type Location = {
  id: string;
  name: string;
  summary: string | null;
  imageUrl: string | null;
  tags: string;
  updatedAt: Date;
};

type LocationsListProps = {
  locations: Location[];
  tagColorMap: Map<string, string | null>;
};

function LocationsList({ locations, tagColorMap }: LocationsListProps) {
  const [isCompact, setIsCompact] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-muted-foreground">
          {locations.length} {locations.length === 1 ? "location" : "locations"}
        </div>
        <button
          onClick={() => setIsCompact(!isCompact)}
          className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
        >
          {isCompact ? "Show Photos" : "Hide Photos"}
        </button>
      </div>

      <div className="grid gap-3">
        {locations.map((location) => (
          <Link
            key={location.id}
            href={`/archive/locations/${location.id}`}
            className={`rounded-lg border transition hover:border-foreground/30 hover:bg-muted/50 ${
              isCompact ? "p-3" : "p-4"
            }`}
          >
            <div className={`flex items-start gap-4 ${isCompact ? "items-center" : ""}`}>
              {!isCompact && (
                <>
                  {location.imageUrl ? (
                    <img
                      src={location.imageUrl}
                      alt={location.name}
                      className="h-20 w-20 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-lg border border-dashed flex items-center justify-center text-2xl flex-shrink-0">
                      📍
                    </div>
                  )}
                </>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className={`font-semibold ${isCompact ? "text-sm" : "text-base"}`}>
                      {location.name}
                    </div>
                    {location.summary ? (
                      <div className="text-sm text-muted-foreground">
                        {location.summary}
                      </div>
                    ) : null}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Updated {location.updatedAt.toLocaleDateString()}
                  </div>
                </div>
                {location.tags && !isCompact && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {parseTagsString(location.tags).map((tag) => (
                      <Tag 
                        key={`${location.id}-${tag}`} 
                        name={tag}
                        customColor={tagColorMap.get(tag)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}

type LocationsPageClientProps = {
  locations: Location[];
  tagColorMap: Map<string, string | null>;
  newLocationButton: React.ReactNode;
};

export function LocationsPageClient({
  locations,
  tagColorMap,
  newLocationButton,
}: LocationsPageClientProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm text-muted-foreground">
            Archive / Locations
          </div>
          <h1 className="text-3xl font-semibold">📍 Locations</h1>
          <p className="text-sm text-muted-foreground">
            Physical places, hubs, and set pieces.
          </p>
        </div>
        {newLocationButton}
      </div>

      {locations.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          No locations yet. Add the first place.
        </div>
      ) : (
        <LocationsList locations={locations} tagColorMap={tagColorMap} />
      )}
    </div>
  );
}
