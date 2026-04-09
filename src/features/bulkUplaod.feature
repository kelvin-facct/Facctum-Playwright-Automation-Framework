@bulkUpload
Feature: IBL Bulk Upload Records
  As a user with list management permissions
  I want to bulk upload records to an Internal List
  So that I can efficiently add multiple records at once

  @bulkUpload @org:barclaystest
  Scenario: Bulk upload records to Internal List
    When user clicks on list management
    Then user should see "facctlist" in the end of url
    When user clicks on Watchlist dropdown
    And user clicks on Internal List
    And user searches and selects list "Group Private List Delta 20250822"
    And user clicks on Add Record button
    And user selects Bulk upload option
    And user uploads file "C:\PlayWright-main\PlayWright-main\src\resources\testData\Barclays US list 20250822-19-Dec-2025-14_48_28.xlsx"
    And user enters bulk upload comments "Bulk upload of records - Automated test"
    And user clicks Submit for Approval button
    Then bulk upload should be submitted successfully
