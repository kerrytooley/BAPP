Feature: Capturing survey details
  As a survey admin
  I want to enter the core survey details
  So that surveyors know where and when to meet

  Scenario: Admin provides a name and postcode
    Given the create survey screen is open
    When the admin enters the survey name "Dusk count"
    And the admin enters the postcode "SW1A 1AA"
    And the admin continues
    Then the survey details are saved with name "Dusk count" and postcode "SW1A 1AA"
    And the admin is taken to upload the boundary

  Scenario: Admin is blocked by a failing save
    Given the create survey screen is open
    And saving the survey will fail
    When the admin continues
    Then the admin stays on the create survey screen
