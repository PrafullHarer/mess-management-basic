/*
  actions.js — User Actions & Data Modification
  Student CRUD forms, holiday picker, daily entry forms,
  settings/import/export, and app initialization.
*/

/* ===== STUDENT MODAL ===== */
function openStudentModal(type, student) {
    const s = student || {};
    const isEdit = !!student && !!s.id;
    const defaultDate = s.joiningDate || getLocalTodayStr();
    const plans = ['1 Time Eve', '1 Time Aftr', '2 Time', '15 Days 1 Time Eve', '15 Days 1 Time Aftr', '15 Days 2 Time'];
    let planOpts = plans.map(p => `<option value="${p}" ${s.plan === p ? 'selected' : ''}>${p}</option>`).join('');
    if (isEdit && s.plan && !plans.includes(s.plan) && !isCustomDayPlan(s.plan)) {
        planOpts = `<option value="${escapeHtml(s.plan)}" selected>${escapeHtml(s.plan)} ⚠️</option>` + planOpts;
    }
    if (!isEdit && !s.plan) {
        planOpts = plans.map((p, i) => `<option value="${p}" ${i === 0 ? 'selected' : ''}>${p}</option>`).join('');
    }

    // Detect if the existing plan is a custom N-day plan
    let isCustomActive = false;
    let customDays = 15;
    let customSlot = 'Eve';
    if (s.plan && isCustomDayPlan(s.plan)) {
        isCustomActive = true;
        const cm = s.plan.match(/^(\d+)\s*Days?\s+(1\s*Time\s*(Eve|Evg|Evening|Aftr|After|Afternoon)|2\s*Time)$/i);
        if (cm) {
            customDays = parseInt(cm[1], 10);
            const slotPart = cm[2].toLowerCase().replace(/\s+/g, '');
            if (/2time/.test(slotPart)) customSlot = '2 Time';
            else if (/aftr|after|afternoon/.test(slotPart)) customSlot = 'Aftr';
            else customSlot = 'Eve';
        }
    }

    let computed = '';
    if (isEdit) {
        const st = studentStatus(s, holidays);
        if (isUnusualPlan(s.plan)) {
            computed = `<div class="computed-info" style="border-color:#7c3aed">
          ⚠ Unusual plan type: <b>${s.plan}</b><br>
          Meal/date calculations skipped for safety.<br>
          Status: <span style="color:#7c3aed">Unusual Plan</span>
        </div>`;
        } else {
            const rem = safeInt(remainingMeals(s, holidays));
            const th = safeInt(totalHolidays(s, holidays));
            const endD = messEndDate(s, holidays);
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const effToday = today < endD ? today : endD;
            const consumedDays = Math.max(0, Math.floor((effToday - parseLocalDate(s.joiningDate)) / 86400000));
            const consumedMeals = safeInt(totalMeals(s.plan)) - rem;
            computed = `<div class="computed-info">
          Total Holidays: ${th} · Mess End: ${fmtDate(endD)}<br>
          Total Meals: ${safeInt(totalMeals(s.plan))} · Remaining: ${rem}<br>
          <span style="font-size:12px;color:var(--text3)">Consumed: ${consumedMeals} meals over ${consumedDays || '0'} days</span><br>
          Status: <span style="color:${st.color}">${st.label}</span>
        </div>`;
        }
    }

    const holidayStrs = Array.isArray(s.studentHolidays) ? s.studentHolidays.join(',') : (s.studentHolidays || '');

    const formHtml = `<h2>${isEdit ? 'Edit' : 'Add'} Student</h2>
    <div class="form-group"><label>Name</label><input id="mName" value="${escapeHtml(s.name || '')}" required placeholder="Full name"></div>
    <div class="form-group"><label>Mobile</label><input id="mMobile" type="tel" value="${escapeHtml(s.mobile || '')}" placeholder="10-digit number"></div>
    <div class="form-group"><label>Joining Date</label>
      <div style="display:flex; gap:10px;">
        <input id="mDate" type="date" value="${defaultDate}" required style="flex:2;" onchange="window.currentJoiningDate=this.value">
        <select id="mJoiningSlot" style="flex:1; padding-left:8px;">
          <option value="Morning/Afternoon" ${s.joiningSlot !== 'Evening' ? 'selected' : ''}>Morning / Afternoon</option>
          <option value="Evening" ${s.joiningSlot === 'Evening' ? 'selected' : ''}>Evening</option>
        </select>
      </div>
      <div class="helper">Select evening if joining late to save 1st meal (for 2-time plans)</div>
    </div>
    <div class="form-group"><label>Plan</label>
      <div id="standardPlanRow" style="display:${isCustomActive ? 'none' : 'block'};">
        <select id="mPlan">${planOpts}</select>
        ${isEdit && isUnusualPlan(s.plan) && !isCustomActive ? '<div class="helper" style="color:#7c3aed">⚠ Non-standard plan — select a known plan to fix</div>' : ''}
      </div>
      <div id="customPlanRow" style="display:${isCustomActive ? 'block' : 'none'};">
        <div style="display:flex; gap:10px; align-items:center;">
          <div style="flex:1;">
            <input id="mCustomDays" type="number" min="1" max="365" value="${customDays}" placeholder="Days" style="width:100%;" oninput="updateCustomPlanPreview()">
          </div>
          <span style="font-size:13px; color:var(--text2); font-weight:600; white-space:nowrap;">Days</span>
          <div style="flex:1.5;">
            <select id="mCustomSlot" style="width:100%;" onchange="updateCustomPlanPreview()">
              <option value="Eve" ${customSlot === 'Eve' ? 'selected' : ''}>Evening</option>
              <option value="Aftr" ${customSlot === 'Aftr' ? 'selected' : ''}>Afternoon</option>
              <option value="2 Time" ${customSlot === '2 Time' ? 'selected' : ''}>2 Time</option>
            </select>
          </div>
        </div>
        <div id="customPlanPreview" style="margin-top:6px; font-size:12px; color:var(--primary); font-weight:600;"></div>
      </div>
      <button type="button" id="customPlanToggle" class="btn btn-secondary" onclick="toggleCustomPlan()" style="margin-top:8px; padding:6px 14px; font-size:12px; display:flex; align-items:center; gap:6px;">
        <span style="font-size:14px;">${isCustomActive ? '📋' : '⚙️'}</span>
        <span id="customPlanToggleLabel">${isCustomActive ? 'Use Standard Plan' : 'Custom Plan (set days & slot)'}</span>
      </button>
    </div>
    <div class="form-group"><label>Amount ₹</label><input id="mAmount" type="number" value="${safeInt(s.amount)}"></div>
    <div class="form-group"><label>Paid ₹</label><input id="mPaid" type="number" value="${safeInt(s.paid)}"></div>
    <div class="form-group"><label>Diet</label><select id="mDiet">
      <option value="Veg" ${s.diet === 'Veg' ? 'selected' : ''}>Veg</option>
      <option value="Non Veg" ${s.diet === 'Non Veg' ? 'selected' : ''}>Non Veg</option>
    </select></div>
    <div class="form-group"><label>Personal Holidays</label>
      <input type="hidden" id="mHolidays" value="${holidayStrs}">
      <button class="btn btn-secondary" onclick="openPersonalHolidaySelector()" style="display:flex; justify-content:space-between; align-items:center;">
        <span id="holidayCountDisplay">${Array.isArray(s.studentHolidays) && s.studentHolidays.length > 0 ? s.studentHolidays.length + ' selected 📅' : 'Select Holidays 📅'}</span>
        <span class="chevron">›</span>
      </button>
      <div class="helper">Select dates after joining date.</div>
    </div>
    <div class="form-group"><label>Payment Notes</label>
      <input id="mPayNotes" value="${s.paymentNotes || ''}" placeholder="e.g. 700 on 1-Feb, 700 on 15-Feb">
      <div class="helper">Optional: track installment history</div>
    </div>
    ${computed}
    <button class="btn btn-primary" id="saveStudentBtn" onclick="saveStudent('${type}','${s.id || ''}')">${isEdit ? 'Update' : 'Add'} Student</button>
    <button class="btn btn-secondary" onclick="tryCloseModal()">Cancel</button>`;

    const html = `
    <div id="studentFormContent">
        ${formHtml}
    </div>
    <div id="holidaySelectorContent" style="display:none;"></div>
    `;
    modalDirty = false;
    openModal(html);
    window.currentJoiningDate = s.joiningDate || '';
    window._customPlanActive = isCustomActive;
    setTimeout(() => {
        document.querySelectorAll('#modal input, #modal select').forEach(el => {
            el.addEventListener('input', () => { modalDirty = true; });
            el.addEventListener('change', () => { modalDirty = true; });
        });
        if (isCustomActive) updateCustomPlanPreview();
    }, 50);
}

/* ===== CUSTOM PLAN HELPERS ===== */
function toggleCustomPlan() {
    window._customPlanActive = !window._customPlanActive;
    const stdRow = document.getElementById('standardPlanRow');
    const custRow = document.getElementById('customPlanRow');
    const toggleLabel = document.getElementById('customPlanToggleLabel');
    const toggleBtn = document.getElementById('customPlanToggle');

    if (window._customPlanActive) {
        stdRow.style.display = 'none';
        custRow.style.display = 'block';
        toggleLabel.textContent = 'Use Standard Plan';
        toggleBtn.querySelector('span').textContent = '📋';
        updateCustomPlanPreview();
    } else {
        stdRow.style.display = 'block';
        custRow.style.display = 'none';
        toggleLabel.textContent = 'Custom Plan (set days & slot)';
        toggleBtn.querySelector('span').textContent = '⚙️';
    }
    modalDirty = true;
}

function updateCustomPlanPreview() {
    const daysEl = document.getElementById('mCustomDays');
    const slotEl = document.getElementById('mCustomSlot');
    const previewEl = document.getElementById('customPlanPreview');
    if (!daysEl || !slotEl || !previewEl) return;
    const days = parseInt(daysEl.value, 10);
    const slot = slotEl.value;
    if (isNaN(days) || days < 1) {
        previewEl.textContent = '⚠ Enter valid number of days';
        previewEl.style.color = 'var(--red)';
        return;
    }
    const planStr = buildCustomPlanString(days, slot);
    const meals = slot === '2 Time' ? days * 2 : days;
    previewEl.innerHTML = `Plan: <b>${planStr}</b> · Total Meals: <b>${meals}</b>`;
    previewEl.style.color = 'var(--primary)';
}

function buildCustomPlanString(days, slot) {
    if (slot === '2 Time') return days + ' Days 2 Time';
    return days + ' Days 1 Time ' + slot;
}

function getSelectedPlan() {
    if (window._customPlanActive) {
        const days = parseInt(document.getElementById('mCustomDays').value, 10);
        const slot = document.getElementById('mCustomSlot').value;
        if (isNaN(days) || days < 1) return null;
        return buildCustomPlanString(days, slot);
    }
    return document.getElementById('mPlan').value;
}

/* ===== PERSONAL HOLIDAY SELECTOR ===== */
let selectedPersonalHolidays = [];

function openPersonalHolidaySelector() {
    const jdVal = document.getElementById('mDate').value || window.currentJoiningDate;
    if (!jdVal) {
        showToast('Please select a Joining Date first so we know when to start the calendar.', 'warning');
        return;
    }

    const existingStr = document.getElementById('mHolidays').value;
    const parsed = parseHolidays(existingStr);

    // Migrate legacy day-of-month integers to proper ISO date strings
    const jdDate = parseLocalDate(jdVal);
    selectedPersonalHolidays = parsed.map(h => {
        if (typeof h === 'number') {
            const d = new Date(jdDate);
            if (h < d.getDate()) {
                d.setMonth(d.getMonth() + 1);
            }
            d.setDate(h);
            return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        }
        return h;
    });

    document.getElementById('studentFormContent').style.display = 'none';
    const container = document.getElementById('holidaySelectorContent');
    container.style.display = 'block';

    renderPersonalHolidayGrid();
}

function renderPersonalHolidayGrid() {
    const jdVal = document.getElementById('mDate').value || window.currentJoiningDate;
    const jdDate = new Date(jdVal);
    jdDate.setHours(0, 0, 0, 0);

    const MAX_DAYS = 90;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const months = {};

    for (let i = 0; i < MAX_DAYS; i++) {
        const d = new Date(jdDate);
        d.setDate(d.getDate() + i);
        const monthKey = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        if (!months[monthKey]) months[monthKey] = [];
        months[monthKey].push(d);
    }

    let html = `<h2>Select Holidays</h2>
    <p style="font-size:13px; color:var(--text2); margin-bottom:15px;">Tap dates to mark as personal holiday.</p>
    <div style="display:flex; justify-content:space-between; margin-bottom:10px; font-size:12px;">
      <span style="display:flex; align-items:center; gap:4px;"><span style="display:inline-block;width:10px;height:10px;background:var(--orange);border-radius:2px;"></span> Selected</span>
      <span style="display:flex; align-items:center; gap:4px;"><span style="display:inline-block;width:10px;height:10px;border:1px solid #3b82f6;border-radius:2px;"></span> Global Holiday</span>
    </div>
    <div style="max-height: 50vh; overflow-y:auto; padding-right:5px;" class="hide-scroll">`;

    Object.keys(months).forEach(mk => {
        const [yy, mm] = mk.split('-');
        const days = months[mk];
        html += `<div>
            <div style="font-weight:600; margin-bottom:12px; margin-top:12px; color:var(--text2); text-transform:uppercase; font-size:13px; letter-spacing:1px;">
                ${monthNames[parseInt(mm) - 1]} ${yy}
            </div>
            <div style="display:grid; grid-template-columns:repeat(7, 1fr); gap:6px;">`;
        ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(d => {
            html += `<div style="text-align:center; font-size:11px; font-weight:700; color:var(--text3);">${d}</div>`;
        });
        const firstDay = days[0];
        const firstDayOfWeek = new Date(firstDay.getFullYear(), firstDay.getMonth(), 1).getDay();
        const startOffset = firstDay.getDate() - 1;
        const totalOffset = (firstDayOfWeek + startOffset) % 7;
        for (let i = 0; i < totalOffset; i++) html += `<div></div>`;

        days.forEach(d => {
            const isoString = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
            const dayOfMonth = d.getDate();
            const isLegacySelected = selectedPersonalHolidays.includes(dayOfMonth);
            const isSelected = selectedPersonalHolidays.includes(isoString) || isLegacySelected;
            const isGlobal = holidays.some(h => h.date === isoString);
            let bg = 'var(--surface2)', border = '1px solid transparent', color = 'var(--text)';
            if (isGlobal) { bg = '#3b82f615'; border = '1px solid #3b82f6'; color = '#3b82f6'; }
            if (isSelected) { bg = 'var(--orange)'; color = '#fff'; border = '1px solid var(--orange)'; }
            html += `<div onclick="togglePersonalHoliday('${isoString}', ${dayOfMonth})" 
               style="aspect-ratio:1; background:${bg}; border:${border}; color:${color}; border-radius:6px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:14px; position:relative;">
               ${dayOfMonth}
               ${isGlobal ? '<span style="position:absolute; bottom:2px; height:4px; width:4px; border-radius:50%; background:#3b82f6"></span>' : ''}
            </div>`;
        });
        html += `</div></div>`;
    });

    html += `</div>
    <div style="display:flex; gap:10px; margin-top:20px;">
      <button class="btn btn-secondary" onclick="cancelHolidaySelection()" style="flex:1;">Cancel</button>
      <button class="btn btn-primary" onclick="confirmHolidaySelection()" style="flex:1;">Done</button>
    </div>`;

    // Preserve scroll position
    const scrollDiv = document.getElementById('holidaySelectorContent').querySelector('.hide-scroll');
    const savedScroll = scrollDiv ? scrollDiv.scrollTop : 0;

    document.getElementById('holidaySelectorContent').innerHTML = html;

    const newScrollDiv = document.getElementById('holidaySelectorContent').querySelector('.hide-scroll');
    if (newScrollDiv && savedScroll > 0) {
        newScrollDiv.scrollTop = savedScroll;
    }
}

function togglePersonalHoliday(isoString, dayInt) {
    modalDirty = true;
    if (selectedPersonalHolidays.includes(isoString)) {
        selectedPersonalHolidays = selectedPersonalHolidays.filter(h => h !== isoString);
    } else if (selectedPersonalHolidays.includes(dayInt)) {
        selectedPersonalHolidays = selectedPersonalHolidays.filter(h => h !== dayInt);
    } else {
        selectedPersonalHolidays.push(isoString);
    }
    renderPersonalHolidayGrid();
}

function cancelHolidaySelection() {
    document.getElementById('holidaySelectorContent').style.display = 'none';
    document.getElementById('studentFormContent').style.display = 'block';
}

function confirmHolidaySelection() {
    const newHolidaysStr = selectedPersonalHolidays.join(',');
    document.getElementById('mHolidays').value = newHolidaysStr;
    document.getElementById('holidayCountDisplay').innerHTML = selectedPersonalHolidays.length > 0 ? selectedPersonalHolidays.length + ' selected 📅' : 'Select Holidays 📅';
    modalDirty = true;
    document.getElementById('holidaySelectorContent').style.display = 'none';
    document.getElementById('studentFormContent').style.display = 'block';
}

/* ===== SAVE STUDENT ===== */
async function saveStudent(type, id) {
    const btn = document.getElementById('saveStudentBtn');
    if (btn.disabled) return;
    const name = document.getElementById('mName').value.trim();
    const jd = document.getElementById('mDate').value;
    if (!name) { showToast('Name is required', 'error'); return; }
    if (!jd) { showToast('Joining date is required', 'error'); return; }

    const joinDate = parseLocalDate(jd);
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((joinDate - now) / 86400000);

    // Resolve plan from standard or custom mode
    const selectedPlan = getSelectedPlan();
    if (!selectedPlan) {
        showToast('Please enter a valid number of days for your custom plan', 'error');
        return;
    }

    const executeSave = async () => {
        const amount = safeInt(document.getElementById('mAmount').value);
        const paid = safeInt(document.getElementById('mPaid').value);

        if (amount < 0 || paid < 0) {
            showToast('Amount and Paid cannot be negative', 'error');
            return;
        }
        if (paid > amount) {
            showToast(`Paid (₹${paid}) cannot exceed Amount (₹${amount})`, 'error');
            return;
        }

        let sh = parseHolidays(document.getElementById('mHolidays').value);
        const rawMobile = document.getElementById('mMobile').value.trim();
        const mobile = rawMobile.replace(/[^\d]/g, '');

        // Remove personal holidays that fall before the joining date unconditionally
        if (id) {
            if (sh.length > 0) {
                const newStart = parseLocalDate(jd);
                const before = sh.length;
                sh = sh.filter(h => {
                    // Date strings (YYYY-MM-DD) — keep only if on/after new joining date
                    if (typeof h === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(h)) {
                        return parseLocalDate(h) >= newStart;
                    }
                    // Day-of-month numbers — keep (they recur monthly)
                    return true;
                });
                const removed = before - sh.length;
                if (removed > 0) {
                    setTimeout(() => showToast(`${removed} holiday(s) before joining date removed`, 'warning'), 500);
                }
            }
        }

        const obj = {
            name, mobile, joiningDate: jd,
            joiningSlot: document.getElementById('mJoiningSlot').value,
            plan: selectedPlan,
            amount, paid,
            diet: document.getElementById('mDiet').value,
            studentHolidays: sh,
            paymentNotes: document.getElementById('mPayNotes').value.trim()
        };

        const originalText = btn.textContent;
        btn.disabled = true; btn.textContent = 'Saving...';
        try {
            const arr = type === 'boys' ? boys : girls;
            if (id) {
                const existing = arr.find(s => s.id === id);
                await updateRecord(type, id, obj);
                const idx = arr.findIndex(s => s.id === id);
                if (idx > -1) arr[idx] = { id, ...obj };
                // Log update details
                const changes = [];
                if (existing) {
                    if (safeInt(existing.paid) !== paid) changes.push(`paid ₹${safeInt(existing.paid)}→₹${paid}`);
                    if (safeInt(existing.amount) !== amount) changes.push(`amount ₹${safeInt(existing.amount)}→₹${amount}`);
                    if (existing.plan !== obj.plan) changes.push(`plan ${existing.plan}→${obj.plan}`);
                    if (existing.joiningDate !== jd) changes.push(`joining date changed`);
                }
                addLog('Student Updated', `Updated ${name} in ${type}${changes.length > 0 ? ': ' + changes.join(', ') : ''}`);
            } else {
                const saved = await addRecord(type, obj);
                arr.push(saved);
                addLog('Student Added', `Added ${name} to ${type} (${obj.plan}, ₹${amount})`);
            }
            modalDirty = false;
            closeModal(); render();
            showToast('Student saved');
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        } finally {
            btn.disabled = false; btn.textContent = originalText;
        }
    };

    if (diffDays > 7) {
        openConfirmModal(`Joining date is ${diffDays} days in the future. Are you sure?`, executeSave);
    } else {
        executeSave();
    }
}

function editStudent(type, id) {
    const arr = type === 'boys' ? boys : girls;
    const s = arr.find(x => x.id === id);
    if (s) openStudentModal(type, s);
}

async function deleteStudent(type, id) {
    const arr = type === 'boys' ? boys : girls;
    const s = arr.find(x => x.id === id);
    if (!s) return;

    const key = s.name.toLowerCase().replace(/\s+/g, '');
    const otherPlans = arr.filter(x => x.name.toLowerCase().replace(/\s+/g, '') === key && x.id !== id);
    const isJustAPlan = otherPlans.length > 0;

    const confirmMsg = isJustAPlan 
        ? `Delete this specific plan for <b>${s.name}</b> (${s.plan} joined ${fmtDate(s.joiningDate)})?`
        : `Delete <b>${s.name}</b> and all their records? This cannot be undone.`;

    openConfirmModal(confirmMsg, async () => {
        try {
            await deleteRecord(type, id);
            if (type === 'boys') boys = boys.filter(x => x.id !== id);
            else girls = girls.filter(x => x.id !== id);

            const logTag = isJustAPlan ? 'Plan Deleted' : 'Student Deleted';
            const logMsg = isJustAPlan ? `${s.name}: Deleted ${s.plan} plan starting ${fmtDate(s.joiningDate)}` : `Deleted ${s.name} completely from ${type}`;
            
            addLog(logTag, logMsg);
            render(); 
            showToast(isJustAPlan ? 'Plan deleted' : 'Student deleted');
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        }
    });
}

// Renew student with new joining date (prior end date) and reset paid
function renewStudent(type, id) {
    const arr = type === 'boys' ? boys : girls;
    const s = arr.find(x => x.id === id);
    if (!s) return;

    let newJoiningStr = getLocalTodayStr();
    const endD = messEndDate(s, holidays);
    if (endD && !isNaN(endD.getTime())) {
        newJoiningStr = endD.getFullYear() + '-' + String(endD.getMonth() + 1).padStart(2, '0') + '-' + String(endD.getDate()).padStart(2, '0');
    }

    addLog('Student Renewed', `Renewed ${s.name} in ${type} (prev joining: ${s.joiningDate || 'N/A'})`);
    openStudentModal(type, { ...s, id: '', joiningDate: newJoiningStr, paid: 0, studentHolidays: [], joiningSlot: 'Morning/Afternoon' });
    setTimeout(() => showToast('Renewing — please verify new joining date and plan if needed.', 'warning'), 300);
}

// Batch renew all mess-over students
function renewAllMessOver(type) {
    const arr = type === 'boys' ? boys : girls;
    const unique = getUniqueStudents(arr);
    const allMessOver = unique.filter(s => studentStatus(s, holidays).label === 'Mess Over');

    if (allMessOver.length === 0) {
        showToast('No mess-over students found', 'warning');
        return;
    }

    // Split into eligible (no dues) and skipped (has dues)
    const eligible = [];
    const skipped = [];
    allMessOver.forEach(s => {
        const key = s.name.toLowerCase().replace(/\s+/g, '');
        const allSubs = arr.filter(x => x.name.toLowerCase().replace(/\s+/g, '') === key);
        const pending = allSubs.reduce((acc, x) => acc + Math.max(0, safeInt(x.amount) - safeInt(x.paid)), 0);
        if (pending <= 0) eligible.push(s);
        else skipped.push({ ...s, _pending: pending });
    });

    let html = `<div style="text-align:left;">`;

    if (eligible.length > 0) {
        const nameList = eligible.map(s => `\u2022 ${escapeHtml(s.name)} (${s.plan})`).join('<br>');
        html += `<b>\u2705 Will renew (${eligible.length}):</b><br>
        <div style="max-height:150px;overflow-y:auto;font-size:13px;color:var(--text2);line-height:1.8;margin:8px 0;">${nameList}</div>`;
    }

    if (skipped.length > 0) {
        const skipList = skipped.map(s => `\u2022 ${escapeHtml(s.name)} \u2014 <span style="color:var(--red)">${fmtMoney(s._pending)} due</span>`).join('<br>');
        html += `<b style="color:var(--orange)">\u26a0\ufe0f Skipped \u2014 dues pending (${skipped.length}):</b><br>
        <div style="max-height:150px;overflow-y:auto;font-size:13px;color:var(--text2);line-height:1.8;margin:8px 0;">${skipList}</div>`;
    }

    if (eligible.length === 0) {
        html += `<p style="color:var(--text2);font-size:13px;">All mess-over students have pending dues. Clear their dues first to enable batch renewal.</p>`;
    }

    html += `<span style="font-size:12px;color:var(--text3)">New records will be created with joining date = mess end date, paid reset to \u20b90, same plan & amount.</span></div>`;

    if (eligible.length === 0) {
        // Just show info, no action
        openModal(`<h2>Renew All</h2>${html}<div style="margin-top:16px;text-align:right;"><button class="btn btn-secondary" onclick="closeModal()">Close</button></div>`);
        return;
    }

    openConfirmModal(html,
        async () => {
            showLoading();
            try {
                let renewed = 0;
                let renewedNames = [];
                for (const s of eligible) {
                    let newJoiningStr = getLocalTodayStr();
                    const endD = messEndDate(s, holidays);
                    if (endD && !isNaN(endD.getTime())) {
                        newJoiningStr = endD.getFullYear() + '-' + String(endD.getMonth() + 1).padStart(2, '0') + '-' + String(endD.getDate()).padStart(2, '0');
                    }
                    const obj = {
                        name: s.name,
                        mobile: s.mobile || '',
                        joiningDate: newJoiningStr,
                        joiningSlot: 'Morning/Afternoon',
                        plan: s.plan,
                        amount: safeInt(s.amount),
                        paid: 0,
                        diet: s.diet || 'Veg',
                        studentHolidays: [],
                        paymentNotes: ''
                    };
                    const saved = await addRecord(type, obj);
                    arr.push(saved);
                    renewed++;
                    renewedNames.push(s.name);
                }
                const namesStr = renewedNames.length > 10 ? renewedNames.slice(0, 10).join(', ') + ` and ${renewedNames.length - 10} others` : renewedNames.join(', ');
                addLog('Batch Renewal', `Renewed ${renewed} students in ${type}: ${namesStr}`);
                hideLoading();
                render();
                showToast(`Renewed ${renewed} students successfully`);
            } catch (err) {
                hideLoading();
                showToast('Error: ' + err.message, 'error');
            }
        }
    );
}

/* ===== PLAN CONVERSION ===== */
function convertPlan(type, id) {
    const arr = type === 'boys' ? boys : girls;
    const s = arr.find(x => x.id === id);
    if (!s) return;

    const isUnusual = isUnusualPlan(s.plan) || /12\s*time/i.test(s.plan);
    if (isUnusual) {
        showToast('Cannot convert unusual or 12-time plans', 'warning');
        return;
    }

    const sim = simulatePlan(s, holidays);
    const consumed = sim.consumedMeals;
    const plans = KNOWN_PLANS.filter(p => !/12\s*time/i.test(p));
    const otherPlans = plans.filter(p => p !== s.plan);
    let planOpts = otherPlans.map(p => `<option value="${p}">${p}</option>`).join('');

    const todayStr = getLocalTodayStr();

    const html = `<h2>🔄 Convert Plan</h2>
    <div style="background:var(--bg); padding:12px; border-radius:10px; border:1px solid var(--border); margin-bottom:16px;">
        <div style="font-weight:700; font-size:15px; margin-bottom:4px;">${escapeHtml(s.name)}</div>
        <div style="font-size:13px; color:var(--text2);">Current: <b>${escapeHtml(s.plan)}</b> (${isTwoTime(s.plan) ? '2x' : '1x'} meals/day)</div>
        <div style="font-size:13px; color:var(--text2);">Joined: ${fmtDate(s.joiningDate)} · Meals eaten so far: <b>${consumed}</b> of ${totalMeals(s.plan)}</div>
        <div style="font-size:13px; color:var(--text2);">Amount: ${fmtMoney(s.amount)} · Paid: ${fmtMoney(s.paid)}</div>
    </div>
    <div class="form-group"><label>Convert From Date</label>
        <input id="convertDate" type="date" value="${todayStr}" onchange="updateConvertPreview('${type}', '${id}')">
        <div class="helper">Meals consumed up to this date will be counted. Set to tomorrow to convert after tomorrow's meals.</div>
    </div>
    <div class="form-group"><label>Last Meal Slot on Convert Date</label>
        <select id="convertSlot" onchange="updateConvertPreview('${type}', '${id}')">
            <option value="end_of_day" selected>After all meals (end of day)</option>
            <option value="after_afternoon">After Afternoon meal only</option>
            <option value="before_meals">Before any meals (start of day)</option>
        </select>
        <div class="helper">How many meals will be eaten on the convert date</div>
    </div>
    <div class="form-group"><label>Convert to Plan</label>
        <select id="convertNewPlan" onchange="updateConvertPreview('${type}', '${id}')">${planOpts}</select>
    </div>
    <div class="form-group"><label>New Plan Amount ₹</label>
        <input id="convertNewAmount" type="number" value="${safeInt(s.amount)}" onchange="updateConvertPreview('${type}', '${id}')" oninput="updateConvertPreview('${type}', '${id}')">
        <div class="helper">Enter the standard amount for the new plan</div>
    </div>
    <div id="convertPreview" style="background:var(--bg); padding:12px; border-radius:10px; border:1px solid var(--primary); margin-bottom:16px;"></div>
    <div style="display:flex; gap:10px;">
        <button class="btn btn-secondary" onclick="closeModal()" style="flex:1;">Cancel</button>
        <button class="btn btn-primary" id="convertConfirmBtn" onclick="executeConversion('${type}', '${id}')" style="flex:1;">Convert Plan</button>
    </div>`;

    openModal(html);
    setTimeout(() => updateConvertPreview(type, id), 50);
}

// Calculate meals consumed up to a specific date + slot
function getConsumedMealsUpTo(s, convertDateStr, slotOption) {
    const sim = simulatePlan(s, holidays);
    const convertDate = parseLocalDate(convertDateStr);
    convertDate.setHours(0, 0, 0, 0);

    let consumed = 0;
    sim.history.forEach(day => {
        const dayTime = day.date.getTime();
        if (dayTime < convertDate.getTime()) {
            consumed += (day.mealsConsumed || 0);
        } else if (dayTime === convertDate.getTime()) {
            if (slotOption === 'end_of_day') {
                consumed += (day.mealsConsumed || 0);
            } else if (slotOption === 'after_afternoon') {
                if (isTwoTime(s.plan)) {
                    consumed += day.isHoliday ? 0 : 1;
                } else if (isAfternoon(s.plan)) {
                    consumed += (day.mealsConsumed || 0);
                }
            }
        }
    });
    return consumed;
}

function updateConvertPreview(type, id) {
    const arr = type === 'boys' ? boys : girls;
    const s = arr.find(x => x.id === id);
    if (!s) return;

    const convertDateStr = document.getElementById('convertDate').value;
    const slotOption = document.getElementById('convertSlot').value;
    const consumed = getConsumedMealsUpTo(s, convertDateStr, slotOption);
    const newPlan = document.getElementById('convertNewPlan').value;
    const newAmount = safeInt(document.getElementById('convertNewAmount').value);
    const newMult = isTwoTime(newPlan) ? 2 : 1;
    const equivalentDays = Math.ceil(consumed / newMult);

    const convertDate = parseLocalDate(convertDateStr);
    convertDate.setHours(0, 0, 0, 0);
    const newJoining = new Date(convertDate);
    newJoining.setDate(newJoining.getDate() - equivalentDays);
    const newJoiningStr = newJoining.getFullYear() + '-' + String(newJoining.getMonth() + 1).padStart(2, '0') + '-' + String(newJoining.getDate()).padStart(2, '0');

    const newTotalMeals = totalMeals(newPlan);
    const newRemaining = Math.max(0, newTotalMeals - consumed);
    const amountDiff = newAmount - safeInt(s.amount);
    const carried = safeInt(s.paid);
    const newPending = Math.max(0, newAmount - carried);

    const el = document.getElementById('convertPreview');
    el.innerHTML = `
        <div style="font-size:13px; font-weight:700; color:var(--primary); margin-bottom:8px;">Conversion Preview</div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; font-size:13px;">
            <div style="color:var(--text2);">Meals consumed till ${fmtDate(convertDateStr)}:</div><div style="font-weight:600;">${consumed}</div>
            <div style="color:var(--text2);">New multiplier:</div><div style="font-weight:600;">${newMult}x (${newPlan})</div>
            <div style="color:var(--text2);">Equivalent days used:</div><div style="font-weight:600;">${equivalentDays} days</div>
            <div style="color:var(--text2);">New joining date:</div><div style="font-weight:600;">${fmtDate(newJoiningStr)}</div>
            <div style="color:var(--text2);">New total meals:</div><div style="font-weight:600;">${newTotalMeals}</div>
            <div style="color:var(--text2);">Meals remaining:</div><div style="font-weight:600; color:var(--green);">${newRemaining}</div>
        </div>
        <div style="border-top:1px solid var(--border); margin-top:8px; padding-top:8px; font-size:13px;">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
                <div style="color:var(--text2);">New amount:</div><div style="font-weight:600;">${fmtMoney(newAmount)}</div>
                <div style="color:var(--text2);">Already paid:</div><div style="font-weight:600;">${fmtMoney(carried)}</div>
                <div style="color:var(--text2);">Amount diff:</div><div style="font-weight:600; color:${amountDiff > 0 ? 'var(--red)' : amountDiff < 0 ? 'var(--green)' : 'var(--text)'};">${amountDiff > 0 ? '+' : ''}${fmtMoney(amountDiff)}</div>
                <div style="color:var(--text2);">New pending:</div><div style="font-weight:700; color:${newPending > 0 ? 'var(--red)' : 'var(--green)'};">${fmtMoney(newPending)}</div>
            </div>
        </div>`;
}

async function executeConversion(type, id) {
    const arr = type === 'boys' ? boys : girls;
    const s = arr.find(x => x.id === id);
    if (!s) return;

    const convertDateStr = document.getElementById('convertDate').value;
    const slotOption = document.getElementById('convertSlot').value;
    const consumed = getConsumedMealsUpTo(s, convertDateStr, slotOption);
    const newPlan = document.getElementById('convertNewPlan').value;
    const newAmount = safeInt(document.getElementById('convertNewAmount').value);
    const newMult = isTwoTime(newPlan) ? 2 : 1;
    const equivalentDays = Math.ceil(consumed / newMult);

    const convertDate = parseLocalDate(convertDateStr);
    convertDate.setHours(0, 0, 0, 0);
    const newJoining = new Date(convertDate);
    newJoining.setDate(newJoining.getDate() - equivalentDays);
    const newJoiningStr = newJoining.getFullYear() + '-' + String(newJoining.getMonth() + 1).padStart(2, '0') + '-' + String(newJoining.getDate()).padStart(2, '0');

    const carried = safeInt(s.paid);

    const btn = document.getElementById('convertConfirmBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Converting...'; }

    try {
        const obj = {
            name: s.name,
            mobile: s.mobile || '',
            joiningDate: newJoiningStr,
            joiningSlot: 'Morning/Afternoon',
            plan: newPlan,
            amount: newAmount,
            paid: carried,
            diet: s.diet || 'Veg',
            studentHolidays: [],
            paymentNotes: s.paymentNotes ? s.paymentNotes + ` | Converted from ${s.plan} on ${fmtDate(convertDateStr)}` : `Converted from ${s.plan} on ${fmtDate(convertDateStr)}`
        };
        const saved = await addRecord(type, obj);
        arr.push(saved);

        addLog('Plan Converted', `${s.name}: ${s.plan} → ${newPlan} (${consumed} meals consumed till ${fmtDate(convertDateStr)}, ${equivalentDays} equiv days, paid ₹${carried} carried over)`);

        modalDirty = false;
        closeModal();
        render();
        showToast(`Converted ${s.name} to ${newPlan}`);
    } catch (err) {
        if (btn) { btn.disabled = false; btn.textContent = 'Convert Plan'; }
        showToast('Error: ' + err.message, 'error');
    }
}

/* ===== HOLIDAY MODAL ===== */
function openHolidayModal(holiday) {
    const h = holiday || {};
    const isEdit = !!holiday;
    const html = `<h2>${isEdit ? 'Edit' : 'Add'} Holiday</h2>
    <div class="form-group"><label>Date</label><input id="hDate" type="date" value="${h.date || ''}" required></div>
    <div class="form-group"><label>Slot</label><select id="hSlot">
      <option value="Whole Day" ${h.slot === 'Whole Day' ? 'selected' : ''}>Whole Day</option>
      <option value="Afternoon" ${h.slot === 'Afternoon' ? 'selected' : ''}>Afternoon</option>
      <option value="Evening" ${h.slot === 'Evening' ? 'selected' : ''}>Evening</option>
    </select></div>
    <div class="form-group"><label>Reason / Note</label><input id="hReason" value="${h.reason || ''}" placeholder="Optional"></div>
    <button class="btn btn-primary" id="saveHolidayBtn" onclick="saveHoliday('${h.id || ''}')">Save</button>
    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>`;
    openModal(html);
}

async function saveHoliday(id) {
    const btn = document.getElementById('saveHolidayBtn');
    const date = document.getElementById('hDate').value;
    if (!date) { showToast('Date is required', 'error'); return; }
    const obj = { date, slot: document.getElementById('hSlot').value, reason: document.getElementById('hReason').value.trim() };

    const originalText = btn.textContent;
    btn.disabled = true; btn.textContent = 'Saving...';
    try {
        if (id) {
            await updateRecord('holidays', id, obj);
            const idx = holidays.findIndex(h => h.id === id);
            if (idx > -1) holidays[idx] = { id, ...obj };
            addLog('Holiday Updated', `Updated holiday on ${fmtDate(date)} (${obj.slot})`);
        } else {
            const saved = await addRecord('holidays', obj);
            holidays.push(saved);
            addLog('Holiday Added', `Added holiday on ${fmtDate(date)} (${obj.slot})${obj.reason ? ' — ' + obj.reason : ''}`);
        }
        closeModal(); render();
        showToast('Holiday saved');
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    } finally {
        btn.disabled = false; btn.textContent = originalText;
    }
}

function editHoliday(id) {
    const h = holidays.find(x => x.id === id);
    if (h) openHolidayModal(h);
}

async function deleteHoliday(id) {
    const h = holidays.find(x => x.id === id);
    if (!h) return;

    openConfirmModal(`Delete global holiday on <b>${fmtDate(h.date)}</b>?`, async () => {
        try {
            await deleteRecord('holidays', id);
            holidays = holidays.filter(x => x.id !== id);
            addLog('Holiday Deleted', `Deleted holiday on ${fmtDate(h.date)} (${h.slot})`);
            render(); showToast('Holiday deleted');
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        }
    });
}

/* ===== DAILY ENTRY MODAL ===== */
function openDailyModal(entry) {
    const e = entry || {};
    const isEdit = !!entry;
    const today = getLocalTodayStr();
    const html = `<h2>${isEdit ? 'Edit' : 'Add'} Entry</h2>
    <div class="form-group"><label>Date</label><input id="dDate" type="date" value="${e.date || today}"></div>
    <div class="form-group"><label>Slot</label><select id="dSlot">
      <option value="Afternoon" ${e.slot === 'Afternoon' ? 'selected' : ''}>Afternoon</option>
      <option value="Evening" ${e.slot === 'Evening' ? 'selected' : ''}>Evening</option>
    </select></div>
    <div class="form-group"><label>Online ₹</label><input id="dOnline" type="number" value="${e.online || 0}"></div>
    <div class="form-group"><label>Cash ₹</label><input id="dCash" type="number" value="${e.cash || 0}"></div>
    <div class="computed-info" id="dTotal">Total: ${fmtMoney((e.online || 0) + (e.cash || 0))}</div>
    <button class="btn btn-primary" id="saveDailyBtn" onclick="saveDailyEntry('${e.id || ''}')">Save</button>
    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>`;
    openModal(html);
    setTimeout(() => {
        const oI = document.getElementById('dOnline'), cI = document.getElementById('dCash');
        if (oI && cI) {
            const upd = () => { document.getElementById('dTotal').textContent = 'Total: ' + fmtMoney((parseInt(oI.value) || 0) + (parseInt(cI.value) || 0)); };
            oI.oninput = upd; cI.oninput = upd;
        }
    }, 50);
}

async function saveDailyEntry(id) {
    const btn = document.getElementById('saveDailyBtn');
    const date = document.getElementById('dDate').value;
    const slot = document.getElementById('dSlot').value;
    const online = safeInt(document.getElementById('dOnline').value);
    const cash = safeInt(document.getElementById('dCash').value);
    const obj = { date, slot, online, cash };

    const executeSave = async () => {
        const originalText = btn.textContent;
        btn.disabled = true; btn.textContent = 'Saving...';
        try {
            if (id) {
                await updateRecord('dailyEntries', id, obj);
                const idx = dailyEntries.findIndex(e => e.id === id);
                if (idx > -1) dailyEntries[idx] = { id, ...obj };
                addLog('Daily Entry Updated', `Updated ${slot} entry for ${fmtDate(date)}: Online ₹${online}, Cash ₹${cash}`);
            } else {
                const saved = await addRecord('dailyEntries', obj);
                dailyEntries.push(saved);
                addLog('Daily Entry Added', `Added ${slot} entry for ${fmtDate(date)}: Online ₹${online}, Cash ₹${cash}`);
            }
            closeModal(); render();
            showToast('Entry saved');
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        } finally {
            btn.disabled = false; btn.textContent = originalText;
        }
    };

    if (!id) {
        const dup = dailyEntries.find(e => e.date === date && e.slot === slot);
        if (dup) {
            openConfirmModal(`An entry for ${slot} on ${fmtDate(date)} already exists (Online: ${fmtMoney(dup.online)}, Cash: ${fmtMoney(dup.cash)}). Add another?`, executeSave);
            return;
        }
    }

    executeSave();
}

function editDailyEntry(id) {
    const e = dailyEntries.find(x => x.id === id);
    if (e) openDailyModal(e);
}

async function deleteDailyEntry(id) {
    const e = dailyEntries.find(x => x.id === id);
    if (!e) return;

    openConfirmModal(`Delete <b>${e.slot}</b> entry for ${fmtDate(e.date)}?`, async () => {
        try {
            await deleteRecord('dailyEntries', id);
            dailyEntries = dailyEntries.filter(x => x.id !== id);
            addLog('Daily Entry Deleted', `Deleted ${e.slot} entry for ${fmtDate(e.date)}`);
            render(); showToast('Entry deleted');
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        }
    });
}

/* ===== SETTINGS / IMPORT / EXPORT ===== */
function openSettings() {
    const html = `<h2>Settings</h2>
    <ul class="settings-list">
      <li onclick="exportJSON()"><span>Export Data (JSON)</span><span class="chevron">›</span></li>
      <li onclick="document.getElementById('importFile').click()"><span>Import Data (JSON)</span><span class="chevron">›</span></li>
      <li onclick="exportCSV()"><span>Export CSV</span><span class="chevron">›</span></li>
    </ul>
    <input type="file" id="importFile" accept=".json" style="display:none" onchange="importJSON(event)">
    <button class="btn btn-secondary" onclick="closeModal()" style="margin-top:12px">Close</button>`;
    openModal(html);
}

function exportJSON() {
    const data = { boys, girls, holidays, dailyEntries, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'mess-data.json'; a.click();
    showToast('JSON exported (with IDs)');
}

async function importJSON(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async function (ev) {
        let imported;
        try {
            imported = JSON.parse(ev.target.result);
        } catch (parseErr) {
            showToast('Invalid JSON file: ' + parseErr.message, 'error');
            return;
        }
        if (!imported || typeof imported !== 'object') {
            showToast('JSON file does not contain valid data', 'error');
            return;
        }
        if (!imported.boys && !imported.girls && !imported.holidays && !imported.dailyEntries) {
            showToast('JSON file must have boys, girls, holidays, or dailyEntries', 'error');
            return;
        }

        openConfirmModal(`Import ${(imported.boys || []).length} boys, ${(imported.girls || []).length} girls, ${(imported.holidays || []).length} holidays, ${(imported.dailyEntries || []).length} daily entries?<br><br><b style="color:var(--red)">This will replace ALL existing data.</b>`, async () => {
            showLoading();
            try {
                const newBoys = [], newGirls = [], newHols = [], newDaily = [];
                if (imported.boys) for (const b of imported.boys) { const { id, ...d } = b; newBoys.push(await addRecord('boys', d)); }
                if (imported.girls) for (const g of imported.girls) { const { id, ...d } = g; newGirls.push(await addRecord('girls', d)); }
                if (imported.holidays) for (const h of imported.holidays) { const { id, ...d } = h; newHols.push(await addRecord('holidays', d)); }
                if (imported.dailyEntries) for (const e of imported.dailyEntries) { const { id, ...d } = e; newDaily.push(await addRecord('dailyEntries', d)); }

                const oldIds = { boys: boys.map(x => x.id), girls: girls.map(x => x.id), holidays: holidays.map(x => x.id), dailyEntries: dailyEntries.map(x => x.id) };
                for (const col of ['boys', 'girls', 'holidays', 'dailyEntries']) {
                    for (const oid of oldIds[col]) {
                        try { await deleteRecord(col, oid); } catch { }
                    }
                }

                boys = newBoys; girls = newGirls; holidays = newHols; dailyEntries = newDaily;
                addLog('Data Imported', `Imported ${boys.length} boys, ${girls.length} girls, ${holidays.length} holidays, ${dailyEntries.length} daily entries`);
                hideLoading(); closeModal(); render();
                showToast('Data imported successfully');
            } catch (err) {
                hideLoading();
                showToast('Import failed: ' + err.message, 'error');
            }
        });
    };
    reader.readAsText(file);
}

function exportCSV() {
    function toCSV(arr, name) {
        if (arr.length === 0) return;
        const keys = [...new Set(arr.flatMap(r => Object.keys(r)))];
        let csv = keys.join(',') + '\n';
        arr.forEach(r => {
            csv += keys.map(k => {
                let v = r[k];
                if (v === undefined || v === null) v = '';
                else if (Array.isArray(v)) v = '"' + v.join(';') + '"';
                else if (typeof v === 'string' && v.includes(',')) v = '"' + v + '"';
                return v;
            }).join(',') + '\n';
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name + '.csv'; a.click();
    }

    function toStudentCSV(arr, name) {
        if (arr.length === 0) return;
        const columns = ['name', 'mobile', 'joiningDate', 'messEndDate', 'plan', 'amount', 'paid', 'amountPending', 'diet', 'paymentNotes'];
        let csv = columns.join(',') + '\n';
        arr.forEach(s => {
            const isUnusual = isUnusualPlan(s.plan) || /12\s*time/i.test(s.plan);
            const endD = !isUnusual ? messEndDate(s, holidays) : null;
            const endDateStr = endD ? fmtDate(endD) : '';
            const pending = Math.max(0, safeInt(s.amount) - safeInt(s.paid));
            const row = {
                name: s.name || '',
                mobile: s.mobile || '',
                joiningDate: s.joiningDate ? fmtDate(s.joiningDate) : '',
                messEndDate: endDateStr,
                plan: s.plan || '',
                amount: safeInt(s.amount),
                paid: safeInt(s.paid),
                amountPending: pending,
                diet: s.diet || '',
                paymentNotes: s.paymentNotes || ''
            };
            csv += columns.map(k => {
                let v = row[k];
                if (v === undefined || v === null) v = '';
                v = String(v);
                if (v.includes(',') || v.includes('"')) v = '"' + v.replace(/"/g, '""') + '"';
                return v;
            }).join(',') + '\n';
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name + '.csv'; a.click();
    }

    toStudentCSV(boys, 'boys');
    setTimeout(() => toStudentCSV(girls, 'girls'), 200);
    setTimeout(() => toCSV(holidays, 'holidays'), 400);
    setTimeout(() => toCSV(dailyEntries, 'daily_entries'), 600);
    showToast('CSV files exported');
}

function openSettingsModal() {
    const cfg = getConfig();
    const varsHelp = '<div class="template-vars">Variables: <code>{name}</code> <code>{mess_name}</code> <code>{joining_date}</code> <code>{plan}</code> <code>{amount}</code> <code>{paid}</code> <code>{pending}</code> <code>{holidays}</code> <code>{end_date}</code> <code>{upi_link}</code> <code>{upi_id}</code> <code>{prev_joining_date}</code> <code>{new_joining_date}</code> <code>{group_link}</code></div>';
    const html = `<h2>Mess Settings</h2>
    <div style="max-height:70vh; overflow-y:auto; padding-right:4px;">
    <div class="form-group"><label>Mess Name</label><input id="cfgName" type="text" value="${escapeHtml(cfg.messName)}"></div>
    <div class="form-group"><label>UPI ID</label><input id="cfgUpi" type="text" value="${escapeHtml(cfg.upiId)}"></div>
    <div class="form-group"><label>Boys Group Link</label><input id="cfgBoysGrp" type="text" value="${escapeHtml(cfg.boysGroupLink)}"></div>
    <div class="form-group"><label>Girls Group Link</label><input id="cfgGirlsGrp" type="text" value="${escapeHtml(cfg.girlsGroupLink)}"></div>
    <div style="margin-top:20px; margin-bottom:8px; font-size:13px; font-weight:700; color:var(--text2); text-transform:uppercase; letter-spacing:.5px;">Database Tasks</div>
    <button class="btn btn-secondary" onclick="cleanOldHolidaysForAll()" style="margin-bottom:12px;display:flex;align-items:center;justify-content:center;gap:8px;"><span style="font-size:16px">🧹</span> Clean Up Past Personal Holidays</button>
    <div style="margin-top:20px; margin-bottom:8px; font-size:13px; font-weight:700; color:var(--text2); text-transform:uppercase; letter-spacing:.5px;">Message Templates</div>
    <div class="form-group"><label>Welcome Message</label><textarea id="cfgWelcome" rows="12">${escapeHtml(cfg.welcomeTemplate)}</textarea>${varsHelp}</div>
    <div class="form-group"><label>Payment Reminder</label><textarea id="cfgPayment" rows="10">${escapeHtml(cfg.paymentTemplate)}</textarea>${varsHelp}</div>
    <div class="form-group"><label>Mess Renewal Message</label><textarea id="cfgRenewal" rows="10">${escapeHtml(cfg.renewalTemplate)}</textarea>${varsHelp}</div>
    </div>
    <div style="margin-top:20px; display:flex; gap:10px;">
        <button class="btn btn-secondary" onclick="closeModal()" style="flex:1;">Cancel</button>
        <button class="btn btn-primary" onclick="saveSettingsFromModal()" style="flex:1;">Save</button>
    </div>
    <div style="margin-top:20px; text-align:center;">
        <button class="btn btn-secondary" onclick="logout()" style="display:inline-flex;align-items:center;justify-content:center;gap:8px; color:var(--red); border:1px solid var(--red); background:transparent;"><span style="font-size:16px">🔐</span> Logout Securely</button>
    </div>`;
    openModal(html);
}

function saveSettingsFromModal() {
    const cfg = {
        messName: document.getElementById('cfgName').value.trim(),
        upiId: document.getElementById('cfgUpi').value.trim(),
        boysGroupLink: document.getElementById('cfgBoysGrp').value.trim(),
        girlsGroupLink: document.getElementById('cfgGirlsGrp').value.trim(),
        welcomeTemplate: document.getElementById('cfgWelcome').value,
        paymentTemplate: document.getElementById('cfgPayment').value,
        renewalTemplate: document.getElementById('cfgRenewal').value
    };
    saveConfig(cfg);
    addLog('Settings Updated', 'Updated mess settings');
}

/* ===== REFRESH DATA ===== */
async function refreshData() {
    try {
        showLoading();
        const [b, g, h, d, l] = await Promise.all([
            loadCollection('boys').catch(e => { console.warn('boys load error:', e); return []; }),
            loadCollection('girls').catch(e => { console.warn('girls load error:', e); return []; }),
            loadCollection('holidays').catch(e => { console.warn('holidays load error:', e); return []; }),
            loadCollection('dailyEntries').catch(e => { console.warn('dailyEntries load error:', e); return []; }),
            loadCollection('logs').catch(e => { console.warn('logs load error:', e); return []; })
        ]);
        boys = b; girls = g; holidays = h; dailyEntries = d; activityLogs = l;
        activityLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        hideLoading();
        render();
        showToast(`Refreshed: ${boys.length} boys, ${girls.length} girls`);
    } catch (err) {
        hideLoading();
        showToast('Refresh failed: ' + err.message, 'error');
    }
}

/* ===== INIT ===== */
async function initApp() {
    try {
        showLoading();
        const [b, g, h, d, l] = await Promise.all([
            loadCollection('boys').catch(e => { console.warn('boys load error:', e); return []; }),
            loadCollection('girls').catch(e => { console.warn('girls load error:', e); return []; }),
            loadCollection('holidays').catch(e => { console.warn('holidays load error:', e); return []; }),
            loadCollection('dailyEntries').catch(e => { console.warn('dailyEntries load error:', e); return []; }),
            loadCollection('logs').catch(e => { console.warn('logs load error:', e); return []; })
        ]);
        boys = b; girls = g; holidays = h; dailyEntries = d; activityLogs = l;
        activityLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        hideLoading();
        render();
        if (boys.length || girls.length) {
            showToast(`Loaded: ${boys.length} boys, ${girls.length} girls`);
        }
    } catch (err) {
        hideLoading();
        console.warn('initApp error:', err);
        render();
    }
}

initApp();

/* ===== DELEGATED EVENT LISTENER ===== */
document.body.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-action');
    const id = btn.getAttribute('data-id');
    const type = btn.getAttribute('data-type');
    const name = btn.getAttribute('data-name');

    // If action is inside a modal, close it first then perform action
    const insideModal = btn.closest('#modal');
    const executeAction = () => {
        if (action === 'edit') editStudent(type, id);
        else if (action === 'delete') deleteStudent(type, id);
        else if (action === 'renew') renewStudent(type, id);
        else if (action === 'convert') convertPlan(type, id);
        else if (action === 'history') openHistoryModal(name, type);
        else if (action === 'calendar') openCalendarModal(type, id);
        else if (action === 'wa') openWaModal(id, type);
    };

    if (insideModal && (action === 'edit' || action === 'renew' || action === 'wa' || action === 'convert')) {
        closeModal();
        setTimeout(executeAction, 300);
    } else {
        executeAction();
    }
});

/* ===== DATABASE TASKS ===== */
function cleanOldHolidaysForAll() {
    openConfirmModal('This will scan all students and remove any personal holidays that fall before their current joining date. Proceed?', async () => {
        try {
            showLoading();
            let removedCount = 0;
            let updatedStudents = 0;

            const processCollection = async (type, arr) => {
                for (let s of arr) {
                    if (s.studentHolidays && s.studentHolidays.length > 0 && s.joiningDate) {
                        const newStart = parseLocalDate(s.joiningDate);
                        const before = s.studentHolidays.length;
                        const newHols = s.studentHolidays.filter(h => {
                            if (typeof h === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(h)) {
                                return parseLocalDate(h) >= newStart;
                            }
                            return true;
                        });

                        if (newHols.length < before) {
                            removedCount += (before - newHols.length);
                            updatedStudents++;
                            s.studentHolidays = newHols;
                            await updateRecord(type, s.id, { studentHolidays: newHols });
                        }
                    }
                }
            };

            await processCollection('boys', boys);
            await processCollection('girls', girls);

            hideLoading();
            closeModal();
            render();

            if (removedCount > 0) {
                addLog('Holidays Cleaned', `Removed ${removedCount} past holidays across ${updatedStudents} students`);
                showToast(`Cleaned up ${removedCount} past holidays`);
            } else {
                showToast('No past holidays found to clean up');
            }
        } catch (err) {
            hideLoading();
            showToast('Error: ' + err.message, 'error');
        }
    });
}

/* ===== DASHBOARD CALCULATORS ===== */
function runDateCalculator() {
    const startObj = document.getElementById('calcStart');
    const endObj = document.getElementById('calcEnd');
    if (!startObj || !endObj) return;

    const startStr = startObj.value;
    const endStr = endObj.value;

    if (!startStr || !endStr) {
        showToast('Please select both start and end dates', 'warning');
        return;
    }

    const startD = parseLocalDate(startStr); startD.setHours(0,0,0,0);
    const endD = parseLocalDate(endStr); endD.setHours(23,59,59,999);

    if (startD > endD) {
        showToast('Start date cannot be after end date', 'warning');
        return;
    }

    let tOnline = 0, tCash = 0;

    dailyEntries.forEach(e => {
        const d = parseLocalDate(e.date);
        if (d >= startD && d <= endD) {
            tOnline += safeInt(e.online);
            tCash += safeInt(e.cash);
        }
    });

    const calendarDays = Math.round(Math.abs(endD - startD) / 86400000); 

    const total = tOnline + tCash;
    const res = document.getElementById('calcResult');
    res.style.display = 'block';
    res.innerHTML = `
        <div style="font-size:13px; color:var(--text2); margin-bottom:6px;">Calculated range: ${fmtDate(startD)} to ${fmtDate(endD)} (${calendarDays} days)</div>
        <div style="font-size:24px; font-weight:700; color:var(--green); margin-bottom:4px;">${fmtMoney(total)}</div>
        <div style="font-size:13px; font-weight:600; color:var(--text2);">Online: ${fmtMoney(tOnline)} <span style="margin:0 8px;opacity:0.3">|</span> Cash: ${fmtMoney(tCash)}</div>
    `;
}
