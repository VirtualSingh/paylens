import { expect, test } from '@playwright/test';

test('the app shell loads with its main navigation', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', { level: 1, name: 'How ACME pays people' }),
  ).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'Main' }).getByRole('link'),
  ).toHaveText([
    'Dashboard',
    'People',
    'Pay bands',
    'Imports',
    'Audit log',
    'Settings',
  ]);
});
