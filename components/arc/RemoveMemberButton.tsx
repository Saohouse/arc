"use client";

type RemoveMemberButtonProps = {
  storyId: string;
  userId: string;
  userName: string;
  action: (formData: FormData) => Promise<void>;
};

export function RemoveMemberButton({ 
  storyId, 
  userId, 
  userName,
  action 
}: RemoveMemberButtonProps) {
  return (
    <form action={action}>
      <input type="hidden" name="storyId" value={storyId} />
      <input type="hidden" name="userId" value={userId} />
      <button
        type="submit"
        className="rounded-lg border border-border px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-[13px] font-medium text-foreground/70 hover:text-red-600 hover:border-red-300 hover:bg-red-50/50 dark:hover:text-red-400 dark:hover:border-red-900/50 dark:hover:bg-red-950/20 transition-all whitespace-nowrap touch-manipulation"
        onClick={(e) => {
          if (!confirm(`Remove ${userName} from this story?`)) {
            e.preventDefault();
          }
        }}
      >
        Remove
      </button>
    </form>
  );
}
