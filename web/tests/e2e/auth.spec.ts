import { test, expect, registerNewUser, signIn, randomTag } from './fixtures';

test.describe('auth', () => {
  test('register → land on home as signed-in user', async ({ page }) => {
    const user = await registerNewUser(page);
    await expect(page).toHaveURL('http://localhost:3000/');
    // Signed-in nav exposes authoring affordances and drops the "Sign In" link.
    await expect(page.getByRole('link', { name: /sign in/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /new story|new universe/i }).first()).toBeVisible();
    expect(user.email).toContain('@');
  });

  test('login with wrong password shows an error', async ({ page }) => {
    await page.goto('/login');
    // Both auth forms live in the DOM; target the login form's unique input ids.
    await page.locator('#loginEmail').fill('nope@nope.test');
    await page.locator('#loginPassword').fill('wrongwrongwrong');
    await page.getByRole('button', { name: /enter the universe/i }).click();
    await expect(page.getByText(/incorrect email or password/i)).toBeVisible();
  });

  test('register → sign out → sign back in', async ({ page }) => {
    const tag = randomTag();
    const { email, password } = await registerNewUser(page, tag);

    // Sign-out lives in ProfileActions on the profile screen. Signed-out home
    // redirects to the static landing, so assert the signed-out nav, not a URL.
    await page.goto('/profile');
    await page.getByRole('button', { name: /sign out/i }).click();
    await expect(page.getByRole('link', { name: /sign in/i }).first()).toBeVisible();

    await signIn(page, email, password);
    await expect(page.getByRole('link', { name: /sign in/i })).toHaveCount(0);
  });

  test('forgot-password flow accepts any email and returns ok (no enumeration)', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.getByLabel(/email/i).fill('does-not-exist@example.test');
    await page.getByRole('button', { name: /send|reset|email/i }).click();
    // The route always returns 200; the page should reflect a success state.
    await expect(page.getByText(/check your inbox|sent|email/i)).toBeVisible({ timeout: 5000 });
  });
});
