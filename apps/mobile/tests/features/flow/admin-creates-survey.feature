Feature: Admin creates a survey end to end
  As a survey admin
  I want to set up a survey and receive a share code
  So that I can invite surveyors to join

  Scenario: Admin completes the full survey setup flow
    Given the app is open on the welcome screen
    When the admin chooses to join as a survey admin
    And begins a new survey
    And provides the admin email "admin@example.com"
    And enters the survey name "Dusk count" and postcode "SW1A 1AA"
    And skips the red line boundary upload
    And names the lead surveyor "Alice"
    And completes the survey setup
    Then a shareable survey code is displayed
