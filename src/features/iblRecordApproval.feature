@IBLRecordApproval
Feature: IBL Record Approval and Validation
  As an approver
  I want to approve IBL records submitted for approval
  So that the records can be added to the internal list

  Background:
    Given user is logged in and on the home page

  @IBLRecordApproval @org:facctum
  Scenario: IBL Record Approval and Validation
    When User click on "List Management" card
    Then validate that the user is on the "Dashboard" page
    When user clicks on Tasks button
    Then validate that the user is on the "Tasks" page
    And user collapses the left panel
    Then user can see all main tabs on Tasks page
    When the Pending L1 tab is already active
    And user clicks on sub tab INTERNAL RECORDS
    And user filters to show only unclaimed records
    And user clicks on Double Arrow Right icon
    Then user selects the latest record to approve
    And user claims and accepts the record
    Then the record should be approved successfully
