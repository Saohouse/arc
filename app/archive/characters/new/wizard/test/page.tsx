import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { requireStory } from "@/lib/story";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function createTestCharacter(formData: FormData) {
  "use server";
  await requireRole("editor");
  const currentStory = await requireStory();

  const name = String(formData.get("name") || "Test Character");

  // Minimal test wizard data
  const wizardData = {
    character_type_type: "support",
    core_identity_who: "A test character",
    desire_need_want: "To test the system",
  };

  // Get the highest order value to append to the end
  const maxOrder = await prisma.character.findFirst({
    where: { storyId: currentStory.id },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const newOrder = (maxOrder?.order ?? -1) + 1;

  const character = await prisma.character.create({
    data: {
      name,
      storyId: currentStory.id,
      wizardData,
      order: newOrder,
    },
  });

  revalidatePath("/archive/characters");
  redirect(`/archive/characters/${character.id}`);
}

export default async function TestWizardPage() {
  await requireRole("editor");

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-8">
      <div>
        <h1 className="text-3xl font-semibold mb-2">Quick Test - Wizard Data</h1>
        <p className="text-sm text-muted-foreground">
          Test creating a character with wizard data without filling out all questions.
        </p>
      </div>

      <form action={createTestCharacter} className="space-y-5">
        <label className="block text-sm font-medium">
          Character Name
          <input
            name="name"
            required
            defaultValue="Test Character"
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </label>

        <button
          type="submit"
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90"
        >
          Create Test Character
        </button>
      </form>

      <div className="rounded-lg border p-4 bg-muted/50">
        <p className="text-xs text-muted-foreground">
          This will create a character with minimal wizard data to test that the database save works correctly.
        </p>
      </div>
    </div>
  );
}
