import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { requestPasswordReset } from "@/lib/password-reset";
import { ForgotPasswordForm } from "@/components/arc/ForgotPasswordForm";

async function forgotPassword(prevState: any, formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email) {
    return { error: "Email is required" };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { error: "Please enter a valid email address" };
  }

  try {
    await requestPasswordReset(email);
  } catch {
    return {
      error: "We couldn't send the reset email right now. Please try again later.",
    };
  }

  return { success: true };
}

export default async function ForgotPasswordPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30">
      <div className="w-full max-w-md space-y-8 rounded-lg border bg-background p-8 shadow-sm">
        <div className="text-center">
          <h1 className="text-3xl font-bold">ARC</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Reset your password
          </p>
        </div>

        <ForgotPasswordForm action={forgotPassword} />
      </div>
    </div>
  );
}
