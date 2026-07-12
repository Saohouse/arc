import crypto from "crypto";
import { prisma } from "./prisma";
import { hashPassword } from "./auth";
import { buildPasswordResetUrl, sendPasswordResetEmail } from "./email";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashResetToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function generateResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return;
  }

  await prisma.passwordResetToken.deleteMany({
    where: {
      userId: user.id,
      usedAt: null,
    },
  });

  const token = generateResetToken();
  const tokenHash = hashResetToken(token);

  await prisma.passwordResetToken.create({
    data: {
      tokenHash,
      userId: user.id,
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });

  await sendPasswordResetEmail({
    to: user.email,
    name: user.name,
    resetUrl: buildPasswordResetUrl(token),
  });
}

export async function validateResetToken(token: string) {
  const tokenHash = hashResetToken(token);

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    return null;
  }

  return resetToken;
}

export async function resetPasswordWithToken(
  token: string,
  newPassword: string
): Promise<{ success: true } | { error: string }> {
  const resetToken = await validateResetToken(token);

  if (!resetToken) {
    return { error: "This reset link is invalid or has expired. Please request a new one." };
  }

  const hashedPassword = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { password: hashedPassword },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
    prisma.session.deleteMany({
      where: { userId: resetToken.userId },
    }),
    prisma.passwordResetToken.deleteMany({
      where: {
        userId: resetToken.userId,
        id: { not: resetToken.id },
      },
    }),
  ]);

  return { success: true };
}
