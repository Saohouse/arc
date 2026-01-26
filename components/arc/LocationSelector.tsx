"use client";

import { useState, useRef, useEffect } from "react";
import { CreateLocationModal } from "./CreateLocationModal";

type Location = {
  id: string;
  name: string;
  locationType?: string | null;
  parent?: {
    id: string;
    name: string;
    locationType?: string | null;
  } | null;
  parentLocationId?: string | null;
};

type LocationSelectorProps = {
  locations: Location[];
  defaultValue?: string;
};

export function LocationSelector({
  locations: initialLocations,
  defaultValue,
}: LocationSelectorProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [locations, setLocations] = useState(initialLocations);
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    setLocations(initialLocations);
  }, [initialLocations]);

  function handleLocationCreated(newLocation: { id: string; name: string }) {
    // Add new location to the list
    setLocations((prev) => [...prev, newLocation]);
    
    // Auto-select the new location
    setTimeout(() => {
      if (selectRef.current) {
        selectRef.current.value = newLocation.id;
      }
    }, 0);
  }

  // Build breadcrumb path for a location
  const getLocationPath = (location: Location): string => {
    const parts: string[] = [];
    
    // Add parent path if exists
    if (location.parent) {
      const parentLoc = locations.find((l) => l.id === location.parentLocationId);
      if (parentLoc) {
        const parentPath = getLocationPath(parentLoc);
        if (parentPath) parts.push(parentPath);
      } else if (location.parent.name) {
        // Fallback to parent name if not in list
        parts.push(location.parent.name);
      }
    }
    
    parts.push(location.name);
    return parts.join(" > ");
  };

  // Get icon for location type
  const getLocationIcon = (locationType?: string | null): string => {
    switch (locationType) {
      case "country":
        return "🌍";
      case "province":
        return "🏛️";
      case "city":
        return "🏙️";
      case "town":
        return "🏘️";
      default:
        return "📍";
    }
  };

  return (
    <>
      <div className="block">
        <div className="flex items-center justify-between">
          <label htmlFor="homeLocationId" className="text-sm font-medium">
            Home location
          </label>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          >
            + New location
          </button>
        </div>
        <select
          ref={selectRef}
          id="homeLocationId"
          name="homeLocationId"
          className="mt-2 w-full rounded border bg-background px-3 py-2 text-sm"
          defaultValue={defaultValue || ""}
        >
          <option value="">No home location</option>
          {locations.map((location) => {
            const path = getLocationPath(location);
            const icon = getLocationIcon(location.locationType);
            return (
              <option key={location.id} value={location.id}>
                {icon} {path}
              </option>
            );
          })}
        </select>
      </div>

      <CreateLocationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onLocationCreated={handleLocationCreated}
      />
    </>
  );
}
