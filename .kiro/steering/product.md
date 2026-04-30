# Product Overview

This is an end-to-end test automation framework for **Facctum Platform** - an Anti-Money Laundering (AML) compliance application.

## Purpose
Automated browser testing for the Facctum Platform web application, covering:
- User authentication and login flows
- Dashboard functionality
- Case management workflows
- Screening operations (Customer, Transaction)
- Pre-screening rules management
- List management
- Approval workflows (maker/approver)

## Target Application
- Web-based AML compliance platform
- Requires authenticated access
- Multi-environment support (QA, Dev, Stage, Stage-UK, Stage-IND, UAT, Prod)
- Multi-tenant architecture with organization-based access
- Supports `@org:xxx` tags on scenarios to test against different organizations (e.g., `@org:facctum`)

## Key Modules
- **List Management** - Commercial and internal list management
- **Tasks** - Record approval workflows (Pending L1/L2, claim, accept/reject)
- **Customer Screening** - Customer due diligence screening
- **Transaction Screening** - Transaction monitoring and screening
- **Pre-Screening Rules** - Rule configuration for automated screening
- **Transaction Monitoring** - Real-time transaction monitoring
- **Commercial List (WC Main Premium)** - Commercial watchlist management with record profile operations (Watchlist → Commercial list → WC Main Premium → Find clean records → Suppress/Enrich/Edit operations)
- **Profile View Operations** - Record profile view with Suppress/Enrich Record (SER), Suppress Attribute (SA), Enrich Attribute (EA), and Edit Profile View (EPV) operations. Includes audit trail verification and version conflict detection for parallel testing scenarios.
- **IBL Deduplication** - Internal Block List duplicate record verification (Watchlist → Internal List → Add record → Verify duplicates)
- **IBL Single Record Creation** - Internal Block List single record creation workflow (Watchlist → Internal List → Add Records → Single record → Fill form → Submit for approval). Supports record types: Individual, Entity, Bank, Vessel. Note: Default test list "Facctview IBL" only supports Individual type; other types require a list configured for those record types.
- **UK Sanctions (Regulatory List)** - UK Sanctions list viewing with advanced filtering (Watchlist → Regulatory List → UK SANCTIONS → Filter by Designated Date, Id Type, Program Source, Regime Name, Type → Download as Excel/TSV)
- **OFAC (Regulatory List)** - OFAC list viewing with advanced filtering (Watchlist → Regulatory List → OFAC → Filter by Address country, Citizenship country, Nationality country, Program name, Type, Last Updated Date → Download as Excel/TSV)
- **Help Guide** - In-app documentation panel accessible via help icon in header. Displays "Facctum Platform Guide" with sections covering Platform Portal, Login and Access, Password Requirements, Home, and Section Map navigation. Content loads from assets.facctum.com in an iframe.
