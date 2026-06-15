// Shared E2E helpers — keep them small so individual specs read top-down.
import { test as base, expect, type Page, type BrowserContext } from '@playwright/test';

export const test = base.extend({});
export { expect };

// Deterministic, UI-free auth: register (idempotent) then complete the NextAuth
// credentials flow over REST so the session cookie lands in this context's jar —
// every page in the context is then signed in. Avoids the flaky cold-start of the
// browser register/sign-in form. Returns the author id. Use a fresh context per
// user to keep their sessions isolated.
export async function loginViaApi(
  context: BrowserContext,
  user: { displayName: string; email: string; password: string },
): Promise<string> {
  const reg = await context.request.post('/api/auth/register', {
    data: { displayName: user.displayName, email: user.email, password: user.password },
  });
  // 201 = created, 409 = already exists from a previous run — both are fine.
  expect([201, 409]).toContain(reg.status());

  const csrf = (await (await context.request.get('/api/auth/csrf')).json()).csrfToken as string;
  await context.request.post('/api/auth/callback/credentials', {
    form: { csrfToken: csrf, email: user.email, password: user.password, callbackUrl: 'http://localhost:3000/', json: 'true' },
  });

  const session = await (await context.request.get('/api/auth/session')).json();
  expect(session?.user?.id, `sign-in failed for ${user.email}`).toBeTruthy();
  return session.user.id as string;
}

// Random suffix per worker so reruns don't trip duplicate-email/pen-name guards.
export function randomTag(): string {
  return Math.random().toString(36).slice(2, 9);
}

// AuthCard renders BOTH the login and signup forms in the DOM (the inactive tab
// panel is just `hidden`), so label/role lookups for "Email"/"Password" are
// ambiguous. Target the form's unique input ids instead.
export async function registerNewUser(page: Page, tag = randomTag()) {
  const displayName = `e2e-${tag}`;
  const email       = `${tag}@example.test`;
  const password    = 'password123';

  await page.goto('/register');
  await page.locator('#signupName').fill(displayName);
  await page.locator('#signupEmail').fill(email);
  await page.locator('#signupPassword').fill(password);
  await page.locator('#signupConfirm').fill(password);
  await page.getByRole('button', { name: /begin your story/i }).click();

  // After successful register the form auto-signs-in + pushes to /.
  await page.waitForURL('http://localhost:3000/');
  return { displayName, email, password };
}

export async function signIn(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.locator('#loginEmail').fill(email);
  await page.locator('#loginPassword').fill(password);
  await page.getByRole('button', { name: /enter the universe/i }).click();
  await page.waitForURL('http://localhost:3000/');
}
