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
  locationType?: string | null;
  parentLocationId?: string | null;
  parent?: {
    id: string;
    name: string;
    locationType: string | null;
  } | null;
  children?: {
    id: string;
    name: string;
    locationType: string | null;
  }[];
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
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Load sort mode from localStorage after hydration
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("locations-sort-mode") as SortMode;
    if (saved === "alphabetical" || saved === "date-created") {
      setSortMode(saved);
    }
    // Auto-expand all nodes initially
    const allIds = locations.map(l => l.id);
    setExpandedNodes(new Set(allIds));
  }, [locations]);

  const handleSortModeChange = (mode: SortMode) => {
    setSortMode(mode);
    localStorage.setItem("locations-sort-mode", mode);
  };

  const toggleNode = (locationId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(locationId)) {
      newExpanded.delete(locationId);
    } else {
      newExpanded.add(locationId);
    }
    setExpandedNodes(newExpanded);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  const expandAll = () => {
    const allIds = locations.map(l => l.id);
    setExpandedNodes(new Set(allIds));
  };

  const allExpanded = expandedNodes.size === locations.length;
  const allCollapsed = expandedNodes.size === 0;

  // Build tree structure: organize locations into parent-child hierarchy
  const locationTree = useMemo(() => {
    // Create a map for quick lookup
    const locationMap = new Map(locations.map((loc) => [loc.id, loc]));
    
    // Find root locations (no parent)
    const roots = locations.filter((loc) => !loc.parentLocationId);
    
    // Build children arrays
    const getChildren = (parentId: string): Location[] => {
      return locations.filter((loc) => loc.parentLocationId === parentId);
    };
    
    return { roots, getChildren, locationMap };
  }, [locations]);

  // Check if location hierarchy is enabled (migration has been run)
  const hierarchyEnabled = locations.some((l) => l.hasOwnProperty('locationType'));

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

  // Get icon for location type
  const getLocationIcon = (locationType: string | null | undefined): string => {
    switch (locationType) {
      case "country": return "🌍";
      case "province": return "🏛️";
      case "city": return "🏙️";
      case "town": return "🏘️";
      default: return "📍";
    }
  };

  // Render a location node in the tree
  const renderLocationNode = (location: Location, depth: number = 0): React.ReactNode => {
    const children = locationTree.getChildren(location.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedNodes.has(location.id);
    const icon = getLocationIcon(location.locationType);
    
    return (
      <div key={location.id} className="space-y-1">
        <div 
          className="flex items-start gap-2 rounded-lg border transition hover:border-foreground/30 hover:bg-muted/50 p-3"
          style={{ marginLeft: `${depth * 24}px` }}
        >
          {/* Expand/Collapse Button */}
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.preventDefault();
                toggleNode(location.id);
              }}
              className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              {isExpanded ? "▼" : "▶"}
            </button>
          ) : (
            <div className="w-6" />
          )}

          {/* Location Icon */}
          <span className="text-lg flex-shrink-0">{icon}</span>

          {/* Location Image (if not compact) */}
          {!isCompact && (
            <>
              {location.imageUrl ? (
                <Image
                  src={location.imageUrl}
                  alt={location.name}
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded-lg object-cover flex-shrink-0"
                  loading="lazy"
                />
              ) : null}
            </>
          )}

          {/* Location Details */}
          <Link
            href={`/archive/locations/${location.id}`}
            className="flex-1 min-w-0"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className={`font-semibold ${isCompact ? "text-sm" : "text-base"}`}>
                  {location.name}
                </div>
                {location.summary ? (
                  <div className="text-sm text-muted-foreground truncate">
                    {location.summary}
                  </div>
                ) : null}
                {location.tags && !isCompact && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {parseTagsString(location.tags).map((tag) => (
                      <Tag 
                        key={`${location.id}-${tag}`} 
                        name={tag}
                        size="sm"
                        customColor={tagColorMap.get(tag)}
                      />
                    ))}
                  </div>
                )}
              </div>
              <div className="text-xs text-muted-foreground flex-shrink-0">
                Updated {location.updatedAt.toLocaleDateString()}
              </div>
            </div>
          </Link>
        </div>

        {/* Render Children */}
        {hasChildren && isExpanded && (
          <div className="space-y-1">
            {children.map((child) => renderLocationNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Sort root locations
  const sortedRoots = useMemo(() => {
    const sorted = [...locationTree.roots];
    switch (sortMode) {
      case "alphabetical":
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case "date-created":
        return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case "custom":
      default:
        return sorted.sort((a, b) => a.order - b.order);
    }
  }, [locationTree.roots, sortMode]);

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
          {hierarchyEnabled && (
            <button
              onClick={allExpanded ? collapseAll : expandAll}
              className="inline-flex items-center justify-center rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted hover:border-foreground/30 hover:scale-[1.02] hover:shadow-md transition-all touch-manipulation whitespace-nowrap"
              title={allExpanded ? "Collapse all locations" : "Expand all locations"}
            >
              {allExpanded ? "Collapse All" : "Expand All"}
            </button>
          )}
          <button
            onClick={() => setIsCompact(!isCompact)}
            className="inline-flex items-center justify-center rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted hover:border-foreground/30 hover:scale-[1.02] hover:shadow-md transition-all touch-manipulation whitespace-nowrap"
          >
            {isCompact ? "Show Photos" : "Hide Photos"}
          </button>
        </div>
      </div>

      {hierarchyEnabled ? (
        <div className="space-y-2">
          {sortedRoots.length > 0 ? (
            sortedRoots.map((location) => renderLocationNode(location, 0))
          ) : (
            <div className="text-sm text-muted-foreground text-center py-8">
              No locations found.
            </div>
          )}
        </div>
      ) : (
        /* Fallback to flat list if migration hasn't been run */
        sortMode === "custom" ? (
          <SortableList
            items={sortedLocations}
            onReorder={handleReorder}
            renderItem={(loc) => (
              <Link
                href={`/archive/locations/${loc.id}`}
                className={`block rounded-lg border transition hover:border-foreground/30 hover:bg-muted/50 ${
                  isCompact ? "p-3" : "p-4"
                }`}
              >
                <div className={`flex items-start gap-4 ${isCompact ? "items-center" : ""}`}>
                  {!isCompact && loc.imageUrl && (
                    <Image
                      src={loc.imageUrl}
                      alt={loc.name}
                      width={80}
                      height={80}
                      className="h-20 w-20 rounded-lg object-cover flex-shrink-0"
                      loading="lazy"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className={`font-semibold ${isCompact ? "text-sm" : "text-base"}`}>
                      {loc.name}
                    </div>
                    {loc.summary && (
                      <div className="text-sm text-muted-foreground">{loc.summary}</div>
                    )}
                  </div>
                </div>
              </Link>
            )}
          />
        ) : (
          <div className="grid gap-3">
            {sortedLocations.map((location) => (
              <Link
                key={location.id}
                href={`/archive/locations/${location.id}`}
                className="block rounded-lg border transition hover:border-foreground/30 hover:bg-muted/50 p-4"
              >
                <div className="font-semibold">{location.name}</div>
                {location.summary && (
                  <div className="text-sm text-muted-foreground">{location.summary}</div>
                )}
              </Link>
            ))}
          </div>
        )
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
