import { redirect, notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { requireStory } from "@/lib/story";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CharacterWizardForm } from "@/components/arc/CharacterWizardForm";

async function updateCharacterWizardData(formData: FormData) {
  "use server";
  await requireRole("editor");
  await requireStory();

  const characterId = String(formData.get("characterId") || "");
  if (!characterId) {
    throw new Error("Character ID is required");
  }

  const wizardDataString = String(formData.get("wizardData") || "{}");

  let wizardData;
  try {
    wizardData = JSON.parse(wizardDataString);
  } catch (e) {
    wizardData = {};
  }

  await prisma.character.update({
    where: { id: characterId },
    data: {
      wizardData,
    },
  });

  revalidatePath(`/archive/characters/${characterId}`);
  redirect(`/archive/characters/${characterId}`);
}

type CharacterWizardPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CharacterWizardPage({ params }: CharacterWizardPageProps) {
  await requireRole("editor");
  await requireStory();
  const { id } = await params;

  const character = await prisma.character.findUnique({
    where: { id },
  });

  if (!character) {
    notFound();
  }

  // Parse existing wizard data if it exists
  const initialData = (character.wizardData as Record<string, string>) || {};

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto mb-6">
        <Link
          href={`/archive/characters/${character.id}/edit`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to edit character
        </Link>
        <div className="mt-4">
          <h1 className="text-2xl font-semibold">{character.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {initialData && Object.keys(initialData).length > 0
              ? "Review and update character development notes"
              : "Complete the Frank Daniel character development questionnaire"}
          </p>
        </div>
      </div>

      <CharacterWizardForm
        action={updateCharacterWizardData}
        characterId={character.id}
        characterName={character.name}
        initialData={initialData}
      />
    </div>
  );
}
