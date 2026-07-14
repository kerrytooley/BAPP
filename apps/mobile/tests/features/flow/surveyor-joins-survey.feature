Feature: Surveyor joins a survey end to end
  As a surveyor
  I want to join a survey using a shared code
  So that I can confirm I am joining the correct survey

  Scenario: Surveyor joins an existing survey with a valid code
    Given an existing survey named "Dusk count" with postcode "SW1A 1AA"
    And the app is open on the welcome screen
    When the surveyor chooses to join as a surveyor
    And enters the shared survey code
    Then the survey details are shown for confirmation
