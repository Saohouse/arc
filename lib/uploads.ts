import { promises as fs } from "node:fs";
import path from "node:path";
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
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  const targetPath = path.join(uploadDir, filename);

  await fs.mkdir(uploadDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(targetPath, buffer);

  return `/uploads/${filename}`;
}
