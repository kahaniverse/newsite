// Shared E2E helpers — keep them small so individual specs read top-down.
import { test as base, expect, type Page } from '@playwright/test';

export const test = base.extend({});
export { expect };

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
