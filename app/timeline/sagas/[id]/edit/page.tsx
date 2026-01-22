import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStory } from "@/lib/story";
import { ColorPicker } from "@/components/arc/ColorPicker";
import { requireRole } from "@/lib/auth";

async function updateSaga(sagaId: string, formData: FormData) {
  "use server";
  await requireRole("editor");

  const name = String(formData.get("name") ?? "").trim();
  const number = Number(formData.get("number") ?? "0");
  if (!name || number <= 0) {
    return;
  }

  const currentStory = await requireStory();

  const description = String(formData.get("description") ?? "").trim();
  const status = String(formData.get("status") ?? "planning");
  const startDateStr = String(formData.get("startDate") ?? "");
  const endDateStr = String(formData.get("endDate") ?? "");
  const color = String(formData.get("color") ?? "").trim() || null;

  await prisma.saga.updateMany({
    where: { id: sagaId, storyId: currentStory.id },
    data: {
      name,
      number,
      description: description || null,
      status,
      startDate: startDateStr ? new Date(startDateStr) : null,
      endDate: endDateStr ? new Date(endDateStr) : null,
      color,
    },
  });

  redirect(`/timeline/sagas/${sagaId}`);
}

export default async function EditSagaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("editor");
  const { id } = await params;
  const currentStory = await requireStory();

  const saga = await prisma.saga.findFirst({
    where: { id, storyId: currentStory.id },
  });

  if (!saga) {
    notFound();
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <div className="text-sm text-muted-foreground">
          Timeline / <Link href="/timeline/sagas" className="hover:text-foreground transition-colors">Sagas</Link> / {saga.name}
        </div>
        <h1 className="text-3xl font-semibold">Edit Saga</h1>
      </div>

      <form action={updateSaga.bind(null, saga.id)} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <label className="block text-sm font-medium">
            Saga Number
            <input
              name="number"
              type="number"
              required
              defaultValue={saga.number}
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
              defaultValue={saga.status}
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
            defaultValue={saga.name}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="e.g. Season 1, Origins Phase, Book One"
          />
        </label>

        <label className="block text-sm font-medium">
          Description
          <textarea
            name="description"
            rows={3}
            defaultValue={saga.description ?? ""}
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
              defaultValue={
                saga.startDate
                  ? new Date(saga.startDate).toISOString().split("T")[0]
                  : ""
              }
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </label>

          <label className="block text-sm font-medium">
            End Date (Optional)
            <input
              name="endDate"
              type="date"
              defaultValue={
                saga.endDate
                  ? new Date(saga.endDate).toISOString().split("T")[0]
                  : ""
              }
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </label>
        </div>

        <label className="block text-sm font-medium">
          Color (Optional)
          <ColorPicker
            name="color"
            defaultValue={saga.color || undefined}
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="rounded bg-foreground px-5 py-2.5 text-[13px] font-medium text-background hover:bg-foreground/90 transition-colors"
          >
            Save Changes
          </button>
          <Link
            href={`/timeline/sagas/${saga.id}`}
            className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
