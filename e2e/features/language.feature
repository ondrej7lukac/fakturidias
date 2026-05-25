Feature: Language Toggle
  As a user
  I want to switch between Czech and English
  So that I can use the app in my preferred language

  Background:
    Given I am in guest mode

  Scenario: Save button shows Czech text by default
    Then the save button should read "Uložit fakturu"

  Scenario: Save button updates when switching to English
    When I switch the app language to English
    Then the save button should read "Save Invoice"

  Scenario: Save button returns to Czech when switching back
    When I switch the app language to English
    And I switch the app language to Czech
    Then the save button should read "Uložit fakturu"
