import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { resetPasswordWithToken, validateResetToken } from "@/lib/password-reset";
import { ResetPasswordForm } from "@/components/arc/ResetPasswordForm";

async function resetPassword(prevState: any, formData: FormData) {
  "use server";

  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!token) {
    return { error: "Invalid reset link" };
  }

  if (!password || !confirmPassword) {
    return { error: "All fields are required" };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match" };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters long" };
  }

  const result = await resetPasswordWithToken(token, password);

  if ("error" in result) {
    return { error: result.error };
  }

  redirect("/login?reset=success");
}

type PageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (user) {
    redirect("/");
  }

  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="w-full max-w-md space-y-6 rounded-lg border bg-background p-8 shadow-sm text-center">
          <h1 className="text-2xl font-bold">Invalid reset link</h1>
          <p className="text-sm text-muted-foreground">
            This password reset link is missing or malformed.
          </p>
          <Link
            href="/forgot-password"
            className="inline-block text-sm font-medium hover:underline"
          >
            Request a new reset link
          </Link>
        </div>
      </div>
    );
  }

  const resetToken = await validateResetToken(token);

  if (!resetToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="w-full max-w-md space-y-6 rounded-lg border bg-background p-8 shadow-sm text-center">
          <h1 className="text-2xl font-bold">Link expired</h1>
          <p className="text-sm text-muted-foreground">
            This password reset link is invalid or has expired. Reset links are valid for 1 hour.
          </p>
          <Link
            href="/forgot-password"
            className="inline-block text-sm font-medium hover:underline"
          >
            Request a new reset link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30">
      <div className="w-full max-w-md space-y-8 rounded-lg border bg-background p-8 shadow-sm">
        <div className="text-center">
          <h1 className="text-3xl font-bold">ARC</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose a new password for {resetToken.user.email}
          </p>
        </div>

        <ResetPasswordForm token={token} action={resetPassword} />
      </div>
    </div>
  );
}
