import { Resend } from "resend";
import { getAppUrl } from "./app-url";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const fromAddress = process.env.EMAIL_FROM || "ARC <onboarding@resend.dev>";

export async function sendPasswordResetEmail({
  to,
  name,
  resetUrl,
}: {
  to: string;
  name: string;
  resetUrl: string;
}) {
  if (!resend) {
    if (process.env.NODE_ENV === "development") {
      console.log("[dev] Password reset email skipped — RESEND_API_KEY not set");
      console.log(`[dev] Reset link for ${to}: ${resetUrl}`);
      return;
    }

    throw new Error("Email service is not configured");
  }

  const { error } = await resend.emails.send({
    from: fromAddress,
    to,
    subject: "Reset your ARC password",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #111;">
        <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 8px;">ARC</h1>
        <p style="color: #666; margin: 0 0 24px; font-size: 14px;">Archive · Relationships · Continuity</p>
        <p style="font-size: 16px; line-height: 1.5; margin: 0 0 16px;">Hi ${name},</p>
        <p style="font-size: 16px; line-height: 1.5; margin: 0 0 24px;">
          We received a request to reset your password. Click the button below to choose a new one.
          This link expires in 1 hour.
        </p>
        <a href="${resetUrl}" style="display: inline-block; background: #111; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; font-weight: 500;">
          Reset password
        </a>
        <p style="font-size: 14px; line-height: 1.5; color: #666; margin: 24px 0 0;">
          If you didn't request this, you can safely ignore this email. Your password won't change.
        </p>
        <p style="font-size: 12px; color: #999; margin: 32px 0 0; word-break: break-all;">
          Or copy this link: ${resetUrl}
        </p>
      </div>
    `,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export function buildPasswordResetUrl(token: string): string {
  return `${getAppUrl()}/reset-password?token=${token}`;
}
