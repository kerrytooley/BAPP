Feature: Surveyor joins a survey end to end
  As a surveyor
  I want to join a survey using a shared code and record my observations
  So that I can complete a survey session from joining to logging a bat

  Scenario: Surveyor joins an existing survey with a valid code
    Given an existing survey named "Dusk count" with postcode "SW1A 1AA" and lead surveyor "Alice"
    And the app is open on the welcome screen
    When the surveyor chooses to join as a surveyor
    And enters the shared survey code
    Then the survey details are shown for confirmation

  Scenario: Surveyor completes the join flow and records an observation
    Given an existing survey named "Dusk count" with postcode "SW1A 1AA" and lead surveyor "Alice"
    And the app is open on the welcome screen
    When the surveyor chooses to join as a surveyor
    And enters the shared survey code
    And confirms the survey they are joining
    And selects the lead surveyor "Alice"
    And confirms the surveyor details
    And enters the start weather conditions
    And confirms their location on the map
    And records a "Noctule" observation
    Then the observation is saved against the survey
