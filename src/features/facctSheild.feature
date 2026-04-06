@transactionCheck @org:QAAutomation
Feature: Transaction Screening Navigation
  As a user of the Facctum platform
  I want to navigate to Customer Screening functionality
  And validate card states using common validation feature

  Background:
    Given user is logged in and on the home page

  @transactionCheck
  Scenario: Transaction Screening Validation
    # Validate all card states using common validation feature
    When User validate the card states
    Then "List Management" card should be enabled
    And "Customer Screening" card should be enabled
    When User click on "Customer Screening" card
    Then validate that the user is on the "Dashboard" page
    
    Then User Click on Pre Screening Rule tab
    Then user checks Pre Screening Rule page
    Then user validate the view icon button on Pre Screening Rule page
    Then user add the new Pre Screening Rule
    Then user validate the newly added Pre Screening Rule
    Then user validate the edit icon button on Pre Screening Rule page

    # Logout and login with approver user to claim and approve the rule
    Then user logs out from the application
    Then user logs in with approver user
    Then user navigates to the Home page
    When User click on "Customer Screening" card
    Then User Click on Pre Screening Rule tab
    Then user navigates to Pre Screening Rule pending approval tab
    Then user searches and claims the Pre Screening Rule
    Then user opens the claimed Pre Screening Rule
    Then user approves the claimed Pre Screening Rule
    Then user validates the Pre Screening Rule is approved

    And user collapses the left panel
