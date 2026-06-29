import { Resend } from 'resend';

interface SendArgs {
  from:    string;
  to:      string;
  subject: string;
  html:    string;
}

// In dev, when no RESEND_API_KEY is configured, print the email to stdout
// instead of trying to call the Resend API. This lets the password reset
// flow be exercised locally without an inbox.
export async function sendEmail(args: SendArgs): Promise<{ ok: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[email] RESEND_API_KEY missing in production; email NOT sent');
      return { ok: false };
    }
    // Dev fallback — log the message.
    const banner = '═'.repeat(60);
    console.log(`\n${banner}\n📧 DEV EMAIL (no RESEND_API_KEY set)\n${banner}`);
    console.log(`From:    ${args.from}`);
    console.log(`To:      ${args.to}`);
    console.log(`Subject: ${args.subject}`);
    console.log(`Body:\n${args.html}`);
    console.log(`${banner}\n`);
    return { ok: true };
  }

  const resend = new Resend(apiKey);
  await resend.emails.send(args);
  return { ok: true };
}

const ADMIN_EMAIL = 'anshuman.das@gmail.com';

/**
 * Fire-and-forget notification to the site owner on every new SIGNUP (account
 * creation) — never on sign-in. `identifier` is the email for credentials
 * signups, or the generated pen name for OAuth/anonymous signups (the
 * anonymity design never persists a real OAuth name/email).
 */
export async function notifyAdminSignup(args: { identifier: string; provider: string }): Promise<void> {
  await sendEmail({
    from:    'Kahaniverse <noreply@kahaniverse.com>',
    to:      ADMIN_EMAIL,
    subject: 'KAHANIVERSE',
    html:    `<p>${args.identifier}</p><p>via ${args.provider}</p>`,
  });
}
