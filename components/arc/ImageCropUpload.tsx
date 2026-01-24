"use client";

import { useState, useCallback, useRef } from "react";
import Cropper from "react-easy-crop";
import { Area, getCroppedImg, readFile } from "@/lib/image-crop";

type ImageCropUploadProps = {
  name: string;
  label: string;
  currentImageUrl?: string | null;
  maxSizeMB?: number;
  accept?: string;
  required?: boolean;
  aspectRatio?: number;
};

export function ImageCropUpload({
  name,
  label,
  currentImageUrl,
  maxSizeMB = 5,
  accept = "image/jpeg,image/png",
  required = false,
  aspectRatio = 1,
}: ImageCropUploadProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [croppedDataUrl, setCroppedDataUrl] = useState<string | null>(null);
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onCropComplete = useCallback(
    (croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      setError(
        `Image is too large (${fileSizeMB.toFixed(1)}MB). Maximum size is ${maxSizeMB}MB.`
      );
      return;
    }

    try {
      const imageDataUrl = await readFile(file);
      setImageSrc(imageDataUrl);
      setOriginalFile(file);
      setFileName(file.name);
      setCroppedDataUrl(null);
      setIsEditingExisting(false);
    } catch (err) {
      setError("Failed to read image file");
      console.error(err);
    }
  };

  const handleCropSave = async () => {
    if (!imageSrc || !croppedAreaPixels || !originalFile) return;

    try {
      const croppedImage = await getCroppedImg(
        imageSrc,
        croppedAreaPixels,
        originalFile.name,
        originalFile.type
      );
      
      // Convert the cropped File to a data URL for storing
      const dataUrl = await readFile(croppedImage);
      setCroppedDataUrl(dataUrl);
      
      // Close the crop editor
      setImageSrc(null);
      setError(null);
    } catch (err) {
      setError("Failed to crop image");
      console.error(err);
    }
  };

  const handleCropCancel = () => {
    setImageSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    // Don't clear the file input - let the file upload normally
  };

  const handleEditExisting = async () => {
    if (!currentImageUrl) return;
    
    try {
      // Fetch the existing image and convert to blob
      const response = await fetch(currentImageUrl);
      const blob = await response.blob();
      const file = new File([blob], 'existing-image.jpg', { type: blob.type });
      
      const imageDataUrl = await readFile(file);
      setImageSrc(imageDataUrl);
      setOriginalFile(file);
      setFileName('existing-image.jpg');
      setIsEditingExisting(true);
    } catch (err) {
      setError("Failed to load existing image for editing");
      console.error(err);
    }
  };

  const handleRecrop = () => {
    if (croppedDataUrl) {
      setImageSrc(croppedDataUrl);
      setCroppedDataUrl(null);
    }
  };

  const handleRemoveCrop = () => {
    setCroppedDataUrl(null);
    setFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">{label}</label>

      {/* Crop Editor Modal */}
      {imageSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="relative w-full max-w-4xl rounded-lg bg-background shadow-xl">
            {/* Crop Area */}
            <div className="relative h-[500px] w-full bg-black">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={aspectRatio}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>

            {/* Controls */}
            <div className="space-y-4 p-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Zoom</label>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCropCancel}
                  className="rounded border px-5 py-2.5 text-[13px] font-medium hover:bg-muted transition-colors"
                >
                  Skip Crop / Upload Original
                </button>
                <button
                  type="button"
                  onClick={handleCropSave}
                  className="rounded bg-foreground px-5 py-2.5 text-[13px] font-medium text-background hover:bg-foreground/90 transition-colors"
                >
                  Apply Crop
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Show file input only if no cropped image exists */}
      {!croppedDataUrl && (
        <input
          ref={fileInputRef}
          name={name}
          type="file"
          accept={accept}
          required={required && !croppedDataUrl && !currentImageUrl}
          onChange={handleFileSelect}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm file:mr-4 file:rounded file:border-0 file:bg-muted file:px-3 file:py-1 file:text-sm file:font-medium hover:file:bg-muted/80"
        />
      )}

      {/* Hidden input to store cropped image data URL - only when cropped */}
      {croppedDataUrl && (
        <>
          <input
            type="hidden"
            name={`${name}_data`}
            value={croppedDataUrl}
          />
          {/* Also hide the regular file input when we have cropped data */}
          <input
            type="hidden"
            name={name}
            value=""
          />
        </>
      )}

      {/* Success State */}
      {croppedDataUrl && (
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-md border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950/30">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-green-900 dark:text-green-400">
                ✓ Image cropped and ready
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRecrop}
                className="text-xs font-medium text-green-900 hover:underline dark:text-green-400"
              >
                Re-crop
              </button>
              <button
                type="button"
                onClick={handleRemoveCrop}
                className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
              >
                Remove
              </button>
            </div>
          </div>
          {/* Preview */}
          <img
            src={croppedDataUrl}
            alt="Cropped preview"
            className="h-32 w-32 rounded-lg border object-cover"
          />
        </div>
      )}

      {/* Current Image */}
      {currentImageUrl && !croppedDataUrl && (
        <div className="space-y-2">
          <div className="relative inline-block">
            <img
              src={currentImageUrl}
              alt="Current"
              className="h-32 w-32 rounded-lg border object-cover"
            />
          </div>
          <div className="flex items-center gap-3">
            <p className="text-xs text-muted-foreground">
              Current image
            </p>
            <button
              type="button"
              onClick={handleEditExisting}
              className="text-xs font-medium text-foreground hover:underline"
            >
              Edit / Recrop
            </button>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/30">
          <p className="text-sm font-medium text-red-900 dark:text-red-400">
            {error}
          </p>
        </div>
      )}

      {/* Help Text */}
      <p className="text-xs text-muted-foreground">
        Max size: {maxSizeMB}MB · Formats: JPG, PNG · 
        {aspectRatio === 1 ? " Square crop" : ` ${aspectRatio}:1 aspect ratio`}
      </p>
    </div>
  );
}
