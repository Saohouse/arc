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
        className="rounded-lg border border-border px-5 py-2.5 text-[13px] font-medium text-foreground/70 hover:text-red-600 hover:border-red-300 hover:bg-red-50/50 dark:hover:text-red-400 dark:hover:border-red-900/50 dark:hover:bg-red-950/20 transition-all"
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
