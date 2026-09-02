Feature: Survey setup end to end
  As a survey team
  I want an admin to create a survey and a surveyor to join it with the shared code
  So that the whole onboarding flow works on a real device

  Scenario: Admin creates a survey and a surveyor joins with the shared code
    Given the app is open on the welcome screen
    When the admin chooses to join as a survey admin
    And begins a new survey
    And enters the survey name "Dusk count" and postcode "SW1A 1AA"
    And skips the red line boundary upload
    And names the lead surveyor "Alice"
    And completes the survey setup
    Then a shareable survey code is displayed
    When the admin returns home
    And the surveyor chooses to join as a surveyor
    And enters the shared survey code
    Then the survey details "Dusk count - SW1A 1AA" are shown for confirmation

  Scenario: Surveyor joins the survey and records an observation
    Given the app is open on the welcome screen
    When the admin chooses to join as a survey admin
    And begins a new survey
    And enters the survey name "Dusk count" and postcode "SW1A 1AA"
    And skips the red line boundary upload
    And names the lead surveyor "Alice"
    And completes the survey setup
    Then a shareable survey code is displayed
    When the admin returns home
    And the surveyor chooses to join as a surveyor
    And enters the shared survey code
    And confirms the survey they are joining
    And selects the lead surveyor "Alice"
    And confirms the surveyor details
    And enters the start weather conditions
    And confirms their location on the map
    And records a "Noctule" observation
    Then the "Noctule" species remains ready for the next observation
