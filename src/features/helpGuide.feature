@HelpGuide @org:facctum
Feature: Help Guide Panel
  As a user of the Facctum Platform
  I want to access the Help Guide panel
  So that I can view documentation and guidance for using the platform

  Background:
    Given user is logged in to the Facctum Platform

  @HelpGuideComplete
  Scenario: Verify Help Guide panel functionality and all sidebar links
    # Open and verify panel display
    When user clicks on the help icon in the header
    Then the Help Guide panel should be displayed
    And the Help Guide panel title should be "Facctum Platform Guide"
    And the Help Guide iframe should load from "assets.facctum.com"
    
    # Verify iframe content contains expected sections
    And the Help Guide content should contain the following sections:
      | section              |
      | Platform             |
      | Login and Access     |
      | Password Requirements|
      | Home                 |
      | Section Map          |
    
    # Verify Section Map navigation items
    And the Help Guide Section Map should contain:
      | item          |
      | Groups        |
      | Roles         |
      | Help          |
      | Reports       |
      | Users         |
      | Login         |
      | Profile View  |
    
    # Verify Login and Access section content
    And the Help Guide content should contain the following text:
      | text                         |
      | Single Sign-On (SSO)         |
      | Non-SSO Login                |
      | Forgotten Password           |
      | At least 8 characters        |
    
    # Expand to new tab and verify all sidebar sections
    When user clicks on the expand icon to open Help Guide in new tab
    
    # Platform section links
    Then user should verify Platform section sidebar links:
      | linkText         | expectedTitle                           | expectedContent                                                    |
      | Groups           | Groups - Facctum Platform Guide         | Groups enable administrators to bundle roles                       |
      | Roles            | Roles - Facctum Platform Guide          | Roles module enables administrators to define custom roles         |
      | Help             | Help - Facctum Platform Guide           | Help empowers users to quickly seek assistance                     |
      | Users            | Users - Facctum Platform Guide          | Users can be added or removed by administrators                    |
      | Platform Reports | Reports - Facctum Platform Guide        | Reports module enables administrators to generate and download     |
      | Login            | Login - Facctum Platform Guide          | Login process in the Facctum Platform supports                     |
      | Notifications    | Notifications - Facctum Platform Guide  | Notifications in the platform keep users up to date on key events  |
      | Tags             | Tags - Facctum Platform Guide           | Tags serve as a versatile mechanism for controlling access         |
      | Profile View     | Profile View - Facctum Platform Guide   | Profile View provide users with quick access                       |
    
    # FacctList section links (main level)
    Then user should verify FacctList section sidebar links:
      | linkText              | expectedTitle                                 | expectedContent                                                    |
      | Dashboard             | Dashboard - Facctum Platform Guide            | provides an at-a-glance overview of your FacctList environment     |
      | Tasks                 | Tasks - Facctum Platform Guide                | Tasks provides users with access to a range of items               |
      | Search                | Search - Facctum Platform Guide               | Search                                                             |
      | Watchlists            | Watchlists - Facctum Platform Guide           | Watchlists are collections of records used to support screening    |
      | Data Export           | Data Export - Facctum Platform Guide          | Data Export centralises the configuration                          |
      | FacctList Reports     | Reports - Facctum Platform Guide              | Reports module enables users to generate, schedule, and manage     |
    
    # FacctList > Watchlists submenu links
    Then user should verify Watchlists submenu sidebar links:
      | linkText                | expectedTitle                                       | expectedContent                                                              |
      | Commercial Lists        | Commercial Lists - Facctum Platform Guide           | Commercial Lists are watchlists provided by third-party vendor               |
      | Regulatory Lists        | Regulatory Lists - Facctum Platform Guide           | Regulatory Lists are publicly available watchlists published                 |
      | Press Releases          | Press Releases - Facctum Platform Guide             | Press Releases provide early access to newly published regulatory            |
      | Internal Lists          | Internal Lists - Facctum Platform Guide             | Internal Lists—also known as Blocklists                                      |
      | Reconciliation          | Reconciliation - Facctum Platform Guide             | Reconciliation enables you to compare official regulatory watchlists         |
      | Suppressed and Enriched | Suppressed and Enriched - Facctum Platform Guide    | Suppressed and Enriched lets you manage one-off record or alias overrides    |
    
    # FacctList > Data Export submenu links
    Then user should verify Data Export submenu sidebar links:
      | linkText           | expectedTitle                                  | expectedContent                                                              |
      | Templates          | Templates - Facctum Platform Guide             | Templates define how watchlists                                              |
      | Custom Delta       | Custom Delta - Facctum Platform Guide          | custom delta compares two snapshots of the underlying data                   |
      | Destination Config | Destination Config - Facctum Platform Guide    | Destination Config defines the downstream location where an output file      |
      | Downloads          | Downloads - Facctum Platform Guide             | Downloads module displays files generated from advanced filter options       |
    
    # FacctView section links (main level)
    Then user should verify FacctView section sidebar links:
      | linkText              | expectedTitle                                      | expectedContent                                                              |
      | Case Register         | Case Register - Facctum Platform Guide             | Case Register provides users with view of all compliance cases               |
      | Screening Register    | Screening Register - Facctum Platform Guide        | Screening Register records and tracks all screening activities               |
      | Entity Register       | Entity Register - Facctum Platform Guide           | Entity Register stores all entity information in the system                  |
      | Customer Screening    | Customer Screening - Facctum Platform Guide        | Customer Screening helps institutions identify high-risk individuals         |
      | Transaction Screening | Transaction Screening - Facctum Platform Guide     | Transaction Screening enables real-time screening of financial transactions  |
      | FacctView Reports     | Reports - Facctum Platform Guide                   | Reports provided for generating, managing, and reviewing screening-related   |
      | FacctView Watchlists  | Watchlists - Facctum Platform Guide                | Watchlist configuration allows administrators to select, subscribe to        |
      | Queues                | Queues - Facctum Platform Guide                    | Queues enable skill-based routing of compliance cases                        |
    
    # FacctView > Customer Screening submenu links
    Then user should verify Customer Screening submenu sidebar links:
      | linkText                       | expectedTitle                                            | expectedContent                                                                        |
      | CS Dashboard                   | Dashboard - Facctum Platform Guide                       | Customer Screening Dashboard provides a real-time overview of system performance       |
      | On Demand Screening            | On Demand Screening - Facctum Platform Guide             | On-Demand Screening allows users to instantly screen individual customers              |
      | Batch Screening                | Batch Screening - Facctum Platform Guide                 | Batch Screening enables users to screen large volumes of customer                      |
      | CS Post-Screening Rules        | Post-Screening Rules - Facctum Platform Guide            | Post-Screening Rules enable organizations to define configurable validation            |
      | CS Screening Profile           | Screening Profile - Facctum Platform Guide               | Screening Profile defines the rules, thresholds, and watchlists                        |
    
    # FacctView > Transaction Screening submenu links
    Then user should verify Transaction Screening submenu sidebar links:
      | linkText                       | expectedTitle                                            | expectedContent                                                                        |
      | TS Dashboard                   | Dashboard - Facctum Platform Guide                       | Transaction Screening Dashboard provides a real-time overview of transaction screening |
      | Transaction Simulator          | Transaction Simulator - Facctum Platform Guide           | Transaction Simulator allows users to submit test transactions in JSON format          |
      | Pre-Screening Rules            | Pre-Screening Rules - Facctum Platform Guide             | Pre-Screening Rules enable organizations to define configurable validation             |
      | TS Post-Screening Rules        | Post-Screening Rules - Facctum Platform Guide            | Post-Screening Rules enable organizations to define configurable validation            |
      | TS Screening Profile           | Screening Profile - Facctum Platform Guide               | Screening Profile defines the rules, thresholds, and watchlists                        |

  @HelpGuideClose
  Scenario: Verify Help Guide panel can be closed
    When user clicks on the help icon in the header
    Then the Help Guide panel should be displayed
    When user clicks the CLOSE button on the Help Guide panel
    Then the Help Guide panel should be closed
