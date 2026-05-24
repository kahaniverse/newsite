// Shared E2E helpers — keep them small so individual specs read top-down.
import { test as base, expect, type Page } from '@playwright/test';

export const test = base.extend({});
export { expect };

// Random suffix per worker so reruns don't trip duplicate-email/pen-name guards.
export function randomTag(): string {
  return Math.random().toString(36).slice(2, 9);
}

export async function registerNewUser(page: Page, tag = randomTag()) {
  const displayName = `e2e-${tag}`;
  const email       = `${tag}@example.test`;
  const password    = 'password123';

  await page.goto('/register');
  await page.getByLabel('Pen Name').fill(displayName);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm Password').fill(password);
  await page.getByRole('button', { name: /begin your story/i }).click();

  // After successful register the form auto-signs-in + pushes to /.
  await page.waitForURL('http://localhost:3000/');
  return { displayName, email, password };
}

export async function signIn(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /enter the universe/i }).click();
  await page.waitForURL('http://localhost:3000/');
}
