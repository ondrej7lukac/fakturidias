Feature: Guest Mode Invoice Management
  As a guest user (not logged in)
  I want to create and manage invoices
  So that I can try the app before committing to an account

  Background:
    Given I am in guest mode

  Scenario: Guest can create and save one invoice
    When I fill in the supplier name with "Jan Novák"
    And I fill in the client name with "Acme Studio"
    And I save the invoice
    Then the invoice should appear in the list

  Scenario: Guest is blocked from saving a second new invoice
    When I fill in the supplier name with "Jan Novák"
    And I fill in the client name with "Acme Studio"
    And I save the invoice
    And I click the "Nová faktura" button
    And I try to save a new invoice with client "Another Client"
    Then I should see a guest limit warning
