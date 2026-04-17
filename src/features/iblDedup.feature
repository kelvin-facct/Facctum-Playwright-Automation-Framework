@IBLDedup @org:facctum
Feature: IBL Deduplication Verification
  As a user
  I want to verify duplicate records in Internal Block List
  So that I can identify potential matches before adding new records

  Background:
    Given user is logged in and on the home page

  @smoke
  Scenario: Verify IBL dedup flow with default test data
    When User click on "List Management" card
    And user clicks on Watchlist dropdown
    And user clicks on Internal list option
    And user searches and opens the default IBL list
    And user opens the single record form
    And user enters the default name in the input box
    And user clicks on VERIFY DUPLICATE button
    Then the Select Attributes page should be open
    When user clicks SUBMIT on the Select Attributes modal
    Then the Verify Duplicates page should be open
    And there should be at least 1 matching records

  @regression
  Scenario: Verify IBL dedup flow and check each record
    When User click on "List Management" card
    And user clicks on Watchlist dropdown
    And user clicks on Internal list option
    And user searches and opens list "Facctview IBL"
    And user opens the single record form
    And user enters name "UGANDA COMMERCIAL IMPEX (UCI) LTD" in the input box
    And user clicks on VERIFY DUPLICATE button
    Then the Select Attributes page should be open
    When user clicks SUBMIT on the Select Attributes modal
    Then the Verify Duplicates page should be open
    And there should be at least 1 matching records
    When user clicks on each record ID and verifies the details

  @quick
  Scenario: Perform complete IBL dedup verification flow
    When User click on "List Management" card
    And user clicks on Watchlist dropdown
    And user clicks on Internal list option
    And user performs the complete IBL dedup verification flow
    Then the Verify Duplicates page should be open
