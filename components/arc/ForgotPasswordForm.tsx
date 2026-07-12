"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

type ForgotPasswordFormProps = {
  action: (
    prevState: any,
    formData: FormData
  ) => Promise<{ error?: string; success?: boolean } | void>;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Sending..." : "Send reset link"}
    </button>
  );
}

export function ForgotPasswordForm({ action }: ForgotPasswordFormProps) {
  const [state, formAction] = useActionState(action, null);

  if (state?.success) {
    return (
      <div className="space-y-6">
        <div className="rounded-md border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/30">
          <p className="text-sm text-green-800 dark:text-green-400">
            If an account exists with that email, we sent a password reset link.
            Check your inbox and spam folder — the link expires in 1 hour.
          </p>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="font-medium hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/30">
          <p className="text-sm text-red-800 dark:text-red-400">{state.error}</p>
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground"
          placeholder="you@example.com"
        />
      </div>

      <SubmitButton />

      <p className="text-center text-sm text-muted-foreground">
        Remember your password?{" "}
        <Link href="/login" className="font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
