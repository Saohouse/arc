"use client";

import { useState } from "react";

type ImageUploadProps = {
  name: string;
  label: string;
  maxSizeMB?: number;
  accept?: string;
  required?: boolean;
};

export function ImageUpload({
  name,
  label,
  maxSizeMB = 5,
  accept = "image/jpeg,image/png",
  required = false,
}: ImageUploadProps) {
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setFileName(null);

    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      setError(
        `Image is too large (${fileSizeMB.toFixed(1)}MB). Maximum size is ${maxSizeMB}MB.`
      );
      e.target.value = ""; // Clear the input
      return;
    }

    setFileName(file.name);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">{label}</label>
      <input
        name={name}
        type="file"
        accept={accept}
        required={required}
        onChange={handleFileChange}
        className="w-full rounded-md border bg-background px-3 py-2 text-sm file:mr-4 file:rounded file:border-0 file:bg-muted file:px-3 file:py-1 file:text-sm file:font-medium hover:file:bg-muted/80"
      />
      {fileName && (
        <p className="text-xs text-green-600 dark:text-green-400">
          ✓ {fileName}
        </p>
      )}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/30">
          <p className="text-sm font-medium text-red-900 dark:text-red-400">
            {error}
          </p>
          <p className="mt-1 text-xs text-red-700 dark:text-red-300">
            Please compress or resize your image and try again.
          </p>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Max size: {maxSizeMB}MB · Formats: JPG, PNG
      </p>
    </div>
  );
}
