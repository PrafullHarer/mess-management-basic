/*
  render.js — View Rendering
  Dashboard (with Business Insights), student cards,
  holidays list, daily entries, calendar & history modals.
*/

/* ===== DASHBOARD ===== */
function renderDashboard() {
    // Deduplicate: only count latest subscription per student
    const uniqueBoys = getUniqueStudents(boys);
    const uniqueGirls = getUniqueStudents(girls);
    const all = [...uniqueBoys, ...uniqueGirls];

    // Count mess over students
    let messOverCount = 0;
    all.forEach(s => {
        const st = studentStatus(s, holidays);
        if (st.label === 'Mess Over') messOverCount++;
    });

    // Veg / Non-Veg
    const vegCount = all.filter(s => !(s.diet || '').toLowerCase().includes('non')).length;
    const nonVegCount = all.length - vegCount;

    // Plan breakdown
    const planCounts = {};
    all.forEach(s => {
        const p = s.plan || 'Unknown';
        planCounts[p] = (planCounts[p] || 0) + 1;
    });
    const planList = Object.entries(planCounts).sort((a, b) => b[1] - a[1]);

    // Evening count: students on Evening-only OR 2-Time OR 15-days-2-Time plans
    const eveningCount = all.filter(s => isEvening(s.plan) || isTwoTime(s.plan)).length;
    // Afternoon count: students on Afternoon-only OR 2-Time OR 15-days-2-Time plans
    const afternoonCount = all.filter(s => isAfternoon(s.plan) || isTwoTime(s.plan)).length;

    let h = `<div class="summary-grid">
    <div class="summary-card"><div class="label">Total Students</div><div class="value">${all.length}</div></div>
    <div class="summary-card"><div class="label">Boys</div><div class="value" style="color:var(--primary)">${uniqueBoys.length}</div></div>
    <div class="summary-card"><div class="label">Girls</div><div class="value" style="color:#e91e8f">${uniqueGirls.length}</div></div>
    <div class="summary-card"><div class="label">Mess Over</div><div class="value" style="color:var(--red)">${messOverCount}</div></div>
    <div class="summary-card"><div class="label">Veg</div><div class="value" style="color:var(--green)">${vegCount}</div></div>
    <div class="summary-card"><div class="label">Non-Veg</div><div class="value" style="color:var(--orange)">${nonVegCount}</div></div>
  </div>`;

    // ===== MEAL SLOT COUNTS =====
    h += `<div class="insights-section">
        <div class="section-title">🍽️ Meal Slot Distribution</div>
        <div class="summary-grid" style="grid-template-columns: 1fr 1fr; margin-bottom:16px;">
            <div class="summary-card"><div class="label">Eating in Evening</div><div class="value" style="color:#7c3aed">${eveningCount}</div></div>
            <div class="summary-card"><div class="label">Eating in Afternoon</div><div class="value" style="color:#0ea5e9">${afternoonCount}</div></div>
        </div>`;

    // ===== PLAN BREAKDOWN =====
    if (planList.length > 0) {
        h += `<div class="section-title">📋 Students Per Plan</div>
        <div style="background:var(--card); border-radius:10px; padding:12px; margin-bottom:16px;">`;
        planList.forEach(([plan, count]) => {
            const pct = all.length > 0 ? Math.round(count / all.length * 100) : 0;
            h += `<div style="display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px solid var(--border);">
                <span style="flex:1; font-weight:500; font-size:14px; color:var(--text);">${escapeHtml(plan)}</span>
                <div style="width:100px; height:8px; background:var(--border); border-radius:4px; overflow:hidden;">
                    <div style="width:${pct}%; height:100%; background:var(--primary); border-radius:4px;"></div>
                </div>
                <span style="font-weight:700; font-size:14px; color:var(--text); min-width:30px; text-align:right;">${count}</span>
            </div>`;
        });
        h += `</div>`;
    }

    // ===== CUSTOM COLLECTION CALCULATOR =====
    h += `<div class="section-title" onclick="document.getElementById('calcBody').style.display = document.getElementById('calcBody').style.display === 'none' ? 'block' : 'none'; this.querySelector('.arrow').textContent = document.getElementById('calcBody').style.display === 'none' ? '▸' : '▾';">
            📅 Custom Collection Calculator <span class="arrow">▾</span>
        </div>
        <div id="calcBody" style="display:block; padding: 15px; background:var(--card); border-radius:12px; margin-bottom: 20px;">
            <div style="display:flex; gap:10px; margin-bottom:12px;">
                <div style="flex:1"><label style="font-size:12px; color:var(--text2); display:block; margin-bottom:4px;">Start Date</label><input type="date" id="calcStart" class="form-group input" style="width:100%; border:1px solid var(--border); padding:8px; border-radius:6px; background:var(--bg); color:var(--text);"></div>
                <div style="flex:1"><label style="font-size:12px; color:var(--text2); display:block; margin-bottom:4px;">End Date</label><input type="date" id="calcEnd" class="form-group input" style="width:100%; border:1px solid var(--border); padding:8px; border-radius:6px; background:var(--bg); color:var(--text);"></div>
            </div>
            <button class="btn btn-primary" style="width:100%; padding:10px; font-weight:600;" onclick="runDateCalculator()">Calculate Total</button>
            <div id="calcResult" style="margin-top:15px; padding-top:10px; border-top:1px solid var(--border); text-align:center; display:none;"></div>
        </div>
    </div>`;

    document.getElementById('tabDashboard').innerHTML = h;
}

/* ===== STUDENT LIST ===== */
function renderStudents(type) {
    const arr = type === 'boys' ? boys : girls;
    const isB = type === 'boys';
    const search = (isB ? boysSearch : girlsSearch).trim();
    const filter = isB ? boysFilter : girlsFilter;
    const sortVal = isB ? boysSort : girlsSort;

    // === FIX: Deduplicate FIRST, then filter ===
    // Step 1: Sort all records newest-first, then keep only the latest subscription per student
    const sortedAll = [...arr].sort((a, b) => new Date(b.joiningDate || 0) - new Date(a.joiningDate || 0));
    const uniqueAll = [];
    const seenDedup = new Set();
    sortedAll.forEach(s => {
        const key = s.name.toLowerCase().replace(/\s+/g, '');
        if (!seenDedup.has(key)) {
            seenDedup.add(key);
            const allSubs = arr.filter(x => x.name.toLowerCase().replace(/\s+/g, '') === key);
            s._totalPending = allSubs.reduce((acc, x) => acc + Math.max(0, safeInt(x.amount) - safeInt(x.paid)), 0);
            s._subCount = allSubs.length;
            uniqueAll.push(s);
        }
    });

    // Step 2: Apply search filter on unique (latest) students
    let filtered = uniqueAll.filter(s => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (s.name || '').toLowerCase().includes(q)
            || (s.mobile || '').toLowerCase().includes(q)
            || (s.plan || '').toLowerCase().includes(q)
            || (s.diet || '').toLowerCase().includes(q)
            || (s.paymentNotes || '').toLowerCase().includes(q);
    });

    // Step 3: Apply status filter on unique (latest) students
    if (filter !== 'All') {
        filtered = filtered.filter(s => {
            const st = studentStatus(s, holidays);
            if (filter === 'Active') return st.label === 'Active';
            if (filter === 'Dues') return s._totalPending > 0;
            if (filter === 'Ending Soon') return st.label === 'Ending Soon';
            if (filter === 'Mess Over') return st.label === 'Mess Over';
            if (filter === 'Unusual') return st.label === 'Unusual Plan';
            return true;
        });
    }

    // Calculate total action items for this tab (from all unique students, ignoring search/filter)
    let totalDuesSum = 0, duesCount = 0, renewalCount = 0;
    uniqueAll.forEach(s => {
        const st = studentStatus(s, holidays);
        if (s._totalPending > 0) {
            totalDuesSum += s._totalPending;
            duesCount++;
        } else if (st.label === 'Mess Over') {
            renewalCount++;
        }
    });

    const totalActionCount = duesCount + renewalCount;
    // --- STRUCTURAL OPTIMIZATION ---
    const tabId = 'tab' + (isB ? 'Boys' : 'Girls');
    const container = document.getElementById(tabId);
    
    // Create inner structure if it doesn't exist
    if (!container.querySelector('.tab-list-results')) {
        let headerHtml = '';
        if (totalActionCount > 0) {
            headerHtml += `<div class="dues-banner" onclick="openDuesModal('${type}')">
                <div style="display:flex; align-items:center; gap:12px;">
                    <span style="font-size:22px">📋</span>
                    <div>
                        <div style="font-weight:700; color:var(--primary); font-size:15px;">Action Needed</div>
                        <div id="${type}ActionNeededDetail" style="font-size:12px; color:var(--text2); margin-top:2px;">
                            ${duesCount > 0 ? `<span style="color:var(--red); font-weight:600">${duesCount} Dues (${fmtMoney(totalDuesSum)})</span>` : ''}
                            ${duesCount > 0 && renewalCount > 0 ? ' &nbsp;·&nbsp; ' : ''}
                            ${renewalCount > 0 ? `<span>${renewalCount} Renewals</span>` : ''}
                        </div>
                    </div>
                </div>
                <button class="btn btn-secondary" onclick="event.stopPropagation(); openBatchReminders('${type}')" style="padding:6px 10px; font-size:11px; font-weight:700; background:var(--bg); border:1px solid var(--border); color:var(--primary); text-transform:uppercase;">Send Batch Reminders</button>
            </div>`;
        }

        headerHtml += `<div style="display:flex; gap:8px; margin-bottom:12px;">
            <button id="${type}RenewAllBtn" class="btn ${renewalCount > 0 ? 'btn-primary' : 'btn-secondary'}" onclick="renewAllMessOver('${type}')" style="flex:1; display:flex; align-items:center; justify-content:center; gap:8px; padding:10px; font-size:14px; font-weight:600; ${renewalCount === 0 ? 'opacity:0.7;' : ''}">
                <span style="font-size:18px">🔄</span> Renew All${renewalCount > 0 ? ' (' + renewalCount + ')' : ''}
            </button>
            <button class="btn btn-secondary" onclick="refreshData()" style="padding:10px 14px;" title="Refresh Data">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            </button>
        </div>`;

        headerHtml += `<div style="display:flex; gap:10px; margin-bottom:10px;">
            <input class="search-bar" style="margin-bottom:0; flex:1;" type="text" placeholder="Search name, mobile, plan..." value="${isB ? boysSearch : girlsSearch}" oninput="onSearchInput('${type}', this.value)">
            <select class="search-bar" style="margin-bottom:0; width:auto; padding: 0 10px;" onchange="${isB ? 'boysSort' : 'girlsSort'}=this.value;render()">
                <option value="Newest" ${sortVal === 'Newest' ? 'selected' : ''}>Newest Joined</option>
                <option value="Oldest" ${sortVal === 'Oldest' ? 'selected' : ''}>Oldest Joined</option>
                <option value="A-Z" ${sortVal === 'A-Z' ? 'selected' : ''}>Name A-Z</option>
                <option value="Z-A" ${sortVal === 'Z-A' ? 'selected' : ''}>Name Z-A</option>
            </select>
        </div>`;

        headerHtml += `<div class="filter-chips">`;
        ['All', 'Active', 'Dues', 'Ending Soon', 'Mess Over', 'Unusual'].forEach(c => {
            headerHtml += `<button class="chip ${filter === c ? 'active' : ''}" onclick="${isB ? 'boysFilter' : 'girlsFilter'}='${c}';render()">${c}</button>`;
        });
        headerHtml += `</div>`;
        headerHtml += `<div class="tab-list-results"></div>`;
        
        container.innerHTML = headerHtml;
    } else {
        // Update tiny bits of the header that might change (like counts)
        const rb = document.getElementById(`${type}RenewAllBtn`);
        if (rb) {
            rb.className = `btn ${renewalCount > 0 ? 'btn-primary' : 'btn-secondary'}`;
            rb.style.opacity = renewalCount === 0 ? '0.7' : '1';
            rb.innerHTML = `<span style="font-size:18px">🔄</span> Renew All${renewalCount > 0 ? ' (' + renewalCount + ')' : ''}`;
        }
        const ad = document.getElementById(`${type}ActionNeededDetail`);
        if (ad) {
            ad.innerHTML = `${duesCount > 0 ? `<span style="color:var(--red); font-weight:600">${duesCount} Dues (${fmtMoney(totalDuesSum)})</span>` : ''}
                            ${duesCount > 0 && renewalCount > 0 ? ' &nbsp;·&nbsp; ' : ''}
                            ${renewalCount > 0 ? `<span>${renewalCount} Renewals</span>` : ''}`;
        }
        // Sync search input value if modified elsewhere
        const sb = container.querySelector('.search-bar[type="text"]');
        if (sb && sb.value !== (isB ? boysSearch : girlsSearch)) sb.value = (isB ? boysSearch : girlsSearch);
        
        // Sync chips
        container.querySelectorAll('.chip').forEach(chip => {
            chip.classList.toggle('active', chip.textContent === filter);
        });
    }

    let listHtml = '';
    if (filtered.length === 0) listHtml += `<div class="empty-state">No students found</div>`;

    // Step 4: Sort the already-unique filtered list
    const uniqueList = [...filtered];
    uniqueList.sort((a, b) => {
        if (sortVal === 'A-Z') return a.name.localeCompare(b.name);
        if (sortVal === 'Z-A') return b.name.localeCompare(a.name);
        if (sortVal === 'Oldest') return new Date(a.joiningDate || 0) - new Date(b.joiningDate || 0);
        return new Date(b.joiningDate || 0) - new Date(a.joiningDate || 0);
    });

    uniqueList.forEach(s => {
        const st = studentStatus(s, holidays);
        const unusual = st.label === 'Unusual Plan';
        const pend = s._totalPending;
        const dietClass = (s.diet || '').toLowerCase().includes('non') ? 'badge-nonveg' : 'badge-veg';

        const historyBtn = s._subCount > 1 ? `<button data-action="history" data-type="${type}" data-name="${s.name.replace(/"/g, '&quot;')}">History</button>` : '';
        const calendarBtn = !unusual ? `<button data-action="calendar" data-type="${type}" data-id="${s.id}" title="View Calendar" style="padding: 4px 8px; border-radius: 6px; font-size:16px;">📅</button>` : '';
        const waIcon = s.mobile ? `<svg data-action="wa" data-type="${type}" data-id="${s.id}" style="cursor:pointer; color:#25D366" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.47 16.03l-2.09-1.04c-.38-.19-.83-.14-1.16.14l-1.09 1.09c-2.3-1.02-4.14-2.86-5.16-5.16l1.09-1.09c.28-.33.33-.78.14-1.16l-1.04-2.09A1 1 0 0 0 7.27 6H5.98a2 2 0 0 0-2 2.21A15.93 15.93 0 0 0 16 20.02a2 2 0 0 0 2.21-2.01v-1.29a1 1 0 0 0-.74-.98z"/></svg>` : '';
        const nameDisplay = `${escapeHtml(s.name)} ${s._subCount > 1 ? `<span style="font-size:12px;color:var(--text3);font-weight:normal">(${s._subCount} plans)</span>` : ''} ${calendarBtn}`;

        if (unusual) {
            listHtml += `<div class="student-card" style="border-left:3px solid #7c3aed">
          <div class="top">
            <div>
              <div class="name">${nameDisplay}</div>
              <span class="badge" style="background:#7c3aed15;color:#7c3aed"><span class="status-dot" style="background:#7c3aed"></span>Unusual Plan</span>
            </div>
            <span class="badge ${dietClass}">${s.diet || '?'}</span>
          </div>
          <div class="info" style="color:#7c3aed;font-weight:600">Plan: ${s.plan}</div>
          ${s.joiningDate ? `<div class="info">Joined: ${fmtDate(s.joiningDate)}</div>` : '<div class="info" style="color:var(--red)">No joining date</div>'}
          <div class="money-row">
            <span>Amt ${fmtMoney(s.amount)}</span>
            <span>Paid ${fmtMoney(s.paid)}</span>
            <span style="color:${pend > 0 ? 'var(--red)' : 'var(--green)'}">Due ${fmtMoney(pend)}</span>
          </div>
          <div style="margin-top:8px; display:flex; align-items:center; gap:16px;">
            <a href="tel:${s.mobile}" class="mobile-link">${s.mobile || '—'}</a>
            ${waIcon}
          </div>
          <div class="card-actions">
            ${historyBtn}
            <button data-action="edit" data-type="${type}" data-id="${s.id}">Edit</button>
            <button data-action="delete" data-type="${type}" data-id="${s.id}">Delete</button>
          </div>
        </div>`;
        } else {
            const rem = safeInt(remainingMeals(s, holidays));
            const tm = safeInt(totalMeals(s.plan));
            const endD = messEndDate(s, holidays);
            const pct = tm > 0 ? Math.min(100, Math.round((rem / tm) * 100)) : 0;
            const pColor = pct > 40 ? 'var(--green)' : pct > 15 ? 'var(--orange)' : 'var(--red)';

            let badges = `<span class="badge" style="background:${st.color}15;color:${st.color}"><span class="status-dot" style="background:${st.color}"></span>${st.label}</span>`;
            if (st.secondary) badges += ` <span class="badge" style="background:${st.secondary.color}15;color:${st.secondary.color}">${st.secondary.label}</span>`;

            listHtml += `<div class="student-card">
          <div class="top">
            <div>
              <div class="name">${nameDisplay}</div>
              ${badges}
            </div>
            <span class="badge ${dietClass}">${s.diet || '?'}</span>
          </div>
          <div class="info">${s.plan} · ${fmtDate(s.joiningDate)} → ${fmtDate(endD)}</div>
          <div class="info">Meals: ${rem} / ${tm} remaining</div>
          ${/12\s*time/i.test(s.plan) ? '<div class="info" style="font-size:11px;color:var(--text3);margin-top:-4px;margin-bottom:4px;">Manual tracking plan — meal count fixed</div>' : `<div class="progress-wrap"><div class="progress-bar" style="width:${pct}%;background:${pColor}"></div></div>`}
          <div class="money-row">
            <span>Amt ${fmtMoney(s.amount)}</span>
            <span>Paid ${fmtMoney(s.paid)}</span>
            <span style="color:${pend > 0 ? 'var(--red)' : 'var(--green)'}">Due ${fmtMoney(pend)}</span>
          </div>
          <div style="margin-top:8px; display:flex; align-items:center; gap:16px;">
            <a href="tel:${s.mobile}" class="mobile-link">${s.mobile || '—'}</a>
            ${waIcon}
          </div>
          <div class="card-actions">
            ${st.label === 'Mess Over' ? `<button data-action="renew" data-type="${type}" data-id="${s.id}" style="color:var(--primary);border-color:var(--primary)">Renew</button>` : ''}
            ${st.label !== 'Mess Over' && !unusual ? `<button data-action="convert" data-type="${type}" data-id="${s.id}" style="color:#7c3aed;border-color:#7c3aed">Convert</button>` : ''}
            ${historyBtn}
            <button data-action="edit" data-type="${type}" data-id="${s.id}">Edit</button>
            <button data-action="delete" data-type="${type}" data-id="${s.id}">Delete</button>
          </div>
        </div>`;
        }
    });

    container.querySelector('.tab-list-results').innerHTML = listHtml;
}

/* ===== HISTORY MODAL ===== */
function openHistoryModal(name, type) {
    const arr = type === 'boys' ? boys : girls;
    const key = name.toLowerCase().replace(/\s+/g, '');
    const subs = arr.filter(x => x.name.toLowerCase().replace(/\s+/g, '') === key)
        .sort((a, b) => new Date(b.joiningDate || 0) - new Date(a.joiningDate || 0));

    // Summary stats
    const totalPaid = subs.reduce((acc, s) => acc + safeInt(s.paid), 0);
    const totalAmt = subs.reduce((acc, s) => acc + safeInt(s.amount), 0);
    const totalDue = Math.max(0, totalAmt - totalPaid);

    let bodyHtml = `
    <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; margin-bottom:16px; text-align:center;">
        <div style="background:var(--bg); padding:10px; border-radius:8px; border:1px solid var(--border);">
            <div style="font-size:11px; color:var(--text3); text-transform:uppercase; letter-spacing:.5px;">Subscriptions</div>
            <div style="font-size:20px; font-weight:700; color:var(--primary);">${subs.length}</div>
        </div>
        <div style="background:var(--bg); padding:10px; border-radius:8px; border:1px solid var(--border);">
            <div style="font-size:11px; color:var(--text3); text-transform:uppercase; letter-spacing:.5px;">Total Paid</div>
            <div style="font-size:20px; font-weight:700; color:var(--green);">${fmtMoney(totalPaid)}</div>
        </div>
        <div style="background:var(--bg); padding:10px; border-radius:8px; border:1px solid var(--border);">
            <div style="font-size:11px; color:var(--text3); text-transform:uppercase; letter-spacing:.5px;">Total Due</div>
            <div style="font-size:20px; font-weight:700; color:${totalDue > 0 ? 'var(--red)' : 'var(--green)'};">${fmtMoney(totalDue)}</div>
        </div>
    </div>
    <div style="max-height: 55vh; overflow-y: auto; padding-right: 4px;">`;

    subs.forEach((s, idx) => {
        const isLatest = idx === 0;
        const isLast = idx === subs.length - 1;
        const pend = Math.max(0, safeInt(s.amount) - safeInt(s.paid));
        const st = studentStatus(s, holidays);
        const isUnusual = isUnusualPlan(s.plan) || /12\s*time/i.test(s.plan);
        const endD = !isUnusual ? messEndDate(s, holidays) : null;
        const rem = !isUnusual ? safeInt(remainingMeals(s, holidays)) : null;
        const tm = !isUnusual ? safeInt(totalMeals(s.plan)) : null;
        const calendarBtn = !isUnusual ? `<button data-action="calendar" data-type="${type}" data-id="${s.id}" title="View Calendar" style="padding:2px 6px; border-radius:4px; font-size:14px; border:1px solid var(--border); background:var(--bg); cursor:pointer;">📅</button>` : '';

        const borderColor = isLatest ? 'var(--primary)' : 'var(--border)';
        const bgColor = isLatest ? 'var(--bg)' : 'transparent';
        const opacity = isLatest ? '1' : '0.85';

        bodyHtml += `
        <div style="display:flex; gap:12px; position:relative;">
            <!-- Timeline dot + line -->
            <div style="display:flex; flex-direction:column; align-items:center; width:20px; flex-shrink:0;">
                <div style="width:12px; height:12px; border-radius:50%; background:${isLatest ? 'var(--primary)' : 'var(--text3)'}; border:2px solid ${isLatest ? 'var(--primary)' : 'var(--border)'}; flex-shrink:0; margin-top:14px;"></div>
                ${!isLast ? '<div style="width:2px; flex:1; background:var(--border); margin:4px 0;"></div>' : ''}
            </div>
            <!-- Card -->
            <div style="flex:1; margin-bottom:${isLast ? '0' : '8'}px; padding:12px; border:1px solid ${borderColor}; border-radius:10px; background:${bgColor}; opacity:${opacity};">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                    <div>
                        <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                            <span style="font-weight:700; font-size:14px;">${escapeHtml(s.plan)}</span>
                            ${isLatest ? '<span class="badge" style="background:var(--primary);color:#fff;font-size:10px;padding:2px 8px;">Current</span>' : '<span class="badge" style="background:var(--border);color:var(--text3);font-size:10px;padding:2px 8px;">Past</span>'}
                            ${calendarBtn}
                        </div>
                        <div style="font-size:12px; color:var(--text2); margin-top:4px;">
                            📅 ${s.joiningDate ? fmtDate(s.joiningDate) : 'Unknown'}
                            ${endD ? ' → ' + fmtDate(endD) : ''}
                        </div>
                    </div>
                    <span class="badge" style="background:${st.color}15;color:${st.color};font-size:11px;">${st.label}</span>
                </div>
                ${isLatest && rem !== null ? `<div style="margin-bottom:8px;"><div style="font-size:12px; color:var(--text2); margin-bottom:4px;">Meals: ${rem} / ${tm} remaining</div><div class="progress-wrap"><div class="progress-bar" style="width:${tm > 0 ? Math.min(100, Math.round((rem / tm) * 100)) : 0}%;background:${(tm > 0 ? Math.round((rem / tm) * 100) : 0) > 40 ? 'var(--green)' : (tm > 0 ? Math.round((rem / tm) * 100) : 0) > 15 ? 'var(--orange)' : 'var(--red)'}"></div></div></div>` : ''}
                <div style="display:flex; gap:12px; font-size:13px; padding:8px; background:var(--surface2, var(--bg)); border-radius:6px; margin-bottom:8px;">
                    <span>Amt ${fmtMoney(s.amount)}</span>
                    <span>Paid ${fmtMoney(s.paid)}</span>
                    <span style="color:${pend > 0 ? 'var(--red)' : 'var(--green)'}; font-weight:600;">Due ${fmtMoney(pend)}</span>
                </div>
                <div style="display:flex; gap:6px; justify-content:flex-end;">
                    ${isLatest && st.label !== 'Mess Over' && !isUnusual ? `<button class="btn btn-secondary" style="padding:4px 12px; font-size:12px; color:#7c3aed; border-color:#7c3aed;" data-action="convert" data-type="${type}" data-id="${s.id}">Convert</button>` : ''}
                    <button class="btn btn-secondary" style="padding:4px 12px; font-size:12px;" data-action="edit" data-type="${type}" data-id="${s.id}">Edit</button>
                    <button class="btn btn-secondary" style="padding:4px 12px; font-size:12px; color:var(--red);" data-action="delete" data-type="${type}" data-id="${s.id}">Delete</button>
                </div>
            </div>
        </div>`;
    });

    bodyHtml += `</div>
    <div style="margin-top:16px; text-align:right;">
        <button class="btn btn-secondary" onclick="closeModal()">Close</button>
    </div>`;

    openModal(`<h2>📋 History: ${escapeHtml(name)}</h2>` + bodyHtml);
}

/* ===== CALENDAR MODAL ===== */
function openCalendarModal(type, id) {
    const arr = type === 'boys' ? boys : girls;
    const s = arr.find(x => x.id === id);
    if (!s) return;

    if (isUnusualPlan(s.plan) || /12\s*time/i.test(s.plan)) {
        showToast('Calendar view is not available for this unusual plan type.', 'warning');
        return;
    }

    const sim = simulatePlan(s, holidays);
    const months = {};
    sim.history.forEach(dayInfo => {
        const monthKey = dayInfo.date.getFullYear() + '-' + String(dayInfo.date.getMonth() + 1).padStart(2, '0');
        if (!months[monthKey]) months[monthKey] = [];
        months[monthKey].push(dayInfo);
    });

    let html = `<h2>Calendar: ${s.name}</h2>
    <div style="font-size:12px; margin-bottom: 20px; display:flex; gap:12px; flex-wrap:wrap; justify-content:center;">
        <div style="display:flex; align-items:center; gap:4px;"><span style="width:12px;height:12px;border-radius:3px;background:var(--green)"></span> Eaten</div>
        <div style="display:flex; align-items:center; gap:4px;"><span style="width:12px;height:12px;border-radius:3px;background:var(--bg2);border:1px solid var(--border)"></span> Pending</div>
        <div style="display:flex; align-items:center; gap:4px;"><span style="width:12px;height:12px;border-radius:3px;background:var(--yellow)"></span> Holiday</div>
        <div style="display:flex; align-items:center; gap:4px;"><span style="width:12px;height:12px;border-radius:3px;background:var(--primary)"></span> Global Hol</div>
    </div>
    <div style="display:flex; flex-direction:column; gap:24px; max-height:60vh; overflow-y:auto;">`;

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    Object.keys(months).forEach(mk => {
        const [yy, mm] = mk.split('-');
        const days = months[mk];

        html += `<div>
            <div style="font-weight:600; margin-bottom:12px; color:var(--text2); text-transform:uppercase; font-size:13px; letter-spacing:1px;">
                ${monthNames[parseInt(mm) - 1]} ${yy}
            </div>
            <div style="display:grid; grid-template-columns:repeat(7, 1fr); gap:6px;">`;

        ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(d => {
            html += `<div style="text-align:center; font-size:11px; font-weight:700; color:var(--text3);">${d}</div>`;
        });

        const firstDay = days[0].date;
        const firstDayOfWeek = new Date(firstDay.getFullYear(), firstDay.getMonth(), 1).getDay();
        const subscriptionStartOffset = firstDay.getDate() - 1;
        const totalOffset = (firstDayOfWeek + subscriptionStartOffset) % 7;

        for (let i = 0; i < totalOffset; i++) html += `<div></div>`;

        days.forEach(d => {
            let bg = 'transparent', color = 'var(--text)', title = `${fmtDate(d.date)}`, border = '1px solid var(--border)';

            if (d.isHoliday) {
                if (d.globalHol) {
                    bg = 'var(--primary)'; color = '#fff'; title += ' (Global Holiday)'; border = '1px solid var(--primary)';
                } else {
                    bg = 'var(--yellow)'; color = '#000'; title += ' (Personal Holiday)'; border = '1px solid var(--yellow)';
                }
            } else if (d.isEaten) {
                bg = 'var(--green)'; color = '#fff'; title += ` (Meals: ${d.mealsConsumed})`; border = '1px solid var(--green)';
            } else {
                bg = 'var(--inputBg)'; color = 'var(--text3)';
            }

            html += `<div title="${title}" style="aspect-ratio:1; display:flex; align-items:center; justify-content:center; border-radius:6px; background:${bg}; color:${color}; border:${border}; font-size:12px; font-weight:600; cursor:default;">
                ${d.date.getDate()}
            </div>`;
        });

        html += `</div></div>`;
    });

    html += `</div>
    <div style="margin-top:20px; text-align:right;">
        <button class="btn btn-secondary" onclick="closeModal()">Close</button>
    </div>`;

    openModal(html);
}

/* ===== HOLIDAYS LIST ===== */
function renderHolidays() {
    let h = '';
    if (holidays.length === 0) h += `<div class="empty-state">No holidays added yet</div>`;
    const sorted = [...holidays].sort((a, b) => new Date(a.date) - new Date(b.date));
    sorted.forEach(ho => {
        const sc = ho.slot === 'Whole Day' ? 'slot-whole' : ho.slot === 'Afternoon' ? 'slot-afternoon' : 'slot-evening';
        h += `<div class="holiday-card">
      <div class="top">
        <div><span class="hdate">${fmtDate(ho.date)}</span> <span class="slot-badge ${sc}">${ho.slot}</span></div>
        <div class="card-actions" style="margin:0">
          <button onclick="editHoliday('${ho.id}')">Edit</button>
          <button onclick="deleteHoliday('${ho.id}')">Delete</button>
        </div>
      </div>
      ${ho.reason ? `<div class="reason">${escapeHtml(ho.reason)}</div>` : ''}
    </div>`;
    });
    h += `<div class="holiday-note">Whole Day = all students · Afternoon = Afternoon & 2-Time · Evening = Evening & 2-Time</div>`;
    document.getElementById('tabHolidays').innerHTML = h;
}

/* ===== DAILY ENTRIES ===== */
function renderDaily() {
    const grouped = {};
    dailyEntries.forEach(e => { if (!grouped[e.date]) grouped[e.date] = []; grouped[e.date].push(e); });
    const dates = Object.keys(grouped).sort((a, b) => new Date(a) - new Date(b));

    const now = new Date();
    const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    let defaultMonth = currentMonth;
    if (!dailyEntries.some(e => e.date.startsWith(currentMonth))) {
        const months = [...new Set(dailyEntries.map(e => e.date.substring(0, 7)))].sort();
        if (months.length > 0) defaultMonth = months[months.length - 1];
    }
    const monthSel = document.getElementById('monthSel');
    let selMonth = monthSel ? monthSel.value : defaultMonth;

    let h = `<div class="monthly-summary">
    <h3 onclick="dailySummaryCollapsed=!dailySummaryCollapsed;render()">Monthly Summary <span class="arrow">${dailySummaryCollapsed ? '▸' : '▾'}</span></h3>
    <div class="ms-body" style="display: ${dailySummaryCollapsed ? 'none' : 'block'};">
      <input type="month" class="month-sel" id="monthSel" value="${selMonth}" onchange="render()">`;
    const me = dailyEntries.filter(e => e.date.startsWith(selMonth));
    const mOnline = me.reduce((a, e) => a + safeInt(e.online), 0);
    const mCash = me.reduce((a, e) => a + safeInt(e.cash), 0);
    h += `<div>Online: <strong>${fmtMoney(mOnline)}</strong></div>
    <div>Cash: <strong>${fmtMoney(mCash)}</strong></div>
    <div>Total: <strong>${fmtMoney(mOnline + mCash)}</strong></div>
    </div></div>`;

    const filteredDates = dates.filter(d => d.startsWith(selMonth));

    if (filteredDates.length === 0) h += `<div class="empty-state">No entries for this month</div>`;
    filteredDates.forEach(d => {
        const entries = grouped[d];
        h += `<div class="daily-group"><div class="date-head">${fmtDate(d)}</div>`;
        let dayOnline = 0, dayCash = 0;
        entries.forEach(e => {
            dayOnline += safeInt(e.online); dayCash += safeInt(e.cash);
            h += `<div class="daily-row">
        <span class="rlabel">${e.slot}</span>
        <span>Online ${fmtMoney(e.online)}</span>
        <span>Cash ${fmtMoney(e.cash)}</span>
        <span><strong>${fmtMoney(safeInt(e.online) + safeInt(e.cash))}</strong></span>
        <span class="actions">
          <button onclick="editDailyEntry('${e.id}')">✎</button>
          <button onclick="deleteDailyEntry('${e.id}')">✕</button>
        </span>
      </div>`;
        });
        h += `<div class="daily-row total">
      <span class="rlabel">Day Total</span>
      <span>Online ${fmtMoney(dayOnline)}</span>
      <span>Cash ${fmtMoney(dayCash)}</span>
      <span><strong>${fmtMoney(dayOnline + dayCash)}</strong></span>
      <span></span>
    </div></div>`;
    });
    document.getElementById('tabDaily').innerHTML = h;
}
