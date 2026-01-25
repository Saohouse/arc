"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

type SubmitButtonProps = {
  children: React.ReactNode;
  className?: string;
  loadingText?: string;
};

export function SubmitButton({
  children,
  className = "rounded bg-foreground px-5 py-2.5 text-[13px] font-medium text-background hover:bg-foreground/90 transition-colors",
  loadingText = "Saving...",
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`${className} disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{loadingText}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
