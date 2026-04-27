Feature: Parallel Testing - Suppress/Enrich on Commercial List Records
  Tests parallel conflict detection when maker and approver operate on the same
  WC Main Premium commercial list record simultaneously using two browser sessions.

  Background:
    Given the maker is logged in and navigated to WC Main Premium commercial list
    And a clean record is identified with no pending actions

  # ==================== Suppress/Enrich Record (SER) ====================

  @SER @Approve
  Scenario Outline: SER - Suppress/Enrich Record with <workflow> workflow
    When the maker performs Suppress/Enrich on the record with tags "<tags>" reason "<reason>" review period "<reviewPeriod>" comment "<comment>" attachment "<attachment>"
    And the approver opens a separate browser session and navigates to Tasks
    And the approver claims and <workflow> the request
    And the maker retries the same Suppress/Enrich action on the stale view
    Then the expected outcome for "<workflow>" workflow should be validated

    Examples:
      | tags                                  | reason                | reviewPeriod          | comment      | attachment | workflow |
      | Enrich Tag                            | Vessel suppression   | Annual (365 Days)     | Test comment | With       | Approve  |
      | Customer Enrich Tag 1                 | Vessel suppression    | Half yearly (180 Days)| Without      | With       | Approve  |
      | Enrich Tag,Customer Enrich 2          | Vessel suppression     | Quarterly (90 Days)   | Test comment | With       | Approve  |
      | Enrich Tag                            | Vessel suppression   | Monthly (30 Days)     | Without      | With       | Reject   |
      | Customer Enrich Tag 1                 | Vessel suppression    | Fortnightly (14 Days) | Test comment | With       | Reject   |
      | Enrich Tag,Customer Enrich 2          | Vessel suppression    | Weekly (7 Days)       | Without      | With       | Reject   |
      | Enrich Tag                            | Vessel suppression   | Annual (365 Days)     | Test comment | With       | Withdraw |
      | Customer Enrich Tag 1                 | Vessel suppression    | Half yearly (180 Days)| Without      | With       | Withdraw |
      | Enrich Tag,Customer Enrich 2          | Vessel suppression     | Quarterly (90 Days)   | Without      | With       | Withdraw |

  # ==================== Suppress Attribute (SA) ====================

  @SA
  Scenario Outline: SA - Suppress <attributeType> attribute row <row> with <workflow> workflow
    When the maker suppresses "<attributeType>" attribute at row <row> with tags "<tags>" reason "<reason>" review period "<reviewPeriod>" comment "<comment>"
    And the approver opens a separate browser session and navigates to Tasks
    And the approver claims and <workflow> the request
    And the maker retries the same suppress attribute action on the stale view
    Then the expected outcome for "<workflow>" workflow should be validated

    Examples:
      | attributeType | row | tags                          | reason                              | reviewPeriod          | comment      | workflow |
      | Alias         | 0   | Enrich Tag                    | Weak alias suppression              | Annual (365 Days)     | Test comment | Approve  |
      | Alias         | 1   | Customer Enrich Tag 1         | Weak alias suppression            | Half yearly (180 Days)| Without      | Reject   |
      | ID            | 0   | Enrich Tag,Customer Enrich 2  | Weak alias suppression              | Quarterly (90 Days)   | Test comment | Approve  |
      | ID            | 0   | Enrich Tag                    | Weak alias suppression                  | Monthly (30 Days)     | Without      | Withdraw |
      | Alias         | 0   | Customer Enrich Tag 1         | Weak alias suppression                | Fortnightly (14 Days) | Test comment | Reject   |
      | ID            | 0   | Enrich Tag                    | Weak alias suppression      | Weekly (7 Days)       | Without      | Withdraw |

  # ==================== Enrich Attribute (EA) ====================

  @EA
  Scenario Outline: EA - Enrich <attributeType> attribute with <workflow> workflow
    When the maker enriches "<attributeType>" attribute with tags "<tags>" reason "<reason>" review period "<reviewPeriod>" comment "<comment>" aliasType "<aliasType>" langCode "<langCode>" name "<name>" idType "<idType>" idNumber "<idNumber>" date "<date>"
    And the approver opens a separate browser session and navigates to Tasks
    And the approver claims and <workflow> the request
    And the maker retries the same enrich attribute action on the stale view
    Then the expected outcome for "<workflow>" workflow should be validated

    Examples:
      | attributeType | tags                          | reason                         | reviewPeriod          | comment      | aliasType | langCode | name        | idType | idNumber | date       | workflow |
      | Alias         | Enrich Tag                    | Weak alias suppression         | Annual (365 Days)     | Test comment | Alias     | en       | TestAlias_1 | N/A    | N/A      | N/A        | Approve  |
      | Alias         | Customer Enrich Tag 1         | World check derived suppression       | Half yearly (180 Days)| Without      | Alias     | fr       | TestAlias_2 | N/A    | N/A      | N/A        | Reject   |
      | Alias         | Enrich Tag,Customer Enrich 2  | World check derived suppression         | Quarterly (90 Days)   | Test comment | Alias     | en       | TestAlias_3 | N/A    | N/A      | N/A        | Withdraw |
      | ID            | Enrich Tag                    | Vessel suppression             | Monthly (30 Days)     | Test comment | N/A       | N/A      | N/A         | Dfat   | ID_001   | N/A        | Approve  |
      | ID            | Customer Enrich Tag 1         | World check derived suppression           | Fortnightly (14 Days) | Without      | N/A       | N/A      | N/A         | Dfat   | ID_002   | N/A        | Reject   |
      | ID            | Enrich Tag,Customer Enrich 2  | World check derived suppression | Weekly (7 Days)       | Test comment | N/A       | N/A      | N/A         | Dfat   | ID_003   | N/A        | Withdraw |

  # ==================== Edit Profile View (EPV) ====================

  @EPV @NoChange
  Scenario: EPV - No-change edit should have Submit disabled
    When the maker clicks Edit on the profile view without making changes
    Then the Submit button should be disabled

  @EPV @SuppressInEdit
  Scenario Outline: EPV - Suppress <attributeType> in Edit mode with <workflow> workflow
    When the maker clicks Edit on the profile view
    And the maker suppresses "<attributeType>" attribute at row <row> in edit mode with tags "<tags>" reason "<reason>" review period "<reviewPeriod>" comment "<comment>"
    And the maker submits the edit
    And the approver opens a separate browser session and navigates to Tasks
    And the approver claims and <workflow> the request
    And the maker retries the same edit suppress action on the stale view
    Then the expected outcome for "<workflow>" workflow should be validated

    Examples:
      | attributeType | row | tags                          | reason                         | reviewPeriod          | comment      | workflow |
      | Alias         | 0   | Enrich Tag                    | Weak alias suppression         | Annual (365 Days)     | Test comment | Approve  |
      | Alias         | 1   | Customer Enrich Tag 1         | World check derived suppression       | Half yearly (180 Days)| Without      | Reject   |
      | ID            | 0   | Enrich Tag,Customer Enrich 2  | World check derived suppression         | Quarterly (90 Days)   | Test comment | Approve  |
      | ID            | 0   | Enrich Tag                    | Vessel suppression             | Monthly (30 Days)     | Without      | Withdraw |

  @EPV @EnrichInEdit
  Scenario Outline: EPV - Enrich <attributeType> in Edit mode with <workflow> workflow
    When the maker clicks Edit on the profile view
    And the maker enriches "<attributeType>" in edit mode with tags "<tags>" reason "<reason>" review period "<reviewPeriod>" comment "<comment>" aliasType "<aliasType>" langCode "<langCode>" name "<name>" idType "<idType>" idNumber "<idNumber>" date "<date>"
    And the maker submits the edit
    And the approver opens a separate browser session and navigates to Tasks
    And the approver claims and <workflow> the request
    And the maker retries the same edit enrich action on the stale view
    Then the expected outcome for "<workflow>" workflow should be validated

    Examples:
      | attributeType | tags                          | reason                         | reviewPeriod          | comment      | aliasType | langCode | name         | idType | idNumber | date       | workflow |
      | Alias         | Enrich Tag                    | Weak alias suppression         | Annual (365 Days)     | Test comment | Alias     | en       | EditAlias_1  | N/A    | N/A      | N/A        | Approve  |
      | Alias         | Customer Enrich Tag 1         | World check derived suppression       | Half yearly (180 Days)| Without      | Alias     | fr       | EditAlias_2  | N/A    | N/A      | N/A        | Reject   |
      | ID            | Enrich Tag,Customer Enrich 2  | World check derived suppression         | Quarterly (90 Days)   | Test comment | N/A       | N/A      | N/A          | Dfat   | ID_004   | N/A        | Approve  |
      | ID            | Enrich Tag                    | Vessel suppression             | Monthly (30 Days)     | Without      | N/A       | N/A      | N/A          | Dfat   | ID_005   | N/A        | Withdraw |
