@Search @FacctList @org:facctum
Feature: FacctList Global Search
  As a FacctList user
  I want to search for records across all watchlists
  So that I can quickly find specific records by ID or name

  Background:
    Given user is logged in and on the FacctList dashboard

  @Search @Smoke
  Scenario: Search by Record ID
    When user navigates to Search page
    And user searches for record ID "35"
    Then search results should be displayed
    And the results table should contain at least 1 record

  @Search @Smoke
  Scenario: Search by record name
    When user navigates to Search page
    And user searches for name "IBRAHIM"
    Then search results should be displayed
    And the results table should contain at least 1 record

  @Search @Regression
  Scenario: Search with no results
    When user navigates to Search page
    And user searches for record ID "99999999"
    Then no results message should be displayed

  @Search @Regression
  Scenario: Open record from search results
    When user navigates to Search page
    And user searches for record ID "35"
    Then search results should be displayed
    When user opens the first record from search results
    Then the record profile drawer should be visible

  @Search @Regression
  Scenario: Clear search and verify reset
    When user navigates to Search page
    And user searches for name "IBRAHIM"
    Then search results should be displayed
    When user clears the search
    Then the search input should be empty

  @Search @Regression
  Scenario Outline: Search with entity type filter
    When user navigates to Search page
    And user opens the search filter panel
    And user selects entity type "<entityType>"
    And user applies search filters
    And user searches for name "<name>"
    Then search results should be displayed

    Examples:
      | entityType  | name     |
      | Individual  | IBRAHIM  |
      | Entity      | BANK     |
