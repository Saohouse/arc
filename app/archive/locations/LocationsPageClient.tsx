"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useMemo, useEffect } from "react";
import { Tag } from "@/components/arc/Tag";
import { parseTagsString } from "@/lib/tags";
import { SortableList } from "@/components/arc/SortableList";
import { reorderLocations } from "@/lib/reorder-actions";
import { ArrowUpDown } from "lucide-react";

type Location = {
  id: string;
  name: string;
  summary: string | null;
  imageUrl: string | null;
  tags: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
};

type SortMode = "custom" | "alphabetical" | "date-created";

type LocationsListProps = {
  storyId: string;
  locations: Location[];
  tagColorMap: Map<string, string | null>;
};

function LocationsList({ storyId, locations, tagColorMap }: LocationsListProps) {
  const [isCompact, setIsCompact] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("custom");
  const [mounted, setMounted] = useState(false);

  // Load sort mode from localStorage after hydration
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("locations-sort-mode") as SortMode;
    if (saved === "alphabetical" || saved === "date-created") {
      setSortMode(saved);
    }
  }, []);

  const handleSortModeChange = (mode: SortMode) => {
    setSortMode(mode);
    localStorage.setItem("locations-sort-mode", mode);
  };

  const sortedLocations = useMemo(() => {
    const sorted = [...locations];
    switch (sortMode) {
      case "alphabetical":
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case "date-created":
        return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case "custom":
      default:
        return sorted.sort((a, b) => a.order - b.order);
    }
  }, [locations, sortMode]);

  const handleReorder = async (reorderedItems: Location[]) => {
    await reorderLocations(
      storyId,
      reorderedItems.map((item) => ({ id: item.id, order: item.order }))
    );
  };

  const renderLocation = (location: Location) => (
    <Link
      href={`/archive/locations/${location.id}`}
      className={`block rounded-lg border transition hover:border-foreground/30 hover:bg-muted/50 ${
        isCompact ? "p-3" : "p-4"
      }`}
    >
      <div className={`flex items-start gap-4 ${isCompact ? "items-center" : ""}`}>
        {!isCompact && (
          <>
            {location.imageUrl ? (
              <Image
                src={location.imageUrl}
                alt={location.name}
                width={80}
                height={80}
                className="h-20 w-20 rounded-lg object-cover flex-shrink-0"
                loading="lazy"
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
  );

  return (
    <>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="text-sm text-muted-foreground">
          {locations.length} {locations.length === 1 ? "location" : "locations"}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 border rounded-md p-1">
            <button
              onClick={() => handleSortModeChange("custom")}
              className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                sortMode === "custom" 
                  ? "bg-foreground/10 text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Custom drag-and-drop order"
            >
              <ArrowUpDown className="h-3 w-3" />
            </button>
            <button
              onClick={() => handleSortModeChange("alphabetical")}
              className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                sortMode === "alphabetical" 
                  ? "bg-foreground/10 text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Sort alphabetically"
            >
              A-Z
            </button>
            <button
              onClick={() => handleSortModeChange("date-created")}
              className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                sortMode === "date-created" 
                  ? "bg-foreground/10 text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Sort by date created (newest first)"
            >
              Date
            </button>
          </div>
          <button
            onClick={() => setIsCompact(!isCompact)}
            className="inline-flex items-center justify-center rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted hover:border-foreground/30 hover:scale-[1.02] hover:shadow-md transition-all touch-manipulation whitespace-nowrap"
          >
            {isCompact ? "Show Photos" : "Hide Photos"}
          </button>
        </div>
      </div>

      {sortMode === "custom" ? (
        <SortableList
          items={sortedLocations}
          onReorder={handleReorder}
          renderItem={renderLocation}
        />
      ) : (
        <div className="grid gap-3">
          {sortedLocations.map((location) => (
            <div key={location.id}>{renderLocation(location)}</div>
          ))}
        </div>
      )}
    </>
  );
}

type LocationsPageClientProps = {
  storyId: string;
  locations: Location[];
  tagColorMap: Map<string, string | null>;
  newLocationButton: React.ReactNode;
};

export function LocationsPageClient({
  storyId,
  locations,
  tagColorMap,
  newLocationButton,
}: LocationsPageClientProps) {
  return (
    <div className="space-y-6">
      {/* Header Section - Mobile Optimized */}
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Archive / Locations
        </div>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-semibold">📍 Locations</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Physical places, hubs, and set pieces.
            </p>
          </div>
          <div className="flex-shrink-0">
            {newLocationButton}
          </div>
        </div>
      </div>

      {locations.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          No locations yet. Add the first place.
        </div>
      ) : (
        <LocationsList storyId={storyId} locations={locations} tagColorMap={tagColorMap} />
      )}
    </div>
  );
}
