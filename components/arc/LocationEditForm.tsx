"use client";

import { useState } from "react";
import Link from "next/link";
import { ImageUpload } from "@/components/arc/ImageUpload";
import { RichTextEditor } from "@/components/arc/RichTextEditor";

interface Location {
  id: string;
  name: string;
  summary: string | null;
  overview: string | null;
  tags: string;
  imageUrl: string | null;
  locationType: string | null;
  parentLocationId: string | null;
}

interface ParentLocation {
  id: string;
  name: string;
  locationType: string | null;
}

interface LocationEditFormProps {
  location: Location;
  allLocations: ParentLocation[];
  updateAction: (formData: FormData) => Promise<void>;
}

export function LocationEditForm({
  location,
  allLocations,
  updateAction,
}: LocationEditFormProps) {
  const [overview, setOverview] = useState(location.overview || "");
  const [selectedLocationType, setSelectedLocationType] = useState(location.locationType || "");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("overview", overview); // Use the rich text content
    await updateAction(formData);
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
        return allLocations.filter((loc) => loc.locationType === "city");
      default:
        return allLocations;
    }
  };

  const filteredLocations = getFilteredParentLocations();
  const canHaveParent = selectedLocationType !== "country";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <input type="hidden" name="id" value={location.id} />
      <input
        type="hidden"
        name="existingImageUrl"
        value={location.imageUrl || ""}
      />

      <label className="block text-sm font-medium">
        Name
        <input
          name="name"
          required
          defaultValue={location.name}
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="e.g. The Archive, Sao's Apartment"
        />
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <label className="block text-sm font-medium">
          Location Type
          <select
            name="locationType"
            value={selectedLocationType}
            onChange={(e) => setSelectedLocationType(e.target.value)}
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
            defaultValue={location.parentLocationId || ""}
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

      <label className="block text-sm font-medium">
        Summary
        <input
          name="summary"
          defaultValue={location.summary || ""}
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="One-line descriptor"
        />
      </label>

      <ImageUpload
        name="image"
        label="Location Image"
        currentImageUrl={location.imageUrl}
        maxSizeMB={5}
      />

      <label className="block text-sm font-medium">
        Tags
        <input
          name="tags"
          defaultValue={location.tags}
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="city, building, landmark"
        />
      </label>

      <div className="space-y-2">
        <label className="block text-sm font-medium">Overview</label>
        <RichTextEditor
          content={overview}
          onChange={setOverview}
          placeholder="Describe this location - its significance, atmosphere, history, and unique features..."
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:bg-foreground/90 hover:scale-[1.02] hover:shadow-lg transition-all whitespace-nowrap touch-manipulation"
        >
          Save changes
        </button>
        <Link
          href={`/archive/locations/${location.id}`}
          className="inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted hover:border-foreground/30 hover:scale-[1.02] hover:shadow-md transition-all whitespace-nowrap touch-manipulation"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
