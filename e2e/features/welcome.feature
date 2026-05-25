Feature: Welcome Screen
  As a new visitor
  I want to see the welcome screen when I open Fakturidias
  So that I can decide whether to log in or continue as a guest

  Scenario: Visitor sees the welcome screen on first visit
    Given I am on the home page
    Then I should see the welcome screen
    And I should see a "Přihlásit se" button

  Scenario: Visitor switches to English and sees translated CTA
    Given I am on the home page
    When I switch the welcome screen to English
    Then I should see the "Continue as guest" hero button

  Scenario: Visitor clicks "Continue as guest" and enters the app
    Given I am on the home page
    When I click "Pokračovat jako host" on the welcome screen
    Then I should see the invoice form
