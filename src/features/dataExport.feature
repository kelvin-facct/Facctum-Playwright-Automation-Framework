@DataExport @FacctList
Feature: FacctList Data Export
  As a FacctList user
  I want to manage data export templates and destinations
  So that I can export watchlist data in configured formats

  Background:
    Given user is logged in and on the FacctList dashboard

  # ==================== Templates ====================

  @DataExport @Templates @Smoke
  Scenario: Navigate to Templates and verify page loads
    When user navigates to Data Export Templates
    Then the Templates page should be loaded

  @DataExport @Templates @Regression
  Scenario: View existing templates list
    When user navigates to Data Export Templates
    Then the Templates page should be loaded
    And the templates table should display records or show no data message

  # ==================== Destination Config ====================

  @DataExport @DestinationConfig @Smoke
  Scenario: Navigate to Destination Config and verify page loads
    When user navigates to Data Export Destination Config
    Then the Destination Config page should be loaded

  @DataExport @DestinationConfig @Regression
  Scenario: View existing destination configurations
    When user navigates to Data Export Destination Config
    Then the Destination Config page should be loaded
    And the destination config table should display records or show no data message
