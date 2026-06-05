/**
 * Demo-mode cooperation — used ONLY for unattended marketing screencasts (see
 * web/demo/). It lets the @mydemo/core browser driver record authenticated pages
 * without a human at the keyboard, by exposing a passwordless "demo" sign-in that
 * impersonates a seeded author.
 *
 * SECURITY: this is OFF unless `NEXT_PUBLIC_DEMO_MODE === "1"` is set in the
 * server environment at runtime. Every demo affordance is gated on {@link DEMO_MODE}
 * (the provider is omitted, the demo-login route 404s, the server action no-ops).
 * NEVER set this flag in a production deployment.
 */
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === '1';

/**
 * The seeded author the demo session signs in as. Exists after `npm run db:seed`
 * (a sci-fi novelist who authored stories in Exodus 2120 — good for screencasts).
 * The session() callback resolves the row from this auth_id, exactly like a real login.
 */
export const DEMO_AUTHOR_AUTH_ID = 'seed:meera-rao';

if (DEMO_MODE) {
  // Loud breadcrumb so this can never be on by accident unnoticed.
  console.warn(
    '[kahaniverse] DEMO_MODE is ON — passwordless demo sign-in is enabled. ' +
      'This must NEVER run in production.',
  );
}
