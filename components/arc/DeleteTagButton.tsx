"use client";

type DeleteTagButtonProps = {
  tagId: string;
  tagName: string;
  deleteAction: (formData: FormData) => Promise<void>;
};

export function DeleteTagButton({ tagId, tagName, deleteAction }: DeleteTagButtonProps) {
  return (
    <form
      action={deleteAction}
      onSubmit={(e) => {
        if (
          !confirm(
            `Delete custom settings for "${tagName}"? The tag will revert to auto-color.`
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={tagId} />
      <button
        type="submit"
        className="rounded border border-red-300 px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30 transition-colors"
      >
        Delete custom settings
      </button>
    </form>
  );
}
