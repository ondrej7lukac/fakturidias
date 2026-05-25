import { expect } from '@playwright/test';
import { Given, When, Then } from './fixtures';

Given('I am on the home page', async ({ page, welcomePage }) => {
  await welcomePage.goto();
});

Then('I should see the welcome screen', async ({ welcomePage }) => {
  await welcomePage.expectVisible();
});

Then('I should see a {string} button', async ({ page }, buttonText: string) => {
  await expect(page.getByRole('button', { name: buttonText })).toBeVisible();
});

When('I switch the welcome screen to English', async ({ welcomePage }) => {
  await welcomePage.switchLanguage('EN');
});

When('I click {string} on the welcome screen', async ({ page }, text: string) => {
  await page.getByRole('button', { name: text }).first().click();
});

Then('I should see the {string} hero button', async ({ page }, text: string) => {
  await expect(page.locator('.lp-hero__ctas').getByRole('button', { name: text })).toBeVisible();
});
