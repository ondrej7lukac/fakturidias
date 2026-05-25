import { Page, expect } from '@playwright/test';

export class InvoicePage {
  constructor(readonly page: Page) {}

  invoiceNumberInput() {
    return this.page.locator('input[name="invoiceNumber"]');
  }

  supplierNameInput() {
    return this.page.locator('input[name="supplierName"]');
  }

  clientNameInput() {
    return this.page.locator('input[name="clientName"]');
  }

  saveButton() {
    // Primary save button in the action bar
    return this.page.locator('button.ap-btn.ap-btn--primary.ap-btn--lg').first();
  }

  langButton(code: string) {
    return this.page.locator('.lp-lang__btn', { hasText: code }).first();
  }

  invoiceListItem() {
    return this.page.locator('.invoice-item').first();
  }

  async waitForForm() {
    await this.invoiceNumberInput().waitFor({ state: 'visible', timeout: 10_000 });
  }

  async fillSupplierName(name: string) {
    await this.supplierNameInput().fill(name);
    await this.page.keyboard.press('Escape');
  }

  async fillClientName(name: string) {
    await this.clientNameInput().fill(name);
    await this.page.keyboard.press('Escape');
  }

  async save() {
    await this.saveButton().click();
  }

  async switchLanguage(code: string) {
    await this.langButton(code).click();
  }

  async expectFormVisible() {
    await expect(this.invoiceNumberInput()).toBeVisible();
  }

  async expectSaveButtonText(text: string) {
    await expect(this.saveButton()).toContainText(text);
  }

  async expectInvoiceInList() {
    await expect(this.invoiceListItem()).toBeVisible({ timeout: 8_000 });
  }
}
