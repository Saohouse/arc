import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSession, setSessionCookie, getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/components/arc/LoginForm";

async function login(prevState: any, formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return { error: "No account found with this email address" };
  }

  if (!(await verifyPassword(password, user.password))) {
    return { error: "Incorrect password. Please try again." };
  }

  const token = await createSession(user.id);
  await setSessionCookie(token);

  redirect("/");
}

export default async function LoginPage() {
  // Redirect if already logged in
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
            Sign in to your account
          </p>
        </div>

        <LoginForm action={login} />
      </div>
    </div>
  );
}
