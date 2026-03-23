/**
 * Generates an index.html dashboard listing all Allure report runs
 * Reports are organized by date with clickable links
 */

const fs = require('fs');
const path = require('path');

const env = process.env.ENV || 'qa';
const reportsBaseDir = process.env.REPORTS_DIR || `reports/${env}/allure-report-history`;
const outputFile = process.env.OUTPUT_FILE || `reports/${env}/report-index.html`;

function getReportDirs() {
    if (!fs.existsSync(reportsBaseDir)) {
        return [];
    }
    
    return fs.readdirSync(reportsBaseDir)
        .filter(dir => dir.startsWith('report-'))
        .map(dir => {
            const fullPath = path.join(reportsBaseDir, dir);
            const stats = fs.statSync(fullPath);
            const timestamp = dir.replace('report-', '');
            
            // Parse timestamp: 2026-03-23T09-09-46
            const [datePart, timePart] = timestamp.split('T');
            const formattedTime = timePart ? timePart.replace(/-/g, ':') : '';
            
            return {
                name: dir,
                path: fullPath,
                timestamp,
                date: datePart,
                time: formattedTime,
                created: stats.mtime
            };
        })
        .sort((a, b) => b.created - a.created); // Newest first
}

function generateHTML(reports) {
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Allure Report History - ${env.toUpperCase()}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            min-height: 100vh;
            color: #fff;
            padding: 40px 20px;
        }
        .container { max-width: 900px; margin: 0 auto; }
        h1 {
            text-align: center;
            margin-bottom: 10px;
            font-size: 2.5rem;
            background: linear-gradient(90deg, #00d4ff, #7b2cbf);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .subtitle {
            text-align: center;
            color: #888;
            margin-bottom: 40px;
        }
        .env-badge {
            display: inline-block;
            background: #7b2cbf;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8rem;
            margin-left: 10px;
        }
        .report-list { list-style: none; }
        .report-item {
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 12px;
            margin-bottom: 15px;
            transition: all 0.3s ease;
        }
        .report-item:hover {
            background: rgba(255,255,255,0.1);
            transform: translateX(5px);
            border-color: #00d4ff;
        }
        .report-link {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 25px;
            color: #fff;
            text-decoration: none;
        }
        .report-info { flex: 1; }
        .report-date {
            font-size: 1.2rem;
            font-weight: 600;
            margin-bottom: 5px;
        }
        .report-time { color: #888; font-size: 0.9rem; }
        .report-arrow {
            font-size: 1.5rem;
            color: #00d4ff;
            opacity: 0;
            transition: opacity 0.3s;
        }
        .report-item:hover .report-arrow { opacity: 1; }
        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: #666;
        }
        .empty-state svg { width: 80px; height: 80px; margin-bottom: 20px; opacity: 0.5; }
        .footer {
            text-align: center;
            margin-top: 40px;
            color: #555;
            font-size: 0.85rem;
        }
        .date-group { margin-bottom: 30px; }
        .date-header {
            font-size: 0.9rem;
            color: #00d4ff;
            margin-bottom: 10px;
            padding-left: 10px;
            border-left: 3px solid #00d4ff;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 Allure Reports<span class="env-badge">${env.toUpperCase()}</span></h1>
        <p class="subtitle">Test execution history • Click to view report</p>
        
        ${reports.length === 0 ? `
        <div class="empty-state">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>No reports found yet.<br>Run some tests to generate reports!</p>
        </div>
        ` : `
        <ul class="report-list">
            ${groupByDate(reports)}
        </ul>
        `}
        
        <p class="footer">Generated: ${now} • Facctum Test Automation</p>
    </div>
</body>
</html>`;
}

function groupByDate(reports) {
    const grouped = {};
    reports.forEach(r => {
        if (!grouped[r.date]) grouped[r.date] = [];
        grouped[r.date].push(r);
    });
    
    return Object.entries(grouped).map(([date, items]) => `
        <li class="date-group">
            <div class="date-header">${formatDate(date)}</div>
            ${items.map(r => `
            <div class="report-item">
                <a href="${r.name}/index.html" class="report-link">
                    <div class="report-info">
                        <div class="report-date">🕐 ${r.time || 'Unknown time'}</div>
                        <div class="report-time">Build: ${r.name}</div>
                    </div>
                    <span class="report-arrow">→</span>
                </a>
            </div>
            `).join('')}
        </li>
    `).join('');
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Main
const reports = getReportDirs();
const html = generateHTML(reports);

// Ensure output directory exists
const outputDir = path.dirname(outputFile);
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(outputFile, html);
console.log(`Report index generated: ${outputFile}`);
console.log(`Found ${reports.length} historical reports`);
