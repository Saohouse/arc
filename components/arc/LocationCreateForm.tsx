"use client";

import { useState } from "react";
import Link from "next/link";
import { ImageUpload } from "@/components/arc/ImageUpload";
import { RichTextEditor } from "@/components/arc/RichTextEditor";
import { IconPicker } from "@/components/arc/IconPicker";
import { getDefaultLocationIcon, type LocationType } from "@/lib/location-icons";

interface ParentLocation {
  id: string;
  name: string;
  locationType: string | null;
}

interface LocationCreateFormProps {
  allLocations: ParentLocation[];
  createAction: (formData: FormData) => Promise<void>;
}

export function LocationCreateForm({
  allLocations,
  createAction,
}: LocationCreateFormProps) {
  const [overview, setOverview] = useState("");
  const [selectedLocationType, setSelectedLocationType] = useState("");
  const [icon, setIcon] = useState<string>(getDefaultLocationIcon(null));

  // Update icon when location type changes
  const handleLocationTypeChange = (type: string) => {
    setSelectedLocationType(type);
    // Auto-update icon to match location type default
    const defaultIcon = getDefaultLocationIcon((type || null) as LocationType);
    setIcon(defaultIcon);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("overview", overview); // Use the rich text content
    formData.set("iconType", "emoji"); // Always emoji for now
    formData.set("iconData", icon);
    await createAction(formData);
  };

  // Filter parent locations based on selected type
  const getFilteredParentLocations = () => {
    if (!selectedLocationType) return allLocations; // Standalone can be anywhere

    switch (selectedLocationType) {
      case "country":
        return []; // Countries cannot have parents
      case "province":
        return allLocations.filter((loc) => loc.locationType === "country");
      case "city":
        return allLocations.filter((loc) => loc.locationType === "province"); // Cities only in provinces
      case "town":
        return allLocations.filter((loc) => loc.locationType === "province"); // Towns go under provinces
      default:
        return allLocations;
    }
  };

  const filteredLocations = getFilteredParentLocations();
  const canHaveParent = selectedLocationType !== "country";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <label className="block text-sm font-medium">
        Name
        <input
          name="name"
          required
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="e.g. Atelier 9, Neon Alley"
        />
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <label className="block text-sm font-medium">
          Location Type
          <select
            name="locationType"
            value={selectedLocationType}
            onChange={(e) => handleLocationTypeChange(e.target.value)}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="">Standalone location</option>
            <option value="country">🌍 Country</option>
            <option value="province">🏛️ Province</option>
            <option value="city">🏙️ City</option>
            <option value="town">🏘️ Town</option>
          </select>
        </label>

        <label className="block text-sm font-medium">
          Parent Location
          <select
            name="parentLocationId"
            disabled={!canHaveParent}
            className={`mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm ${
              !canHaveParent ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <option value="">
              {selectedLocationType === "country" 
                ? "Countries are top-level" 
                : "None (top-level)"}
            </option>
            {filteredLocations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.locationType === "country" && "🌍 "}
                {loc.locationType === "province" && "🏛️ "}
                {loc.locationType === "city" && "🏙️ "}
                {loc.locationType === "town" && "🏘️ "}
                {loc.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <IconPicker
        value={icon}
        onChange={setIcon}
        locationType={(selectedLocationType || null) as LocationType}
      />

      <label className="block text-sm font-medium">
        Summary
        <input
          name="summary"
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="One-line setting description"
        />
      </label>

      <ImageUpload
        name="image"
        label="Location Image"
        maxSizeMB={5}
      />

      <label className="block text-sm font-medium">
        Tags
        <input
          name="tags"
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="district, faction, vibe"
        />
      </label>

      <div className="space-y-2">
        <label className="block text-sm font-medium">Overview</label>
        <RichTextEditor
          content={overview}
          onChange={setOverview}
          placeholder="Describe this location - key scenes, physical details, ownership, atmosphere, and history..."
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90"
        >
          Create location
        </button>
        <Link
          href="/archive/locations"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
