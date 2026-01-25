import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { requireStory } from "@/lib/story";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CharacterWizardForm } from "@/components/arc/CharacterWizardForm";

async function createCharacterFromWizard(formData: FormData) {
  "use server";
  await requireRole("editor");
  const currentStory = await requireStory();

  const name = String(formData.get("name") || "");
  const wizardDataString = String(formData.get("wizardData") || "{}");

  if (!name.trim()) {
    throw new Error("Character name is required");
  }

  let wizardData;
  try {
    wizardData = JSON.parse(wizardDataString);
  } catch (e) {
    wizardData = {};
  }

  // Get the highest order value to append to the end
  const maxOrder = await prisma.character.findFirst({
    where: { storyId: currentStory.id },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const newOrder = (maxOrder?.order ?? -1) + 1;

  await prisma.character.create({
    data: {
      name,
      storyId: currentStory.id,
      wizardData,
      order: newOrder,
    },
  });

  revalidatePath("/archive/characters");
  redirect("/archive/characters");
}

export default async function CharacterWizardPage() {
  await requireRole("editor");
  const currentStory = await requireStory();

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto mb-6">
        <Link
          href="/archive/characters/new"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to character creation
        </Link>
      </div>

      <CharacterWizardForm action={createCharacterFromWizard} />
    </div>
  );
}
