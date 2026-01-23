import crypto from "node:crypto";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png"]);

function extensionForType(type: string) {
  if (type === "image/jpeg") return "jpg";
  if (type === "image/png") return "png";
  return null;
}

export async function saveImageUpload(file: File, prefix: string) {
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
