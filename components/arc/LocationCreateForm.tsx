"use client";

import { useState } from "react";
import Link from "next/link";
import { ImageUpload } from "@/components/arc/ImageUpload";
import { RichTextEditor } from "@/components/arc/RichTextEditor";

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("overview", overview); // Use the rich text content
    await createAction(formData);
  };

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
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="">None (top-level)</option>
            {allLocations.map((loc) => (
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
