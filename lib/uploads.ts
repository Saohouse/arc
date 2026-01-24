import crypto from "node:crypto";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png"]);

function extensionForType(type: string) {
  if (type === "image/jpeg") return "jpg";
  if (type === "image/png") return "png";
  return null;
}

/**
 * Convert a data URL to a File object
 */
function dataURLtoFile(dataUrl: string, filename: string): File {
  const arr = dataUrl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while(n--){
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

export async function saveImageUpload(fileOrDataUrl: File | string, prefix: string) {
  let file: File;
  
  // Handle data URL string (from cropped images)
  if (typeof fileOrDataUrl === 'string' && fileOrDataUrl.startsWith('data:')) {
    const ext = fileOrDataUrl.includes('image/png') ? 'png' : 'jpg';
    const filename = `${prefix}-${crypto.randomUUID()}.${ext}`;
    file = dataURLtoFile(fileOrDataUrl, filename);
  } else if (fileOrDataUrl instanceof File) {
    file = fileOrDataUrl;
  } else {
    return null;
  }
  
  if (!file || file.size === 0) {
    return null;
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Unsupported image type. Use JPG or PNG.");
  }

  const ext = extensionForType(file.type);
  if (!ext) {
    throw new Error("Unsupported image type. Use JPG or PNG.");
  }

  const filename = `${prefix}-${crypto.randomUUID()}.${ext}`;

  // Check if we're in production (Vercel) or development
  const isProduction = process.env.NODE_ENV === "production";
  const hasVercelToken = !!process.env.BLOB_READ_WRITE_TOKEN;

  try {
    if (isProduction && hasVercelToken) {
      // Use Vercel Blob in production
      const { put } = await import("@vercel/blob");
      
      // Convert File to ArrayBuffer for Vercel Blob
      const arrayBuffer = await file.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: file.type });
      
      const result = await put(filename, blob, {
        access: "public",
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      return result.url;
    } else {
      // Use local filesystem in development
      const { writeFile } = await import("node:fs/promises");
      const { join } = await import("node:path");
      
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const uploadDir = join(process.cwd(), "public", "uploads");
      const filePath = join(uploadDir, filename);
      
      await writeFile(filePath, buffer);

      // Return the public URL path
      return `/uploads/${filename}`;
    }
  } catch (error) {
    console.error("Upload error:", error);
    throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
