import { Page, expect } from '@playwright/test';

export class WelcomePage {
  constructor(readonly page: Page) {}

  async goto() {
    await this.page.goto('/');
    await this.page.evaluate(() => localStorage.clear());
    await this.page.reload();
    await this.page.locator('.welcome-screen').waitFor({ state: 'visible', timeout: 20_000 });
  }

  async expectVisible() {
    await expect(this.page.locator('.welcome-screen')).toBeVisible();
  }

  async expectSignInButtonVisible(text: string) {
    await expect(this.page.getByRole('button', { name: text })).toBeVisible();
  }

  langButton(code: 'CS' | 'EN') {
    return this.page.locator('.lp-lang__btn', { hasText: code }).first();
  }

  heroGuestButton() {
    // "Pokračovat jako host" / "Continue as guest" — secondary hero CTA
    return this.page.locator('.lp-hero__ctas .lp-btn--secondary');
  }

  async switchLanguage(code: 'CS' | 'EN') {
    await this.langButton(code).click();
  }

  async continueAsGuest() {
    await this.heroGuestButton().click();
  }
}
