import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentStory } from "@/lib/story";
import { ColorPicker } from "@/components/arc/ColorPicker";
import { requireRole } from "@/lib/auth";

async function createSaga(formData: FormData) {
  "use server";
  await requireRole("editor");

  const name = String(formData.get("name") ?? "").trim();
  const number = Number(formData.get("number") ?? "0");
  if (!name || number <= 0) {
    return;
  }

  const currentStory = await getCurrentStory();

  const description = String(formData.get("description") ?? "").trim();
  const status = String(formData.get("status") ?? "planning");
  const startDateStr = String(formData.get("startDate") ?? "");
  const endDateStr = String(formData.get("endDate") ?? "");
  const color = String(formData.get("color") ?? "").trim() || null;

  const saga = await prisma.saga.create({
    data: {
      name,
      number,
      description: description || null,
      status,
      startDate: startDateStr ? new Date(startDateStr) : null,
      endDate: endDateStr ? new Date(endDateStr) : null,
      color,
      storyId: currentStory.id,
    },
  });

  redirect(`/timeline/sagas/${saga.id}`);
}

export default async function NewSagaPage() {
  await requireRole("editor");
  const currentStory = await getCurrentStory();

  // Get the next saga number
  const lastSaga = await prisma.saga.findFirst({
    where: { storyId: currentStory.id },
    orderBy: { number: "desc" },
  });
  const nextSagaNumber = (lastSaga?.number ?? 0) + 1;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <div className="text-sm text-muted-foreground">Timeline / Sagas</div>
        <h1 className="text-3xl font-semibold">New Saga</h1>
        <p className="text-sm text-muted-foreground">
          Create a new season, phase, or saga to organize your story arcs.
        </p>
      </div>

      <form action={createSaga} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <label className="block text-sm font-medium">
            Saga Number
            <input
              name="number"
              type="number"
              required
              defaultValue={nextSagaNumber}
              min="1"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              E.g., 1, 2, 3... for ordering
            </p>
          </label>

          <label className="block text-sm font-medium">
            Status
            <select
              name="status"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              defaultValue="planning"
            >
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </label>
        </div>

        <label className="block text-sm font-medium">
          Name
          <input
            name="name"
            required
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="e.g. Season 1, Origins Phase, Book One"
          />
        </label>

        <label className="block text-sm font-medium">
          Description
          <textarea
            name="description"
            rows={3}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="What happens in this saga or season?"
          />
        </label>

        <div className="grid gap-6 md:grid-cols-2">
          <label className="block text-sm font-medium">
            Start Date (Optional)
            <input
              name="startDate"
              type="date"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </label>

          <label className="block text-sm font-medium">
            End Date (Optional)
            <input
              name="endDate"
              type="date"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </label>
        </div>

        <label className="block text-sm font-medium">
          Color (Optional)
          <ColorPicker name="color" />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="rounded bg-foreground px-5 py-2.5 text-[13px] font-medium text-background hover:bg-foreground/90 transition-colors"
          >
            Create Saga
          </button>
          <Link
            href="/timeline/sagas"
            className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
