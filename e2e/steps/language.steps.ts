import { expect } from '@playwright/test';
import { Given, When, Then } from './fixtures';

When('I switch the app language to English', async ({ invoicePage }) => {
  await invoicePage.switchLanguage('EN');
});

When('I switch the app language to Czech', async ({ invoicePage }) => {
  await invoicePage.switchLanguage('CS');
});

Then('the save button should read {string}', async ({ invoicePage }, text: string) => {
  await invoicePage.expectSaveButtonText(text);
});
