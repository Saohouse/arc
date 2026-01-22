"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";

type CreateLocationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onLocationCreated: (location: { id: string; name: string }) => void;
};

export function CreateLocationModal({
  isOpen,
  onClose,
  onLocationCreated,
}: CreateLocationModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);

    try {
      const response = await fetch("/api/locations/create", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        onLocationCreated({
          id: data.location.id,
          name: data.location.name,
        });
        onClose();
        router.refresh();
      } else {
        alert("Failed to create location");
      }
    } catch (error) {
      console.error("Error creating location:", error);
      alert("Failed to create location");
    } finally {
      setIsSubmitting(false);
    }
  }

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div className="w-full max-w-2xl rounded border bg-background p-8 shadow-lg my-8">
          <div className="mb-6">
            <div className="text-sm text-muted-foreground">
              Archive / Locations
            </div>
            <h2 className="text-3xl font-semibold tracking-tight">
              New location
            </h2>
            <p className="text-sm text-muted-foreground tracking-tight mt-2">
              Capture the set and its canonical details.
            </p>
          </div>

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

            <label className="block text-sm font-medium">
              Summary
              <input
                name="summary"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="One-line setting description"
              />
            </label>

            <label className="block text-sm font-medium">
              Image (JPG or PNG)
              <input
                name="image"
                type="file"
                accept="image/jpeg,image/png"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </label>

            <label className="block text-sm font-medium">
              Tags
              <input
                name="tags"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="city, building, landmark"
              />
            </label>

            <label className="block text-sm font-medium">
              Overview
              <textarea
                name="overview"
                rows={6}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="Location description, significance, atmosphere."
              />
            </label>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded bg-foreground px-5 py-2.5 text-[13px] font-medium text-background hover:bg-foreground/90 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "Creating..." : "Create location"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </>,
    document.body
  );
}
