/**
 * Send transactional emails via Resend.
 * Without a custom domain, use from: onboarding@resend.dev (Resend free tier).
 */

import { Resend } from "resend";

// Resend free tier: use onboarding@resend.dev when no custom domain
const FROM = process.env.EMAIL_FROM ?? "onboarding@resend.dev";

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key?.trim()) {
    console.warn("[email] RESEND_API_KEY not set; skipping send");
    return null;
  }
  return new Resend(key);
}

/**
 * Send approval email after admin approves a user.
 */
export async function sendApprovalEmail(
  to: string,
  name: string | null,
  loginUrl: string
): Promise<{ ok: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) return { ok: true };

  const displayName = name?.trim() || "there";
  const subject = "You're approved for LinkedIn Ads Intelligence!";
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 480px;">
  <p>Hi ${escapeHtml(displayName)},</p>
  <p>Great news! Your account is ready. You can now log in and start tracking LinkedIn advertisers.</p>
  <p><a href="${escapeHtml(loginUrl)}" style="display: inline-block; background: #0A66C2; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 6px;">Log in now</a></p>
  <p style="color: #666; font-size: 14px;">If the button doesn't work, copy this link: ${escapeHtml(loginUrl)}</p>
  <p style="margin-top: 24px; color: #888; font-size: 12px;">— LinkedIn Ads Intelligence</p>
</body>
</html>
`.trim();

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: [to],
      subject,
      html,
    });
    if (error) {
      console.error("[email] Approval send failed:", error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[email] Approval send error:", message);
    return { ok: false, error: message };
  }
}

/**
 * Send rejection email when admin rejects a signup.
 */
export async function sendRejectionEmail(to: string): Promise<{ ok: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) return { ok: true };

  const subject = "Thanks for your interest";
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 480px;">
  <p>Thanks for your interest in LinkedIn Ads Intelligence.</p>
  <p>We're currently at capacity and aren't able to approve your account right now. We'll keep your details on file and may reach out when we have availability.</p>
  <p style="margin-top: 24px; color: #888; font-size: 12px;">— LinkedIn Ads Intelligence</p>
</body>
</html>
`.trim();

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: [to],
      subject,
      html,
    });
    if (error) {
      console.error("[email] Rejection send failed:", error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[email] Rejection send error:", message);
    return { ok: false, error: message };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
