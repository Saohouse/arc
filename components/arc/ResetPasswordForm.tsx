"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

type ResetPasswordFormProps = {
  token: string;
  action: (
    prevState: any,
    formData: FormData
  ) => Promise<{ error?: string } | void>;
};

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="w-full rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Updating..." : "Update password"}
    </button>
  );
}

export function ResetPasswordForm({ token, action }: ResetPasswordFormProps) {
  const [state, formAction] = useActionState(action, null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswordMismatch, setShowPasswordMismatch] = useState(false);

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setConfirmPassword(value);
    setShowPasswordMismatch(value.length > 0 && password !== value);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    if (confirmPassword.length > 0) {
      setShowPasswordMismatch(confirmPassword !== value);
    }
  };

  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="token" value={token} />

      {state?.error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/30">
          <p className="text-sm text-red-800 dark:text-red-400">{state.error}</p>
        </div>
      )}

      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          minLength={8}
          value={password}
          onChange={handlePasswordChange}
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground"
          placeholder="••••••••"
        />
        <p className="mt-1 text-xs text-muted-foreground">At least 8 characters</p>
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium">
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
          minLength={8}
          value={confirmPassword}
          onChange={handleConfirmPasswordChange}
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground"
          placeholder="••••••••"
        />
        {showPasswordMismatch && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">
            Passwords do not match
          </p>
        )}
        {confirmPassword.length > 0 && !showPasswordMismatch && (
          <p className="mt-1 text-xs text-green-600 dark:text-green-400">
            ✓ Passwords match
          </p>
        )}
      </div>

      <SubmitButton disabled={passwordsMismatch} />

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/forgot-password" className="font-medium hover:underline">
          Request a new reset link
        </Link>
      </p>
    </form>
  );
}
