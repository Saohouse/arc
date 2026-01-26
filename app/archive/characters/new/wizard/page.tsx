import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { requireStory } from "@/lib/story";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { CharacterWizardForm } from "@/components/arc/CharacterWizardForm";
import { saveImageUpload } from "@/lib/uploads";

async function createCharacterFromWizard(formData: FormData) {
  "use server";
  await requireRole("editor");
  const currentStory = await requireStory();

  const name = String(formData.get("name") || "");
  const wizardDataString = String(formData.get("wizardData") || "{}");
  const psychologyTraits = String(formData.get("psychologyTraits") || "");
  const bio = String(formData.get("bio") || "");
  const imageFile = formData.get("image") as File | null;

  if (!name.trim()) {
    throw new Error("Character name is required");
  }

  let wizardData;
  try {
    wizardData = JSON.parse(wizardDataString);
  } catch (e) {
    wizardData = {};
  }

  // Upload image if provided
  let imageUrl: string | null = null;
  if (imageFile && imageFile.size > 0) {
    imageUrl = await saveImageUpload(imageFile, "character");
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
      bio: bio || undefined,
      imageUrl: imageUrl || undefined,
      storyId: currentStory.id,
      wizardData,
      psychologyTraits,
      order: newOrder,
    },
  });

  revalidatePath("/archive/characters");
  redirect("/archive/characters");
}

type WizardPageProps = {
  searchParams: Promise<{ ai?: string }>;
};

export default async function CharacterWizardPage({ searchParams }: WizardPageProps) {
  await requireRole("editor");
  const currentStory = await requireStory();
  const params = await searchParams;
  const isFromAI = params.ai === "true";

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
        
        {isFromAI && (
          <div className="mt-4 rounded-lg border bg-gradient-to-r from-emerald-50 to-cyan-50 dark:from-emerald-950/20 dark:to-cyan-950/20 p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 text-sm">
                <div className="font-semibold text-emerald-900 dark:text-emerald-200 mb-1">
                  AI-Generated Character Ready
                </div>
                <p className="text-emerald-800 dark:text-emerald-300 text-xs">
                  Your character has been pre-filled by AI. Review each section and make any edits you'd like.
                  You can regenerate individual sections or the entire character at any time.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <CharacterWizardForm action={createCharacterFromWizard} isFromAI={isFromAI} />
    </div>
  );
}
