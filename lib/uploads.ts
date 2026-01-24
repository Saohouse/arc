import crypto from "node:crypto";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/jpg"]);

function extensionForType(type: string) {
  if (type === "image/jpeg" || type === "image/jpg") return "jpg";
  if (type === "image/png") return "png";
  return null;
}

/**
 * Convert a data URL to binary data for upload
 */
function dataURLtoBlob(dataUrl: string): { buffer: Buffer; mimeType: string } {
  const arr = dataUrl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const base64Data = arr[1];
  const buffer = Buffer.from(base64Data, 'base64');
  return { buffer, mimeType };
}

export async function saveImageUpload(fileOrDataUrl: File | string, prefix: string) {
  // Debug log
  console.log("saveImageUpload called:", { 
    type: typeof fileOrDataUrl, 
    isFile: fileOrDataUrl instanceof File,
    isDataUrl: typeof fileOrDataUrl === 'string' && fileOrDataUrl.startsWith('data:'),
    prefix 
  });

  const isVercel = !!process.env.VERCEL;
  const hasVercelToken = !!process.env.BLOB_READ_WRITE_TOKEN;
  
  console.log("Environment:", { isVercel, hasVercelToken, NODE_ENV: process.env.NODE_ENV });

  // Handle data URL string (from cropped images)
  if (typeof fileOrDataUrl === 'string' && fileOrDataUrl.startsWith('data:')) {
    console.log("Processing data URL...");
    
    const { buffer, mimeType } = dataURLtoBlob(fileOrDataUrl);
    const ext = extensionForType(mimeType);
    
    if (!ext) {
      throw new Error("Unsupported image type. Use JPG or PNG.");
    }
    
    const filename = `${prefix}-${crypto.randomUUID()}.${ext}`;
    
    // Always use Vercel Blob for data URLs in production
    if (isVercel || hasVercelToken) {
      console.log("Using Vercel Blob for data URL upload...");
      
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        throw new Error("BLOB_READ_WRITE_TOKEN is required for uploads on Vercel");
      }
      
      const { put } = await import("@vercel/blob");
      // Convert Buffer to Uint8Array for Blob compatibility
      const uint8Array = new Uint8Array(buffer);
      const blob = new Blob([uint8Array], { type: mimeType });
      
      const result = await put(filename, blob, {
        access: "public",
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      
      console.log("Vercel Blob upload success:", result.url);
      return result.url;
    } else {
      // Local development
      console.log("Using local filesystem for data URL...");
      const { writeFile } = await import("node:fs/promises");
      const { join } = await import("node:path");
      
      const uploadDir = join(process.cwd(), "public", "uploads");
      const filePath = join(uploadDir, filename);
      
      await writeFile(filePath, buffer);
      return `/uploads/${filename}`;
    }
  }
  
  // Handle regular File upload
  if (fileOrDataUrl instanceof File) {
    console.log("Processing File object...");
    
    const file = fileOrDataUrl;
    
    if (!file || file.size === 0) {
      console.log("File is empty, returning null");
      return null;
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      throw new Error(`Unsupported image type: ${file.type}. Use JPG or PNG.`);
    }

    const ext = extensionForType(file.type);
    if (!ext) {
      throw new Error("Unsupported image type. Use JPG or PNG.");
    }

    const filename = `${prefix}-${crypto.randomUUID()}.${ext}`;

    if (isVercel || hasVercelToken) {
      console.log("Using Vercel Blob for File upload...");
      
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        throw new Error("BLOB_READ_WRITE_TOKEN is required for uploads on Vercel");
      }
      
      const { put } = await import("@vercel/blob");
      const arrayBuffer = await file.arrayBuffer();
      // Convert to Uint8Array for Blob compatibility
      const uint8Array = new Uint8Array(arrayBuffer);
      const blob = new Blob([uint8Array], { type: file.type });
      
      const result = await put(filename, blob, {
        access: "public",
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      
      console.log("Vercel Blob upload success:", result.url);
      return result.url;
    } else {
      // Local development
      console.log("Using local filesystem for File...");
      const { writeFile } = await import("node:fs/promises");
      const { join } = await import("node:path");
      
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const uploadDir = join(process.cwd(), "public", "uploads");
      const filePath = join(uploadDir, filename);
      
      await writeFile(filePath, buffer);
      return `/uploads/${filename}`;
    }
  }

  console.log("No valid file or data URL provided, returning null");
  return null;
}

