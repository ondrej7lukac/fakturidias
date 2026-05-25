import { test as base, createBdd } from 'playwright-bdd';
import { WelcomePage } from '../pages/WelcomePage';
import { InvoicePage } from '../pages/InvoicePage';

type Fixtures = {
  welcomePage: WelcomePage;
  invoicePage: InvoicePage;
  guestMode: void;
};

export const test = base.extend<Fixtures>({
  welcomePage: async ({ page }, use) => {
    await use(new WelcomePage(page));
  },

  invoicePage: async ({ page }, use) => {
    await use(new InvoicePage(page));
  },

  // Convenience fixture: clear storage, navigate, enter guest mode
  guestMode: async ({ page }, use) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.locator('.lp-hero__ctas').waitFor({ state: 'visible', timeout: 20_000 });
    await page.locator('.lp-hero__ctas .lp-btn--secondary').click();
    await page.locator('input[name="invoiceNumber"]').waitFor({ state: 'visible', timeout: 15_000 });
    await use();
  },
});

export const { Given, When, Then } = createBdd(test);
