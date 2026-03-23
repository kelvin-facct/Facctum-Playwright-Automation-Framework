/**
 * Generates an index.html dashboard linking to Jenkins builds with Allure reports
 */

const fs = require('fs');
const path = require('path');

const env = process.env.ENV || 'qa';
const jobName = process.env.JOB_NAME || 'Facctum-Platform';
const jenkinsUrl = process.env.JENKINS_URL || 'http://localhost:8080';
const buildNumber = process.env.BUILD_NUMBER || '1';
const outputFile = `reports/${env}/report-index.html`;

// Read build history from a JSON file we'll maintain
const historyFile = `reports/${env}/build-history.json`;

function loadHistory() {
    if (fs.existsSync(historyFile)) {
        return JSON.parse(fs.readFileSync(historyFile, 'utf-8'));
    }
    return [];
}

function saveHistory(history) {
    fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
}

function addCurrentBuild(history) {
    const now = new Date();
    const build = {
        number: buildNumber,
        timestamp: now.toISOString(),
        date: now.toISOString().split('T')[0],
        time: now.toTimeString().split(' ')[0],
        env: env,
        url: `${jenkinsUrl}/job/${jobName}/${buildNumber}/allure/`
    };
    
    // Avoid duplicates
    if (!history.find(b => b.number === buildNumber)) {
        history.unshift(build); // Add to beginning
    }
    
    // Keep last 50 builds
    return history.slice(0, 50);
}

function generateHTML(builds) {
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    
    // Group by date
    const grouped = {};
    builds.forEach(b => {
        if (!grouped[b.date]) grouped[b.date] = [];
        grouped[b.date].push(b);
    });

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Reports - ${env.toUpperCase()}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            min-height: 100vh;
            color: #fff;
            padding: 40px 20px;
        }
        .container { max-width: 800px; margin: 0 auto; }
        h1 { text-align: center; margin-bottom: 10px; font-size: 2rem; }
        .subtitle { text-align: center; color: #888; margin-bottom: 30px; }
        .env-badge {
            display: inline-block;
            background: #7b2cbf;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8rem;
            margin-left: 10px;
        }
        .date-group { margin-bottom: 25px; }
        .date-header {
            font-size: 0.85rem;
            color: #00d4ff;
            margin-bottom: 10px;
            padding-left: 10px;
            border-left: 3px solid #00d4ff;
        }
        .build-item {
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 8px;
            margin-bottom: 10px;
            transition: all 0.2s;
        }
        .build-item:hover {
            background: rgba(255,255,255,0.1);
            border-color: #00d4ff;
        }
        .build-link {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 20px;
            color: #fff;
            text-decoration: none;
        }
        .build-info { flex: 1; }
        .build-number { font-weight: 600; font-size: 1.1rem; }
        .build-time { color: #888; font-size: 0.85rem; margin-top: 3px; }
        .build-arrow { color: #00d4ff; font-size: 1.2rem; }
        .footer { text-align: center; margin-top: 30px; color: #555; font-size: 0.8rem; }
        .empty { text-align: center; padding: 40px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 Test Reports<span class="env-badge">${env.toUpperCase()}</span></h1>
        <p class="subtitle">Click to view Allure report for each build</p>
        
        ${Object.keys(grouped).length === 0 ? '<div class="empty">No builds yet</div>' : 
            Object.entries(grouped).map(([date, items]) => `
                <div class="date-group">
                    <div class="date-header">${formatDate(date)}</div>
                    ${items.map(b => `
                        <div class="build-item">
                            <a href="${b.url}" target="_blank" class="build-link">
                                <div class="build-info">
                                    <div class="build-number">Build #${b.number}</div>
                                    <div class="build-time">🕐 ${b.time}</div>
                                </div>
                                <span class="build-arrow">→</span>
                            </a>
                        </div>
                    `).join('')}
                </div>
            `).join('')
        }
        
        <p class="footer">Updated: ${now}</p>
    </div>
</body>
</html>`;
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

// Main
const outputDir = path.dirname(outputFile);
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

let history = loadHistory();
history = addCurrentBuild(history);
saveHistory(history);

const html = generateHTML(history);
fs.writeFileSync(outputFile, html);

console.log(`Report index generated: ${outputFile}`);
console.log(`Total builds tracked: ${history.length}`);
