"use client";

import { useState, useRef, useEffect } from "react";
import { CreateLocationModal } from "./CreateLocationModal";

type Location = {
  id: string;
  name: string;
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
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
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
