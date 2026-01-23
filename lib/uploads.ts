import crypto from "node:crypto";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

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

  // Convert File to Buffer
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Save to public/uploads directory
  const uploadDir = join(process.cwd(), "public", "uploads");
  const filePath = join(uploadDir, filename);
  
  await writeFile(filePath, buffer);

  // Return the public URL path
  return `/uploads/${filename}`;
}
