# Jenkins CI/CD Setup for Playwright BDD Tests

This guide helps you set up Jenkins locally to run the Playwright Cucumber tests.

## Prerequisites

- Java 11 or higher (required for Jenkins)
- Node.js 18+ (for running tests)
- Git

## Quick Start - Local Jenkins Setup

### 1. Download Jenkins

Download the Windows installer from: https://www.jenkins.io/download/

Or use the WAR file for a portable setup:
```bash
# Download Jenkins WAR
curl -L https://get.jenkins.io/war-stable/latest/jenkins.war -o jenkins.war

# Run Jenkins
java -jar jenkins.war --httpPort=8080
```

### 2. Initial Setup

1. Open http://localhost:8080 in your browser
2. Get the initial admin password from the console output or:
   - Windows: `C:\Users\<user>\.jenkins\secrets\initialAdminPassword`
3. Install suggested plugins
4. Create your admin user

### 3. Install Required Plugins

Go to **Manage Jenkins > Plugins > Available plugins** and install:

| Plugin | Purpose |
|--------|---------|
| **Allure** | Allure report integration |
| **NodeJS** | Node.js installation management |
| **Pipeline** | Pipeline support (usually pre-installed) |
| **Git** | Git integration (usually pre-installed) |
| **AnsiColor** | Colored console output |
| **Timestamper** | Timestamps in console |

### 4. Configure Tools

#### Node.js
1. Go to **Manage Jenkins > Tools**
2. Scroll to **NodeJS installations**
3. Click **Add NodeJS**
   - Name: `NodeJS-LTS`
   - Install automatically: ✓
   - Version: Select latest LTS (e.g., 20.x)

#### Allure Commandline
1. In the same Tools page, scroll to **Allure Commandline**
2. Click **Add Allure Commandline**
   - Name: `Allure`
   - Install automatically: ✓
   - Version: Latest (e.g., 2.27.0)

### 5. Create the Pipeline Job

#### Option A: Pipeline from SCM (Recommended)
1. Click **New Item**
2. Enter name: `playwright-bdd-tests`
3. Select **Pipeline**, click OK
4. In Pipeline section:
   - Definition: **Pipeline script from SCM**
   - SCM: **Git**
   - Repository URL: Your repo URL (local path or remote)
   - Branch: `*/main` or `*/master`
   - Script Path: `jenkins/Jenkinsfile`
5. Save

#### Option B: Copy Pipeline Script
1. Click **New Item**
2. Enter name: `playwright-bdd-tests`
3. Select **Pipeline**, click OK
4. In Pipeline section:
   - Definition: **Pipeline script**
   - Copy contents from `jenkins/Jenkinsfile`
5. Save

### 6. Configure Credentials

Credentials use environment-specific prefixes (`{ENV}_*`) to support different credentials per environment.

1. Go to **Manage Jenkins > Credentials**
2. Click **(global)** > **Add Credentials**
3. Add credentials with environment prefix:

| Credential ID | Description |
|---------------|-------------|
| `QA_APP_ORG_ID` | QA Organisation ID |
| `QA_APP_USERNAME` | QA login email |
| `QA_APP_PASSWORD` | QA login password |
| `DEV_APP_ORG_ID` | DEV Organisation ID (optional) |
| `DEV_APP_USERNAME` | DEV login email (optional) |
| `DEV_APP_PASSWORD` | DEV login password (optional) |
| `STAGE_APP_ORG_ID` | Stage Organisation ID (optional) |
| `STAGE_APP_USERNAME` | Stage login email (optional) |
| `STAGE_APP_PASSWORD` | Stage login password (optional) |

For database credentials (if needed):
| Credential ID | Description |
|---------------|-------------|
| `QA_DB_USER` | QA database username |
| `QA_DB_PASSWORD` | QA database password |
| `DEV_DB_USER` | DEV database username (optional) |
| `DEV_DB_PASSWORD` | DEV database password (optional) |

For approver credentials (if using approval workflows):
| Credential ID | Description |
|---------------|-------------|
| `QA_APPROVER_USERNAME` | QA approver email |
| `QA_APPROVER_PASSWORD` | QA approver password |
| `QA_APPROVER_ORG_ID` | QA approver org (optional, defaults to maker's org) |
| `DEV_APPROVER_USERNAME` | DEV approver email (optional) |
| `DEV_APPROVER_PASSWORD` | DEV approver password (optional) |

The Jenkinsfile automatically loads credentials based on the selected `ENV` parameter. If environment-specific credentials aren't found, QA credentials are used as fallback.

## Running Tests

### From Jenkins UI
1. Open the job
2. Click **Build with Parameters**
3. Select options:
   - **ENV**: qa, dev, stage, uat
   - **BROWSER**: chromium, firefox, webkit
   - **HEADLESS**: true/false
   - **PARALLEL**: 0 (sequential) or 2, 4, etc.
   - **FEATURE_FILE**: Leave empty for all, or enter filename
4. Click **Build**

### Trigger Options

#### Manual
Click "Build with Parameters" in the job

#### Scheduled (Cron)
Add to Jenkinsfile or job config:
```groovy
triggers {
    cron('H 6 * * 1-5')  // Weekdays at 6 AM
}
```

#### On Git Push (Webhook)
1. In job config, enable **GitHub hook trigger for GITScm polling**
2. Configure webhook in your Git repository

## Viewing Reports

### Allure Report
After a build completes:
1. Open the build
2. Click **Allure Report** in the left sidebar

### Artifacts
1. Open the build
2. Click **Artifacts** to download:
   - `allure-results/` - Raw test data
   - `allure-report/` - HTML report
   - `cucumber-report.json` - Cucumber JSON
   - `runs/` - Screenshots, traces, videos (on failure)

## Pipeline Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `ENV` | qa | Target environment (qa, dev, stage, uat) |
| `BROWSER` | chromium | Browser (chromium, firefox, webkit) |
| `HEADLESS` | true | Run without browser UI |
| `PARALLEL` | 0 | Parallel workers (0 = sequential) |
| `RETRY` | 1 | Retry failed tests |
| `FEATURE_FILE` | (empty) | Specific feature to run |

## Troubleshooting

### Playwright browsers not installing
```bash
# Run manually on Jenkins agent
npx playwright install --with-deps
```

### Permission issues on Windows
Run Jenkins as Administrator or adjust folder permissions for:
- `C:\Users\<user>\.jenkins`
- Your workspace folder

### Allure report not showing
1. Verify Allure plugin is installed
2. Check that `allure-results` folder has data
3. Ensure Allure Commandline tool is configured

### Tests timeout
Increase timeout in Jenkinsfile:
```groovy
options {
    timeout(time: 120, unit: 'MINUTES')
}
```

## Directory Structure

```
jenkins/
├── Jenkinsfile           # Main pipeline definition
├── README.md             # This file
└── scripts/
    └── setup-jenkins.bat # Helper script for Windows setup
```

## Next Steps

Once local setup is working:
1. Set up Jenkins on a dedicated server
2. Configure agents for parallel execution
3. Set up webhooks for automatic triggers
4. Configure email/Slack notifications
5. Set up scheduled nightly runs
