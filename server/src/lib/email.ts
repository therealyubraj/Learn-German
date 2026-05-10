import { Env } from "../types";

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function sendWithResend({
  env,
  recipient,
  subject,
  text,
  html,
}: {
  env: Env;
  recipient: string;
  subject: string;
  text: string;
  html: string;
}) {
  if (!env.RESEND_API_KEY || !env.EMAIL_SENDER) {
    throw new Error(
      "Resend email sending is not configured. Add RESEND_API_KEY and EMAIL_SENDER.",
    );
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_SENDER,
      to: [recipient],
      subject,
      text,
      html,
    }),
  });

  if (response.ok) {
    return;
  }

  const errorText = await response.text();
  throw new Error(
    `Resend request failed with ${response.status}: ${errorText || "Unknown error"}`,
  );
}

export async function sendTotpEnrollmentEmail({
  env,
  recipient,
  enrollmentLink,
  expiresAt,
}: {
  env: Env;
  recipient: string;
  enrollmentLink: string;
  expiresAt: string;
}) {
  const appName = env.APP_NAME ?? "Learn Deutsch";
  const subject = `Set up ${appName} TOTP`;
  const safeLink = escapeHtml(enrollmentLink);
  const safeExpiresAt = escapeHtml(new Date(expiresAt).toLocaleString());

  const text = [
    `Set up TOTP for ${appName}.`,
    "",
    `Open this link to enroll your authenticator app:`,
    enrollmentLink,
    "",
    `This link expires at ${new Date(expiresAt).toLocaleString()}.`,
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <h2 style="margin-bottom: 16px;">Set up TOTP for ${escapeHtml(appName)}</h2>
      <p>Open the link below to enroll your authenticator app.</p>
      <p style="margin: 24px 0;">
        <a href="${safeLink}" style="display: inline-block; background: #00C896; color: #0D1117; text-decoration: none; font-weight: 700; padding: 12px 18px; border-radius: 12px;">
          Open enrollment page
        </a>
      </p>
      <p>If the button does not work, copy and paste this link into your browser:</p>
      <p><a href="${safeLink}">${safeLink}</a></p>
      <p style="margin-top: 24px; color: #6B7280;">This link expires at ${safeExpiresAt}.</p>
    </div>
  `;

  await sendWithResend({ env, recipient, subject, text, html });
}
