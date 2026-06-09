@Reconciliation @FacctList @org:facctum
Feature: FacctList Reconciliation
  As a FacctList user
  I want to compare regulatory watchlists with internal data
  So that I can identify discrepancies and ensure data accuracy

  Background:
    Given user is logged in and on the FacctList dashboard

  @Reconciliation @Smoke
  Scenario: Navigate to Reconciliation and verify page loads
    When user navigates to Reconciliation
    Then the Reconciliation page should be loaded

  @Reconciliation @Regression
  Scenario: View reconciliation records
    When user navigates to Reconciliation
    Then the Reconciliation page should be loaded
    And the reconciliation table should display records or show no data message

  @Reconciliation @Regression
  Scenario: Open reconciliation detail view
    When user navigates to Reconciliation
    And the reconciliation table has records
    When user opens the first reconciliation record
    Then the reconciliation detail view should be visible
    When user closes the reconciliation detail view
    Then the reconciliation detail view should be closed

  @Reconciliation @Regression
  Scenario: Navigate reconciliation tabs
    When user navigates to Reconciliation
    And the reconciliation table has records
    When user opens the first reconciliation record
    Then the reconciliation detail view should be visible
    When user clicks on the New tab in reconciliation
    And user clicks on the Amended tab in reconciliation
    And user clicks on the Deleted tab in reconciliation
    Then the tab content should be displayed

  @Reconciliation @Regression
  Scenario: Filter reconciliation by list name
    When user navigates to Reconciliation
    And user selects reconciliation list name "UK SANCTIONS"
    And user applies reconciliation filters
    Then the reconciliation table should display filtered results

  @Reconciliation @Regression
  Scenario: Download reconciliation report
    When user navigates to Reconciliation
    And the reconciliation table has records
    When user clicks download reconciliation report
    Then the download should be initiated
