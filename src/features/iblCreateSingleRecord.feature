@IBLCreateSingleRecord @Regression
Feature: IBL Single Record Creation
  As a FacctList user
  I want to create single IBL records
  So that I can manage internal bank list entries

  Background: User is logged in and on the dashboard
    # Login is handled by hooks using @org tag and credentials from .env.secrets

  @IBLCreateSingleRecord @Smoke @org:facctum
  Scenario: Create IBL single record with Individual type
    # Navigate to List Management
    When user clicks on list management
    Then validate that the user is on the "Dashboard" page

    # Select IBL and create record
    When User click on Watchlist dropdown
    And User click on IBL
    And User selects the list
    And User click on Add Record button
    And User select Single record option
    # Note: Facctview IBL list only supports Individual type
    And User fills mandatory fields for Individual record

    # Submit the record
    When User clicks on Submit button
    Then User submits the IBL single record

  # Note: The following scenarios require a list that supports Entity/Bank/Vessel types
  # Facctview IBL only supports Individual type
  @IBLCreateSingleRecord @org:facctum @skip
  Scenario: Create IBL single record with Entity type
    When user clicks on list management
    Then validate that the user is on the "Dashboard" page
    When User click on Watchlist dropdown
    And User click on IBL
    And User selects the list
    And User click on Add Record button
    And User select Single record option
    And User selects "Entity" as Record type
    And User fills all mandatory fields for IBL single record creation
    When User clicks on Submit button
    Then User submits the IBL single record

  @IBLCreateSingleRecord @org:facctum @skip
  Scenario: Create IBL single record with Bank type
    When user clicks on list management
    Then validate that the user is on the "Dashboard" page
    When User click on Watchlist dropdown
    And User click on IBL
    And User selects the list
    And User click on Add Record button
    And User select Single record option
    And User selects "Bank" as Record type
    And User fills all mandatory fields for IBL single record creation
    When User clicks on Submit button
    Then User submits the IBL single record

  @IBLCreateSingleRecord @org:facctum @skip
  Scenario: Create IBL single record with Vessel type
    When user clicks on list management
    Then validate that the user is on the "Dashboard" page
    When User click on Watchlist dropdown
    And User click on IBL
    And User selects the list
    And User click on Add Record button
    And User select Single record option
    And User selects "Vessel" as Record type
    And User fills all mandatory fields for Vessel record creation
    When User clicks on Submit button
    Then User submits the IBL single record

  @IBLCreateSingleRecord @org:facctum
  Scenario: Withdraw last IBL record from Pending tab
    # Navigate to List Management
    When user clicks on list management
    Then validate that the user is on the "Dashboard" page

    # Navigate to IBL
    When User click on Watchlist dropdown
    And User click on IBL
    And User selects the list

    # Withdraw the last record
    Then User withdraws the last record
