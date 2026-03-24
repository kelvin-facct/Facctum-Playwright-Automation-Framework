Feature: Commercial List
  @CommercialList 
  Scenario: Successful login with valid credentials
    When user clicks on list management
    Then user should see "facctlist" in the end of url
    When user click on "Watchlist" and then clicks on "Commercial list" 
    Then Commercial list page should open
