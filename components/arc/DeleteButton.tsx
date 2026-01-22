"use client";

type DeleteButtonProps = {
  id: string;
  name: string;
  action: (formData: FormData) => Promise<void>;
};

export function DeleteButton({ id, name, action }: DeleteButtonProps) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="rounded-md border border-destructive px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive hover:text-background"
        onClick={(e) => {
          if (!confirm(`Delete "${name}"? This cannot be undone.`)) {
            e.preventDefault();
          }
        }}
      >
        Delete
      </button>
    </form>
  );
}
