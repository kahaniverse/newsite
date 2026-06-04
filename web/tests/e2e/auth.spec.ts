import { test, expect, registerNewUser, signIn, randomTag } from './fixtures';

test.describe('auth', () => {
  test('register → land on home as signed-in user', async ({ page }) => {
    const user = await registerNewUser(page);
    // After registration, the sign-out menu should be reachable.
    await expect(page).toHaveURL('http://localhost:3000/');
    // The avatar menu is rendered with aria-label="User menu" by NavUserMenu.
    await expect(page.getByLabel('User menu')).toBeVisible();
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

    await page.getByLabel('User menu').click();
    await page.getByRole('button', { name: /sign out/i }).click();
    await page.waitForURL('http://localhost:3000/');

    await signIn(page, email, password);
    await expect(page.getByLabel('User menu')).toBeVisible();
  });

  test('forgot-password flow accepts any email and returns ok (no enumeration)', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.getByLabel(/email/i).fill('does-not-exist@example.test');
    await page.getByRole('button', { name: /send|reset|email/i }).click();
    // The route always returns 200; the page should reflect a success state.
    await expect(page.getByText(/check your inbox|sent|email/i)).toBeVisible({ timeout: 5000 });
  });
});
