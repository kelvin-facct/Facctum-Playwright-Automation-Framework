@OFACNonSDNMapping @RegulatoryList @org:datavium
Feature: OFAC NON-SDN Data Mapping Verification
  As a QA engineer
  I want to verify that OFAC NON-SDN XML source data is correctly mapped to MongoDB and displayed on the UI Profile View
  So that I can ensure data integrity across the ingestion pipeline (XML → DB → UI)

  Background:
    Given user is logged in and on the home page
    When User click on "List Management" card
    And user clicks on Watchlist dropdown
    And user clicks on Regulatory list option
    And user searches and opens "OFAC NON SDN" regulatory list
    And user clicks on Records tab

  # ==================== XML to DB Mapping Verification ====================

  @XMLtoDBMapping @smoke
  Scenario: Verify XML to DB mapping for Individual record (entity 50476)
    When user verifies XML to DB mapping for entity "50476"
    Then all mapped XML fields should be present in MongoDB
    And the entity type should be "Individual"
    And the primary name should be "MARTELLY, Michel Joseph"
    And all name entries should match XML source
    And all address entries should match XML source
    And all ID document entries should match XML source
    And all feature fields should match XML source
    And the mapping verification result should be attached to report

  @XMLtoDBMapping @smoke
  Scenario: Verify XML to DB mapping for Entity record (entity 17013)
    When user verifies XML to DB mapping for entity "17013"
    Then all mapped XML fields should be present in MongoDB
    And the entity type should be "Entity"
    And the primary name should be "VTB BANK PUBLIC JOINT STOCK COMPANY"
    And all name entries should match XML source
    And all address entries should match XML source
    And all ID document entries should match XML source
    And the mapping verification result should be attached to report

  @XMLtoDBMapping @regression
  Scenario Outline: Verify XML to DB mapping for diverse records
    When user verifies XML to DB mapping for entity "<entityId>" using xml "<xmlFile>" and mapping "<mappingFile>"
    Then all mapped XML fields should be present in MongoDB
    And the entity type should be "<entityType>"
    And all name entries should match XML source
    And all address entries should match XML source
    And all ID document entries should match XML source
    And all feature fields should match XML source
    And no XML data should be missing from the database

    Examples:
      | entityId | entityType | xmlFile                              | mappingFile              | description                                     |
      | 50476    | Individual | 20260623T141041_cons_enhanced.xml    | OFAC_NON_SDN_Mapping.xlsx | Individual with DOB, Gender, Nationality, IDs   |
      | 17013    | Entity     | 20260623T141041_cons_enhanced.xml    | OFAC_NON_SDN_Mapping.xlsx | Entity with 31 names, 8 IDs, 12 addresses      |
      | 15268    | Entity     | 20260623T141041_cons_enhanced.xml    | OFAC_NON_SDN_Mapping.xlsx | Entity with F.K.A. names, SWIFT/BIC, remarks    |
      | 30930    | Entity     | 20260623T141041_cons_enhanced.xml    | OFAC_NON_SDN_Mapping.xlsx | Entity with 21 IDs (USCC, ISIN), 10 SSI        |
      | 9639     | Individual | 20260623T141041_cons_enhanced.xml    | OFAC_NON_SDN_Mapping.xlsx | Individual with basic data set                  |

  @XMLtoDBMapping @nameTypes
  Scenario: Verify all name type mappings are correct
    When user verifies XML to DB mapping for entity "17013"
    Then the following name types should be mapped correctly:
      | nameType       | description                         |
      | Primary        | isPrimary=true, Latin script        |
      | A.K.A.         | isPrimary=false, aliasType=A.K.A.   |
      | F.K.A.         | isPrimary=false, aliasType=F.K.A.   |
      | Native primary | isPrimary=true, non-Latin script    |
      | Native A.K.A   | isPrimary=false, non-Latin script   |
    And name category "strong" should map from isLowQuality "false"
    And name category "weak" should map from isLowQuality "true"

  @XMLtoDBMapping @idTypes
  Scenario: Verify all ID type mappings are correct
    When user verifies XML to DB mapping for entity "17013"
    Then the following ID types should be present in MongoDB:
      | idType                   | expectedValue   |
      | BIK (RU)                 | 044030707       |
      | SWIFT/BIC                | VTBRRUMM        |
      | Legal Entity Number      | 253400V1H6ART1UQ0N98 |
      | Registration ID          | 1027739609391   |
      | Government Gazette Number| 00032520        |
      | Tax ID No.               | 7702070139      |
      | License                  | 1000            |

  @XMLtoDBMapping @dateFormat
  Scenario: Verify date format mapping from XML to DB
    When user verifies XML to DB mapping for entity "50476"
    Then the birthdate should be stored in ISO format "1961-02-12"
    And the birthdate date type should be "DOB"
    And isApproximate should be "false"
    And isDateRange should be "false"

  @XMLtoDBMapping @addressMapping
  Scenario: Verify address part type mapping
    When user verifies XML to DB mapping for entity "50476"
    Then the following address mappings should be correct:
      | xmlAddressPart | dbField          | expectedValue    |
      | CITY           | city             | Miami            |
      | STATE/PROVINCE | stateOrProvince  | FL               |
      | CITY           | city             | Petionville      |
      | STATE/PROVINCE | stateOrProvince  | Ouest            |
    And address country "United States" should be in addressDetailsList
    And address country "Haiti" should be in addressDetailsList
    And address country "Dominican Republic" should be in addressDetailsList

  @XMLtoDBMapping @bulkValidation
  Scenario: Verify all 442 entities are mapped correctly
    When user verifies XML to DB mapping for all entities
    Then the pass rate should be at least 99 percent
    And the total field checks should be greater than 16000
    And the verification summary should be attached to report

  # ==================== Profile View UI Verification ====================
  # Generic: Fetches record from DB dynamically, verifies whatever fields exist on UI.
  # No hardcoded IDs — works with any record that has data in MongoDB.

  @ProfileView @smoke
  Scenario Outline: Verify Profile View displays all DB fields on UI for record <entityId>
    When user searches for record "<entityId>" in the records table
    And user clicks on the record ID to open profile view
    And user waits for profile view to load
    Then user verifies all DB fields are visible on PRIMARY DETAILS tab for entity "<entityId>"
    When user clicks on ADDITIONAL DETAILS tab
    Then user verifies all DB fields are visible on ADDITIONAL DETAILS tab for entity "<entityId>"
    And user captures profile view evidence for entity "<entityId>"
    And user closes the profile view

    Examples:
      | entityId | xmlFile                           | mappingFile               | description                                |
      | 50476    | 20260623T141041_cons_enhanced.xml | OFAC_NON_SDN_Mapping.xlsx | Individual - DOB, Gender, Nationality, IDs |
      | 17013    | 20260623T141041_cons_enhanced.xml | OFAC_NON_SDN_Mapping.xlsx | Entity - 31 names, 8 IDs, 12 addresses     |
      | 15268    | 20260623T141041_cons_enhanced.xml | OFAC_NON_SDN_Mapping.xlsx | Entity - F.K.A., SWIFT/BIC, remarks        |
      | 30930    | 20260623T141041_cons_enhanced.xml | OFAC_NON_SDN_Mapping.xlsx | Entity - 21 IDs (USCC, ISIN), 10 SSI       |

  @ProfileView @regression
  Scenario: Verify Profile View for a random active record from DB
    When user picks a random active record from MongoDB for OFAC NON SDN
    And user searches for the picked record in the records table
    And user clicks on the record ID to open profile view
    And user waits for profile view to load
    Then user verifies all DB fields are visible on PRIMARY DETAILS tab
    When user clicks on ADDITIONAL DETAILS tab
    Then user verifies all DB fields are visible on ADDITIONAL DETAILS tab
    And user captures profile view evidence
    And user closes the profile view

  # ==================== UI Gap Analysis ====================

  @UIGapAnalysis @regression
  Scenario Outline: Identify DB fields not displayed on Profile View UI for <entityId>
    When user searches for record "<entityId>" in the records table
    And user clicks on the record ID to open profile view
    And user waits for profile view to load
    Then user captures full UI text from both tabs
    And user compares UI text against MongoDB document for entity "<entityId>"
    And any DB fields not visible on UI should be reported
    And the UI gap analysis should be attached to report
    And user closes the profile view

    Examples:
      | entityId | description                    |
      | 50476    | Individual - full data         |
      | 17013    | Entity - many names and IDs    |
      | 15268    | Entity - with remarks          |
      | 30930    | Entity - many ISINs            |

  # ==================== Excel Mapping Sheet Validation ====================

  @MappingSheet @regression
  Scenario: Verify all Excel mapping entries have corresponding DB fields
    When user loads the OFAC NON SDN mapping sheet
    Then all mapping entries with a SingleStore field should have a valid DB target
    And conditional mappings with "if equals to" should be applied correctly
    And no mapping entry should point to a non-existent collection field

  @MappingSheet @regression
  Scenario: Verify unmapped XML fields are intentionally excluded
    When user parses the XML source file for entity "50476"
    And user compares all XML fields against the mapping sheet
    Then the following XML fields should be intentionally unmapped:
      | xmlField                   | reason                          |
      | @refId attributes          | Internal OFAC reference IDs     |
      | generalInfo.identityId     | Internal identity tracking      |
      | feature.versionId          | Version metadata                |
      | namePart.@id               | Granular element IDs            |
      | addressPart.@id            | Granular element IDs            |
      | feature.valueRefId         | Internal value references       |
    And no business-critical data should be missing from the mapping
