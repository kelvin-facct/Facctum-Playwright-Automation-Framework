Feature: Commercial List - WC Main Premium
  # Single scenario covering filters, multi-filters, downloads, and random filters
  # All in one flow to avoid repeated login/navigation

  @CommercialListValidation @CommercialListActive @org:facctum
  Scenario: Validate WC Main Premium Active list filters and downloads against MongoDB
    # --- Navigate to WC Main Premium (once) ---
    When user clicks on list management
    Then user should see "facctlist" in the end of url
    When user click on "Watchlist" and then clicks on "Commercial list"
    Then Commercial list page should open
    When user searches for "WC Main Premium" in commercial list
    And user clicks on "WC Main Premium" list
    # --- Tab Count Validation (skipped - requires org-specific listAnalytics config) ---
    # --- Single Filter Validation (9 filters) ---
    When user clicks on the filter icon
    And user selects "active" in the "PEP Status" filter
    And user clicks Apply filter
    Then compare filtered count with MongoDB for "PEP Status" "active"
    When user clicks on the filter icon
    And user selects "C1" in the "Update Category" filter
    And user clicks Apply filter
    Then compare filtered count with MongoDB for "Update Category" "C1"
    When user clicks on the filter icon
    And user selects "INDIVIDUAL" in the "Category" filter
    And user clicks Apply filter
    Then compare filtered count with MongoDB for "Category" "INDIVIDUAL"
    When user clicks on the filter icon
    And user selects "PEP N" in the "Sub Category" filter
    And user clicks Apply filter
    Then compare filtered count with MongoDB for "Sub Category" "PEP N"
    When user clicks on the filter icon
    And user selects "Entity" in the "Type" filter
    And user clicks Apply filter
    Then compare filtered count with MongoDB for "Type" "Entity"
    When user clicks on the filter icon
    And user selects "JAPAN" in the "Citizenship" filter
    And user clicks Apply filter
    Then compare filtered count with MongoDB for "Citizenship" "JAPAN"
    When user clicks on the filter icon
    And user selects "JAPAN" in the "Country" filter
    And user clicks Apply filter
    Then compare filtered count with MongoDB for "Country" "JAPAN"
    When user clicks on the filter icon
    And user selects "OFAC" in the "Keyword" filter
    And user clicks Apply filter
    Then compare filtered count with MongoDB for "Keyword" "OFAC"
    When user clicks on the filter icon
    And user selects "Fraud" in the "Special Interest Categories" filter
    And user clicks Apply filter
    Then compare filtered count with MongoDB for "Special Interest Categories" "Fraud"
    # --- Multi-Filter Combinations ---
    When user clicks on the filter icon
    And user selects "INDIVIDUAL" in the "Category" filter
    And user selects "active" in the "PEP Status" filter
    And user clicks Apply filter
    Then compare filtered count with MongoDB for multi-filter "category=INDIVIDUAL,pepStatus=active"
    When user clicks on the filter icon
    And user selects "INDIVIDUAL" in the "Category" filter
    And user selects "inactive" in the "PEP Status" filter
    And user clicks Apply filter
    Then compare filtered count with MongoDB for multi-filter "category=INDIVIDUAL,pepStatus=inactive"
    When user clicks on the filter icon
    And user selects "CRIME - NARCOTICS" in the "Category" filter
    And user selects "Entity" in the "Type" filter
    And user clicks Apply filter
    Then compare filtered count with MongoDB for multi-filter "category=CRIME - NARCOTICS,entityTypeName=Entity"
    When user clicks on the filter icon
    And user selects "DIPLOMAT" in the "Category" filter
    And user selects "Individual" in the "Type" filter
    And user clicks Apply filter
    Then compare filtered count with MongoDB for multi-filter "category=DIPLOMAT,entityTypeName=Individual"
    When user clicks on the filter icon
    And user selects "Entity" in the "Type" filter
    And user selects "C1" in the "Update Category" filter
    And user clicks Apply filter
    Then compare filtered count with MongoDB for multi-filter "entityTypeName=Entity,updateCategory=C1"
    When user clicks on the filter icon
    And user selects "INDIVIDUAL" in the "Category" filter
    And user selects "active" in the "PEP Status" filter
    And user selects "PEP N" in the "Sub Category" filter
    And user clicks Apply filter
    Then compare filtered count with MongoDB for multi-filter "category=INDIVIDUAL,pepStatus=active,subCategory=PEP N"
    When user clicks on the filter icon
    And user selects "Individual" in the "Type" filter
    And user selects "active" in the "PEP Status" filter
    And user selects "C1" in the "Update Category" filter
    And user clicks Apply filter
    Then compare filtered count with MongoDB for multi-filter "entityTypeName=Individual,pepStatus=active,updateCategory=C1"
    When user clicks on the filter icon
    And user selects "DIPLOMAT" in the "Category" filter
    And user selects "active" in the "PEP Status" filter
    And user selects "PEP N" in the "Sub Category" filter
    And user selects "C6" in the "Update Category" filter
    And user clicks Apply filter
    Then compare filtered count with MongoDB for multi-filter "category=DIPLOMAT,pepStatus=active,subCategory=PEP N,updateCategory=C6"
    # --- Random Filter Validation (single filters) ---
    When user clicks on the filter icon
    And user selects a random value in the "Category" filter and stores it
    And user clicks Apply filter
    Then validate random filter selections against MongoDB
    When user clicks on the filter icon
    And user selects a random value in the "PEP Status" filter and stores it
    And user clicks Apply filter
    Then validate random filter selections against MongoDB
    When user clicks on the filter icon
    And user selects a random value in the "Update Category" filter and stores it
    And user clicks Apply filter
    Then validate random filter selections against MongoDB
    When user clicks on the filter icon
    And user selects a random value in the "Sub Category" filter and stores it
    And user clicks Apply filter
    Then validate random filter selections against MongoDB
    When user clicks on the filter icon
    And user selects a random value in the "Type" filter and stores it
    And user clicks Apply filter
    Then validate random filter selections against MongoDB
    # --- Random Multi-Filter Combos ---
    When user clicks on the filter icon
    And user selects a random value in the "Category" filter and stores it
    And user selects a random value in the "PEP Status" filter and stores it
    And user clicks Apply filter
    Then validate random filter selections against MongoDB
    When user clicks on the filter icon
    And user selects a random value in the "Category" filter and stores it
    And user selects a random value in the "Type" filter and stores it
    And user selects a random value in the "Update Category" filter and stores it
    And user clicks Apply filter
    Then validate random filter selections against MongoDB
    # --- Summary ---
    Then print filter comparison summary
    # --- Download Validation (TSV & Excel) ---
    When user clicks on the filter icon
    And user selects "active" in the "PEP Status" filter
    And user clicks Apply filter
    Then the filter banner should display "PEP Status = active"
    And the filter banner should display 1 filter chips
    And the pagination should be valid and navigable
    # Download TSV (PEP Status = active)
    When user triggers download as "tsv"
    And user waits for download to complete
    Then the latest download entry should show type "Active record download"
    And the latest download entry should show file type "tsv"
    And the latest download entry should show 1 filters applied
    And the latest download entry should show status "Success"
    And the latest download filter details should show "PEP Status"
    And the downloaded "tsv" file should match MongoDB row count and record data
    # Download Excel (PEP Status = active)
    When user triggers download as "xlsx"
    And user waits for download to complete
    Then the latest download entry should show type "Active record download"
    And the latest download entry should show file type "xlsx"
    And the latest download entry should show status "Success"
    And the downloaded "xlsx" file should match MongoDB row count and record data
    # --- Download with smaller filter (CRIME - NARCOTICS + Entity = ~20 records) ---
    When user clears commercial list filters
    When user clicks on the filter icon
    And user selects "CRIME - NARCOTICS" in the "Category" filter
    And user selects "Entity" in the "Type" filter
    And user clicks Apply filter
    Then the filter banner should display 2 filter chips
    When user triggers download as "tsv"
    And user waits for download to complete
    And the downloaded "tsv" file should match MongoDB row count and record data
    When user triggers download as "xlsx"
    And user waits for download to complete
    And the downloaded "xlsx" file should match MongoDB row count and record data
    # --- Download with Keyword filter (OFAC = ~290 records) ---
    When user clears commercial list filters
    When user clicks on the filter icon
    And user selects "OFAC" in the "Keyword" filter
    And user clicks Apply filter
    When user triggers download as "tsv"
    And user waits for download to complete
    And the downloaded "tsv" file should match MongoDB row count and record data


  # ==================== Deleted Tab Validation ====================
  @CommercialListValidation @CommercialListDeleted @org:facctum
  Scenario: Validate WC Main Premium Deleted list filters against MongoDB
    # --- Navigate to WC Main Premium ---
    When user clicks on list management
    Then user should see "facctlist" in the end of url
    When user click on "Watchlist" and then clicks on "Commercial list"
    Then Commercial list page should open
    When user searches for "WC Main Premium" in commercial list
    And user clicks on "WC Main Premium" list
    # --- Switch to Deleted tab ---
    When user clicks on the Deleted tab
    And the pagination should be valid and navigable
    # --- Single Filter Validation ---
    When user clicks on the filter icon
    And user selects "active" in the "PEP Status" filter
    And user clicks Apply filter
    Then compare deleted filtered count with MongoDB for "PEP Status" "active"
    When user clicks on the filter icon
    And user selects "INDIVIDUAL" in the "Category" filter
    And user clicks Apply filter
    Then compare deleted filtered count with MongoDB for "Category" "INDIVIDUAL"
    When user clicks on the filter icon
    And user selects "Entity" in the "Type" filter
    And user clicks Apply filter
    Then compare deleted filtered count with MongoDB for "Type" "Entity"
    When user clicks on the filter icon
    And user selects "C1" in the "Update Category" filter
    And user clicks Apply filter
    Then compare deleted filtered count with MongoDB for "Update Category" "C1"
    When user clicks on the filter icon
    And user selects "inactive" in the "PEP Status" filter
    And user clicks Apply filter
    Then compare deleted filtered count with MongoDB for "PEP Status" "inactive"
    # --- Multi-Filter Combinations ---
    When user clicks on the filter icon
    And user selects "INDIVIDUAL" in the "Category" filter
    And user selects "active" in the "PEP Status" filter
    And user clicks Apply filter
    Then compare deleted filtered count with MongoDB for multi-filter "category=INDIVIDUAL,pepStatus=active"
    When user clicks on the filter icon
    And user selects "Entity" in the "Type" filter
    And user selects "C1" in the "Update Category" filter
    And user clicks Apply filter
    Then compare deleted filtered count with MongoDB for multi-filter "entityTypeName=Entity,updateCategory=C1"
    # --- Random Filter ---
    When user clicks on the filter icon
    And user selects a random value in the "Category" filter and stores it
    And user clicks Apply filter
    Then validate deleted random filter selections against MongoDB
    When user clicks on the filter icon
    And user selects a random value in the "PEP Status" filter and stores it
    And user selects a random value in the "Type" filter and stores it
    And user clicks Apply filter
    Then validate deleted random filter selections against MongoDB
    # --- Summary ---
    Then print filter comparison summary


  # ==================== Suppressed/Enriched Tab Validation ====================
  @CommercialListValidation @CommercialListSuppressed @org:facctum
  Scenario: Validate WC Main Premium Suppressed-Enriched list filters against MongoDB
    # --- Navigate to WC Main Premium ---
    When user clicks on list management
    Then user should see "facctlist" in the end of url
    When user click on "Watchlist" and then clicks on "Commercial list"
    Then Commercial list page should open
    When user searches for "WC Main Premium" in commercial list
    And user clicks on "WC Main Premium" list
    # --- Switch to Suppressed/Enriched tab ---
    When user clicks on the Suppressed enriched tab
    And the pagination should be valid and navigable
    # --- Single Filter: Action ---
    When user clicks on the filter icon
    And user selects "2002" in the "Action" filter
    And user clicks Apply filter
    Then compare suppressed filtered count with MongoDB for "Action" "2002"
    When user clicks on the filter icon
    And user selects "2003" in the "Action" filter
    And user clicks Apply filter
    Then compare suppressed filtered count with MongoDB for "Action" "2003"
    When user clicks on the filter icon
    And user selects "2004" in the "Action" filter
    And user clicks Apply filter
    Then compare suppressed filtered count with MongoDB for "Action" "2004"
    # --- Single Filter: Type ---
    When user clicks on the filter icon
    And user selects "Entity" in the "Type" filter
    And user clicks Apply filter
    Then compare suppressed filtered count with MongoDB for "Type" "Entity"
    When user clicks on the filter icon
    And user selects "Individual" in the "Type" filter
    And user clicks Apply filter
    Then compare suppressed filtered count with MongoDB for "Type" "Individual"
    # --- Single Filter: Tag ---
    When user clicks on the filter icon
    And user selects "47" in the "Tag" filter
    And user clicks Apply filter
    Then compare suppressed filtered count with MongoDB for "Tag" "47"
    When user clicks on the filter icon
    And user selects "50" in the "Tag" filter
    And user clicks Apply filter
    Then compare suppressed filtered count with MongoDB for "Tag" "50"
    # --- Multi-Filter: Action + Type ---
    When user clicks on the filter icon
    And user selects "2002" in the "Action" filter
    And user selects "Entity" in the "Type" filter
    And user clicks Apply filter
    Then compare suppressed filtered count with MongoDB for multi-filter "statusId=2002,entityTypeName=Entity"
    # --- Random Filter ---
    When user clicks on the filter icon
    And user selects a random value in the "Action" filter and stores it
    And user selects a random value in the "Type" filter and stores it
    And user clicks Apply filter
    Then validate suppressed random filter selections against MongoDB
    # --- Summary ---
    Then print filter comparison summary


  # ==================== Advanced Filter Validations ====================
  @CommercialListValidation @CommercialListAdvanced @org:facctum
  Scenario: Validate WC Main Premium advanced filter operations
    # --- Navigate to WC Main Premium ---
    When user clicks on list management
    Then user should see "facctlist" in the end of url
    When user click on "Watchlist" and then clicks on "Commercial list"
    Then Commercial list page should open
    When user searches for "WC Main Premium" in commercial list
    And user clicks on "WC Main Premium" list
    # --- 1. Validate visible table rows match DB ---
    Then the visible table rows should match MongoDB records
    # --- 2. Select All in Category filter should equal total ---
    When user clicks on the filter icon
    And user selects Select All in the "Category" filter
    And user clicks Apply filter
    Then the filtered count should equal the total unfiltered count
    # --- 3. Multi-select within same category (OR logic) ---
    When user clicks on the filter icon
    And user selects "INDIVIDUAL" in the "Category" filter
    And user selects "DIPLOMAT" in the "Category" filter
    And user clicks Apply filter
    Then compare filtered count with MongoDB for multi-select "Category" values "INDIVIDUAL,DIPLOMAT"
    # --- 4. Clear individual filter chip ---
    When user clicks on the filter icon
    And user selects "INDIVIDUAL" in the "Category" filter
    And user selects "active" in the "PEP Status" filter
    And user clicks Apply filter
    Then the filter banner should display 2 filter chips
    When user removes the filter chip "Category = INDIVIDUAL"
    Then the filter banner should display 1 filter chips
    And the filtered count should match MongoDB for remaining filters
    # --- 5. Row per page change ---
    When user clears commercial list filters
    When user clicks on the filter icon
    And user selects "CRIME - NARCOTICS" in the "Category" filter
    And user clicks Apply filter
    Then the pagination should show correct row count after changing rows per page
    # --- 6. Cross-tab count consistency ---
    Then the sum of Active and Deleted tab counts should match total records in DB
    # --- Summary ---
    Then print filter comparison summary
