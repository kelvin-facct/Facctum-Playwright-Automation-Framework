Feature: Commercial List
  # Use @org:your-org-id to override the default organisation
  # Example: @org:acme-corp will login to "acme-corp" instead of the default from .env.secrets
  
  @CommercialList @org:facctum
  Scenario: Successful login with valid credentials
    When user clicks on list management
    Then user should see "facctlist" in the end of url
    When user click on "Watchlist" and then clicks on "Commercial list" 
    Then Commercial list page should open
