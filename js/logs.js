/*
  logs.js — Activity Logs
  Tracks all data changes (student CRUD, holidays, daily entries)
  and provides a searchable, date-grouped log view.
*/

/* ===== STATE ===== */
let activityLogs = [];
let logsSearch = '';

/* ===== ADD LOG ===== */
async function addLog(action, details) {
    const entry = {
        action,
        details,
        timestamp: new Date().toISOString()
    };
    try {
        const saved = await addRecord('logs', entry);
        activityLogs.unshift(saved);
    } catch (err) {
        console.error('Failed to save log:', err);
    }
}

/* ===== RENDER LOGS ===== */
function renderLogs() {
    const search = logsSearch.trim().toLowerCase();

    let filtered = activityLogs;
    if (search) {
        filtered = activityLogs.filter(l =>
            l.action.toLowerCase().includes(search) ||
            l.details.toLowerCase().includes(search)
        );
    }

    // Sort by timestamp descending
    filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Group by date
    const grouped = {};
    filtered.forEach(l => {
        const d = new Date(l.timestamp);
        const dateKey = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(l);
    });

    let h = `<div style="display:flex; gap:10px; margin-bottom:14px; align-items:center;">
        <input class="search-bar" style="margin-bottom:0; flex:1;" type="text" placeholder="Search logs..." value="${escapeHtml(logsSearch)}" oninput="logsSearch=this.value;renderLogs()">
    </div>`;

    const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

    if (dates.length === 0) {
        h += `<div class="empty-state">No logs found</div>`;
    }

    const ACTION_ICONS = {
        'Student Added': '➕',
        'Student Updated': '✏️',
        'Student Deleted': '🗑️',
        'Plan Deleted': '🗑️',
        'Student Renewed': '🔄',
        'Batch Renewal': '🔄',
        'Plan Converted': '🔀',
        'Holiday Added': '🏖️',
        'Holiday Updated': '✏️',
        'Holiday Deleted': '🗑️',
        'Holidays Cleaned': '🧹',
        'Daily Entry Added': '💰',
        'Daily Entry Updated': '✏️',
        'Daily Entry Deleted': '🗑️',
        'Settings Updated': '⚙️',
        'Data Imported': '📥',
        'Data Cleared': '🧹'
    };

    dates.forEach(dateKey => {
        const entries = grouped[dateKey];
        h += `<div class="log-date-group">
            <div class="log-date-head">${fmtDate(dateKey)}</div>`;

        entries.forEach(l => {
            const d = new Date(l.timestamp);
            const timeStr = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
            const icon = ACTION_ICONS[l.action] || '📝';

            h += `<div class="log-entry">
                <div class="log-icon">${icon}</div>
                <div class="log-content">
                    <div class="log-action">${escapeHtml(l.action)}</div>
                    <div class="log-details">${escapeHtml(l.details)}</div>
                </div>
                <div class="log-time">${timeStr}</div>
            </div>`;
        });

        h += `</div>`;
    });

    const container = document.getElementById('tabLogs');
    const activeEl = document.activeElement;
    const isActiveSearch = activeEl && activeEl.classList.contains('search-bar') && container.contains(activeEl);
    const cStart = isActiveSearch ? activeEl.selectionStart : null;
    const cEnd = isActiveSearch ? activeEl.selectionEnd : null;

    container.innerHTML = h;

    if (isActiveSearch) {
        const freshSearch = container.querySelector('.search-bar');
        if (freshSearch) {
            freshSearch.focus();
            freshSearch.setSelectionRange(cStart, cEnd);
        }
    }
}
