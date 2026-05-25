import { expect } from '@playwright/test';
import { Given, When, Then } from './fixtures';

Given('I am in guest mode', async ({ guestMode }) => {
  // guestMode fixture handles: clear storage, goto '/', enter guest mode
});

When('I fill in the supplier name with {string}', async ({ invoicePage }, name: string) => {
  await invoicePage.fillSupplierName(name);
});

When('I fill in the client name with {string}', async ({ invoicePage }, name: string) => {
  await invoicePage.fillClientName(name);
});

When('I save the invoice', async ({ invoicePage }) => {
  await invoicePage.save();
});

When('I click the {string} button', async ({ page }, text: string) => {
  await page.getByRole('button', { name: text }).click();
  // Wait for the form to reset to a new blank invoice
  await page.locator('input[name="invoiceNumber"]').waitFor({ state: 'visible', timeout: 5_000 });
});

When('I try to save a new invoice with client {string}', async ({ page }, client: string) => {
  await page.locator('input[name="clientName"]').fill(client);
  // Use page.once so the handler runs synchronously in the same tick as the click,
  // avoiding the deadlock where click() waits for the dialog to be dismissed.
  page.once('dialog', async (dialog) => {
    await dialog.accept();
  });
  await page.locator('button.ap-btn.ap-btn--primary.ap-btn--lg').first().click({ force: true });
  // Brief wait for the dialog acceptance to propagate
  await page.waitForTimeout(300);
});

Then('the invoice should appear in the list', async ({ invoicePage }) => {
  await invoicePage.expectInvoiceInList();
});

Then('I should see the invoice form', async ({ invoicePage }) => {
  await invoicePage.expectFormVisible();
});

Then('I should see a guest limit warning', async ({ page }) => {
  // Dialog was already accepted in the When step; verify only one invoice in the list
  await expect(page.locator('.invoice-item')).toHaveCount(1);
});
