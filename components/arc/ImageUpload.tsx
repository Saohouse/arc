"use client";

import { ImageCropUpload } from "./ImageCropUpload";

type ImageUploadProps = {
  name: string;
  label: string;
  currentImageUrl?: string | null;
  maxSizeMB?: number;
  accept?: string;
  required?: boolean;
  aspectRatio?: number;
};

/**
 * ImageUpload component with built-in cropping functionality
 * Wraps ImageCropUpload with a simpler API
 */
export function ImageUpload({
  name,
  label,
  currentImageUrl,
  maxSizeMB = 5,
  accept = "image/jpeg,image/png",
  required = false,
  aspectRatio = 1,
}: ImageUploadProps) {
  return (
    <ImageCropUpload
      name={name}
      label={label}
      currentImageUrl={currentImageUrl}
      maxSizeMB={maxSizeMB}
      accept={accept}
      required={required}
      aspectRatio={aspectRatio}
    />
  );
}
