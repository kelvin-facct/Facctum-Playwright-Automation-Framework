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
- **IBL Deduplication** - Internal Block List duplicate record verification (Watchlist → Internal List → Add record → Verify duplicates)
- **UK Sanctions (Regulatory List)** - UK Sanctions list viewing with advanced filtering (Watchlist → Regulatory List → UK SANCTIONS → Filter by Designated Date, Id Type, Program Source, Regime Name, Type → Download as Excel/TSV)
