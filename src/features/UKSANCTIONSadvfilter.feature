@UKSANCTIONSADVANCEFILTER @RegulatoryList
Feature: Regulatory UK SANCTIONS Advance Filter
  As a user
  I want to apply advanced filters on UK SANCTIONS regulatory list
  So that I can filter and download specific records

  Background:
    Given Facctlist Login 2
    And Navigate to Regulatory List 2
    And Select List name 2

  @ApplyingofUKSANCTIONSFilter
  Scenario: Applying of UK SANCTIONS Filter
    When Apply Filter in all tabs 2
    Then Check the status 2

  @FilterPanelFunctionality
  Scenario: Verify filter panel open and close functionality
    When user opens the filter panel
    Then the filter panel should be visible
    When user closes the filter panel
    Then the filter panel should be closed

  @IdTypeFilter
  Scenario: Apply Id Type filter with Select All
    When user opens the filter panel
    And user selects Id Type filter with Select All
    And user applies the filter
    Then the download button should be visible
    When user clears applied filters
    Then the filter panel should be closed

  @DesignatedDateFilter
  Scenario: Apply Designated Date filter
    When user opens the filter panel
    And user sets Designated Date filter to "29/07/2012"
    And user applies the filter
    # Note: This date may not have records, so we just verify the filter was applied
    Then the filter panel should be closed

  @ProgramSourceFilter
  Scenario: Apply Program Source filter with Select All
    When user opens the filter panel
    And user selects Program Source filter with Select All
    And user applies the filter
    Then the download button should be visible

  @RegimeNameFilter
  Scenario: Apply Regime Name filter with Select All
    When user opens the filter panel
    And user selects Regime Name filter with Select All
    And user applies the filter
    Then the download button should be visible

  @TypeFilter
  Scenario: Apply Type filter with Select All
    When user opens the filter panel
    And user selects Type filter with Select All
    And user applies the filter
    Then the download button should be visible

  @TabNavigation
  Scenario: Navigate through different tabs
    When user clicks on Active tab
    Then the Active tab should be selected
    When user clicks on Error tab
    Then the Error tab should be selected
    When user clicks on Delete tab
    Then the Delete tab should be selected

  @DeltaView
  Scenario: Toggle Delta view and navigate tabs
    When user toggles Delta view
    Then the Delta view should be enabled
    When user clicks on New tab
    Then the New tab should be selected

  @DownloadFunctionality
  Scenario: Download filtered records as Tab Separated
    When user opens the filter panel
    And user selects Id Type filter with Select All
    And user applies the filter
    And user downloads as Tab Separated
    Then Check the status 2

  @DownloadExcel
  Scenario: Download filtered records as Excel
    When user opens the filter panel
    And user selects Id Type filter with Select All
    And user applies the filter
    And user downloads as Excel
    Then the toaster message should be displayed
