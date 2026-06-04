import { test, expect, registerNewUser, randomTag } from './fixtures';

test.describe('profile', () => {
  test('user edits their bio and sees it on their profile', async ({ page }) => {
    await registerNewUser(page);
    const bio = `Bio set by Playwright ${randomTag()}.`;

    await page.goto('/profile/edit');
    // ProfileForm: the bio is a textarea with this placeholder; submit is "Update".
    await page.getByPlaceholder(/tell readers about yourself/i).fill(bio);
    await page.getByRole('button', { name: /update/i }).click();

    // The form pushes to /profile on success; the bio renders in the hero.
    await page.waitForURL('http://localhost:3000/profile');
    await expect(page.getByText(bio)).toBeVisible();
  });

  test('profile edit requires auth (redirects to login)', async ({ page }) => {
    // A fresh context via a brand-new page would carry no cookie; here we just
    // assert the protected route bounces to /login when hit without a session.
    await page.context().clearCookies();
    await page.goto('/profile/edit');
    await expect(page).toHaveURL(/\/login/);
  });
});
