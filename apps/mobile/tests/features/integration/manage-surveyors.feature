Feature: Managing surveyors
  As a survey admin
  I want to add and remove surveyors
  So that the survey team is accurate

  Scenario: Admin adds another surveyor
    Given the add surveyors screen is open with a lead surveyor
    When the admin adds another surveyor
    Then two surveyor cards are shown

  Scenario: Admin removes an additional surveyor
    Given the add surveyors screen is open with a lead and an extra surveyor
    When the admin removes the extra surveyor
    Then the extra surveyor is removed from the survey
