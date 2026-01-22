import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashPassword, createSession, setSessionCookie, getCurrentUser } from "@/lib/auth";
import { SignupForm } from "@/components/arc/SignupForm";

async function signup(prevState: any, formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!email || !name || !password || !confirmPassword) {
    return { error: "All fields are required" };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match" };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters long" };
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { error: "Please enter a valid email address" };
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return { 
      error: "An account with this email already exists. Please sign in instead." 
    };
  }

  // Check if this is the first user (make them admin)
  const userCount = await prisma.user.count();
  const role = userCount === 0 ? "admin" : "viewer";

  const hashedPassword = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      name,
      password: hashedPassword,
      role,
    },
  });

  const token = await createSession(user.id);
  await setSessionCookie(token);

  redirect("/");
}

export default async function SignupPage() {
  // Redirect if already logged in
  const user = await getCurrentUser();
  if (user) {
    redirect("/");
  }

  // Check if this is the first user
  const userCount = await prisma.user.count();
  const isFirstUser = userCount === 0;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30">
      <div className="w-full max-w-md space-y-8 rounded-lg border bg-background p-8 shadow-sm">
        <div className="text-center">
          <h1 className="text-3xl font-bold">ARC</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Create your account
          </p>
          {isFirstUser && (
            <div className="mt-3 rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/30">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-400">
                🎉 First user will be assigned Admin role
              </p>
            </div>
          )}
        </div>

        <SignupForm action={signup} />
      </div>
    </div>
  );
}
