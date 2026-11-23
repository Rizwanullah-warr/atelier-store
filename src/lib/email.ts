import "server-only";

// Transactional email through Resend's HTTP API. Without RESEND_API_KEY nothing
// is sent, and callers must say so in the UI instead of pretending it worked.

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

// Resend only lets you send from onboarding@resend.dev until a domain is
// verified, and then only to the address that owns the Resend account.
const fromAddress = () =>
  process.env.EMAIL_FROM || "Atelier <onboarding@resend.dev>";

export const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!,
  );

export type SendEmailResult = { ok: true } | { ok: false; error: string };

export async function sendEmail(message: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "Email is not configured." };

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: fromAddress(), ...message }),
      signal: AbortSignal.timeout(10_000),
    });
    if (response.ok) return { ok: true };
    const body = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    return {
      ok: false,
      error: `Resend rejected the email (${response.status}): ${body?.message ?? "unknown error"}`,
    };
  } catch (error) {
    return {
      ok: false,
      error: `Could not reach Resend: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// Shared layout for the two account emails.
export function accountEmail({
  heading,
  intro,
  action,
  url,
  outro,
}: {
  heading: string;
  intro: string;
  action: string;
  url: string;
  outro: string;
}) {
  return {
    text: `${heading}\n\n${intro}\n\n${action}: ${url}\n\n${outro}`,
    html: `<div style="font-family:Georgia,serif;max-width:480px;margin:0 auto;padding:32px;color:#1a1a1a">
<p style="letter-spacing:0.3em;font-size:20px">ATELIER</p>
<h1 style="font-weight:400;font-size:28px">${escapeHtml(heading)}</h1>
<p style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6">${escapeHtml(intro)}</p>
<p><a href="${escapeHtml(url)}" style="display:inline-block;background:#1a1a1a;color:#fff;padding:14px 28px;font-family:Arial,sans-serif;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;text-decoration:none">${escapeHtml(action)}</a></p>
<p style="font-family:Arial,sans-serif;font-size:12px;color:#777;line-height:1.6">${escapeHtml(outro)}</p>
</div>`,
  };
}
