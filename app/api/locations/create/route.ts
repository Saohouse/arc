import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentStory } from "@/lib/story";
import { saveImageUpload } from "@/lib/uploads";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const name = String(formData.get("name") ?? "").trim();

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const currentStory = await getCurrentStory();
    
    if (!currentStory) {
      return NextResponse.json(
        { error: "No story selected. Please create a story first." },
        { status: 400 }
      );
    }

    const summary = String(formData.get("summary") ?? "").trim();
    const overview = String(formData.get("overview") ?? "").trim();
    const tagsRaw = String(formData.get("tags") ?? "").trim();
    const tags = tagsRaw
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .join(",");

    const imageFile = formData.get("image");
    const imageUrl =
      imageFile instanceof File && imageFile.size > 0
        ? await saveImageUpload(imageFile, "location")
        : null;

    const location = await prisma.location.create({
      data: {
        name,
        summary: summary || null,
        overview: overview || null,
        imageUrl,
        tags,
        storyId: currentStory.id,
      },
    });

    return NextResponse.json({ location });
  } catch (error) {
    console.error("Error creating location:", error);
    return NextResponse.json(
      { error: "Failed to create location" },
      { status: 500 }
    );
  }
}
