/*
  ui.js — UI Framework
  Tab switching, modal system, confirm dialogs,
  overlay handling, and FAB button.
*/

/* ===== TAB SWITCHING ===== */
function switchTab(t) {
    currentTab = t;
    document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
    document.getElementById('tab' + t).classList.add('active');
    document.querySelectorAll('.nav-item').forEach((el, i) => {
        el.classList.toggle('active', ['Dashboard', 'Boys', 'Girls', 'Holidays', 'Daily'][i] === t);
    });
    document.getElementById('fabBtn').style.display = (t === 'Dashboard' || t === 'Logs') ? 'none' : 'flex';
    render();
}

/* ===== MODAL SYSTEM ===== */
let modalDirty = false;

document.getElementById('overlay').addEventListener('click', () => {
    tryCloseModal();
});

function openModal(html) {
    document.getElementById('modal').innerHTML = '<div class="modal-handle"></div>' + html;
    setTimeout(() => {
        document.getElementById('overlay').classList.add('show');
        document.getElementById('modal').classList.add('show');
    }, 10);
}

function closeModal() {
    modalDirty = false;
    document.getElementById('overlay').classList.remove('show');
    document.getElementById('modal').classList.remove('show');
}

function tryCloseModal() {
    if (modalDirty) {
        openConfirmModal('You have unsaved changes. Discard?', closeModal);
        return;
    }
    closeModal();
}

/* ===== CONFIRM MODAL ===== */
function openConfirmModal(message, onConfirm, onCancel = null) {
    const html = `<h2>Confirm Action</h2>
    <div style="font-size:14px; text-align:center; padding:10px 0 20px 0; color:var(--text); line-height:1.5;">
        ${message}
    </div>
    <div style="display:flex; gap:12px; justify-content:center; margin-top:10px;">
        <button class="btn btn-secondary" id="confirmCancelBtn" style="flex:1;">Cancel</button>
        <button class="btn btn-danger" id="confirmOkBtn" style="flex:1; background:var(--red); color:#fff; border:none;">OK</button>
    </div>`;

    const currentModalHTML = document.getElementById('modal').innerHTML;
    const wasDirty = modalDirty;

    modalDirty = false;
    openModal(html);

    document.getElementById('confirmCancelBtn').onclick = () => {
        if (currentModalHTML.includes('id="mName"') || currentModalHTML.includes('id="hDate"') || currentModalHTML.includes('id="dDate"')) {
            document.getElementById('modal').innerHTML = currentModalHTML;
            modalDirty = wasDirty;
        } else {
            closeModal();
            modalDirty = wasDirty;
        }
        if (onCancel) onCancel();
    };

    document.getElementById('confirmOkBtn').onclick = () => {
        modalDirty = false;
        closeModal();
        if (onConfirm) setTimeout(onConfirm, 50);
    };
}

/* ===== WHATSAPP MODAL ===== */
/* ===== BATCH WHATSAPP REMINDERS ===== */
let batchList = [];
let batchIndex = 0;

function openBatchReminders(type) {
    const arr = type === 'boys' ? boys : girls;
    // Only students with pending dues (check total across ALL subscriptions)
    batchList = getUniqueStudents(arr).filter(s => {
        const key = (s.name || '').toLowerCase().replace(/\s+/g, '');
        const allSubs = arr.filter(x => (x.name || '').toLowerCase().replace(/\s+/g, '') === key);
        const totalPend = allSubs.reduce((acc, x) => acc + Math.max(0, safeInt(x.amount) - safeInt(x.paid)), 0);
        s._batchPending = totalPend;
        return totalPend > 0;
    }).sort((a, b) => b._batchPending - a._batchPending); // Sort by highest dues first

    if (batchList.length === 0) {
        showToast('No students with pending dues found', 'info');
        return;
    }

    batchIndex = 0;
    renderBatchStep(type);
}

function renderBatchStep(type) {
    if (batchIndex >= batchList.length) {
        showToast('Batch reminders completed!', 'success');
        closeModal();
        return;
    }

    const s = batchList[batchIndex];
    const arr = type === 'boys' ? boys : girls;
    const key = (s.name || '').toLowerCase().replace(/\s+/g, '');
    const allSubs = arr.filter(x => (x.name || '').toLowerCase().replace(/\s+/g, '') === key);
    const pend = allSubs.reduce((acc, x) => acc + Math.max(0, safeInt(x.amount) - safeInt(x.paid)), 0);
    const cfg = getConfig();
    const th = totalHolidays(s, holidays);
    const endD = messEndDate(s, holidays);
    const upiLink = `upi://pay?pa=${cfg.upiId}&pn=${encodeURIComponent(cfg.messName)}&am=${pend > 0 ? pend : ''}&cu=INR`;

    const vars = {
        name: s.name,
        mess_name: cfg.messName,
        joining_date: s.joiningDate ? fmtDate(s.joiningDate) : 'N/A',
        plan: s.plan || 'N/A',
        amount: safeInt(s.amount),
        paid: safeInt(s.paid),
        pending: pend,
        holidays: th,
        end_date: isNaN(endD.getTime()) ? 'N/A' : fmtDate(new Date(endD.getTime() - 86400000)),
        mobile: s.mobile,
        upi_link: upiLink,
        upi_id: cfg.upiId
    };

    const waMsg = fillTemplate(cfg.paymentTemplate, vars);
    const waUrl = `https://wa.me/91${s.mobile}?text=${encodeURIComponent(waMsg)}`;

    const html = `<h2>Reminder Assistant (${batchIndex + 1}/${batchList.length})</h2>
    <div style="background:var(--bg); padding:15px; border-radius:12px; border:1px solid var(--border); margin-bottom:16px;">
        <div style="font-size:18px; font-weight:700; color:var(--text); margin-bottom:4px;">${escapeHtml(s.name)}</div>
        <div style="font-size:14px; color:var(--text2); margin-bottom:12px;">Plan: ${s.plan} | Joined: ${vars.joining_date}</div>
        <div style="display:flex; justify-content:space-between; align-items:center; background:var(--card); padding:10px; border-radius:8px; border:1px solid var(--border);">
            <div style="font-size:13px; color:var(--text2);">Pending Due:</div>
            <div style="font-size:18px; font-weight:700; color:var(--red);">${fmtMoney(pend)}</div>
        </div>
    </div>
    <div style="display:flex; flex-direction:column; gap:10px;">
        <button class="btn btn-primary" style="background:#25D366;border:none;padding:14px;font-size:16px;font-weight:700;" 
            onclick="window.open('${waUrl}', '_blank'); batchIndex++; renderBatchStep('${type}')">
            Send & Open Next Student
        </button>
        <div style="display:flex; gap:10px;">
            <button class="btn btn-secondary" onclick="batchIndex++; renderBatchStep('${type}')" style="flex:1;">Skip</button>
            <button class="btn btn-secondary" onclick="closeModal()" style="flex:1;">Close</button>
        </div>
    </div>
    <div class="helper" style="margin-top:12px; text-align:center;">
        After clicking "Send", WhatsApp will open. Just hit Send there, then return here to see the next student automatically.
    </div>`;

    openModal(html);
}

function openWaModal(id, type) {
    const arr = type === 'boys' ? boys : girls;
    const s = arr.find(x => x.id === id);
    if (!s || !s.mobile) return;

    const pend = Math.max(0, safeInt(s.amount) - safeInt(s.paid));
    const cfg = getConfig();
    const th = totalHolidays(s, holidays);
    const endD = messEndDate(s, holidays);
    const upiLink = `upi://pay?pa=${cfg.upiId}&pn=${encodeURIComponent(cfg.messName)}&am=${pend > 0 ? pend : ''}&cu=INR`;

    // Find previous subscription for renewal message
    const key = s.name.toLowerCase().replace(/\s+/g, '');
    const allSubs = arr.filter(x => x.name.toLowerCase().replace(/\s+/g, '') === key)
        .sort((a, b) => new Date(b.joiningDate || 0) - new Date(a.joiningDate || 0));
    const prevSub = allSubs.length > 1 ? allSubs[1] : null;

    const vars = {
        name: s.name,
        mess_name: cfg.messName,
        joining_date: s.joiningDate ? fmtDate(s.joiningDate) : 'N/A',
        plan: s.plan || 'N/A',
        amount: safeInt(s.amount),
        paid: safeInt(s.paid),
        pending: pend,
        holidays: th,
        end_date: isNaN(endD.getTime()) ? 'N/A' : fmtDate(new Date(endD.getTime() - 86400000)),
        new_joining_date: isNaN(endD.getTime()) ? 'N/A' : fmtDate(endD),
        group_link: type === 'boys' ? cfg.boysGroupLink : cfg.girlsGroupLink,
        upi_link: upiLink,
        upi_id: cfg.upiId,
        prev_joining_date: s.joiningDate ? fmtDate(s.joiningDate) : 'N/A',
        mobile: s.mobile
    };

    const varsRenewal = { ...vars };
    varsRenewal.paid = 0;
    varsRenewal.pending = safeInt(s.amount);

    const waMsg1 = fillTemplate(cfg.welcomeTemplate, vars);
    const waMsg2 = fillTemplate(cfg.paymentTemplate, vars);
    const waMsg3 = fillTemplate(cfg.renewalTemplate, varsRenewal);

    const waUrl = (msg) => `https://wa.me/91${s.mobile}?text=${encodeURIComponent(msg)}`.replace(/'/g, "\\'");

    const waBtn = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.47 16.03l-2.09-1.04c-.38-.19-.83-.14-1.16.14l-1.09 1.09c-2.3-1.02-4.14-2.86-5.16-5.16l1.09-1.09c.28-.33.33-.78.14-1.16l-1.04-2.09A1 1 0 0 0 7.27 6H5.98a2 2 0 0 0-2 2.21A15.93 15.93 0 0 0 16 20.02a2 2 0 0 0 2.21-2.01v-1.29a1 1 0 0 0-.74-.98z"/></svg>`;

    const html = `<h2>WhatsApp ${escapeHtml(s.name)}</h2>
    <div style="margin-top:20px; display:flex; flex-direction:column; gap:12px;">
        <button class="btn btn-primary" style="background:#25D366;border:none;display:flex;align-items:center;justify-content:center;gap:8px"
           onclick="window.open('${waUrl(waMsg1)}', '_blank')">
           ${waBtn}
           Send Welcome Message
        </button>
        <button class="btn btn-primary" style="background:#25D366;border:none;display:flex;align-items:center;justify-content:center;gap:8px"
           onclick="window.open('${waUrl(waMsg2)}', '_blank')">
           ${waBtn}
           Send Payment Reminder (₹${pend})
        </button>
        <button class="btn btn-primary" style="background:#25D366;border:none;display:flex;align-items:center;justify-content:center;gap:8px"
           onclick="window.open('${waUrl(waMsg3)}', '_blank')">
           ${waBtn}
           Send Renewal Message
        </button>
    </div>
    <div style="margin-top:24px;text-align:center;">
        <button class="btn btn-secondary" onclick="closeModal()">Close</button>
    </div>`;

    openModal(html);
}

/* ===== DUES MODAL ===== */
let currentDuesSort = 'amount_high';

function renderDuesModalHtml(type) {
    const arr = type === 'boys' ? boys : girls;
    const seenNames = new Set();

    const activeDuesList = [];
    const messOverDuesList = [];
    const renewalNeedsList = [];

    [...arr].sort((a, b) => new Date(b.joiningDate || 0) - new Date(a.joiningDate || 0)).forEach(s => {
        const key = s.name.toLowerCase().replace(/\s+/g, '');
        if (!seenNames.has(key)) {
            seenNames.add(key);
            const allSubs = arr.filter(x => x.name.toLowerCase().replace(/\s+/g, '') === key);
            const pending = allSubs.reduce((acc, x) => acc + Math.max(0, safeInt(x.amount) - safeInt(x.paid)), 0);

            const st = studentStatus(s, holidays);
            const isUnusual = isUnusualPlan(s.plan) || /12\s*time/i.test(s.plan);
            const endD = !isUnusual ? messEndDate(s, holidays) : null;
            const rem = !isUnusual ? safeInt(remainingMeals(s, holidays)) : null;
            const tm = !isUnusual ? safeInt(totalMeals(s.plan)) : null;

            const item = {
                id: s.id, name: s.name, mobile: s.mobile, pending, stLabel: st.label, stColor: st.color,
                plan: s.plan || '—', joiningDate: s.joiningDate, endDate: endD, diet: s.diet,
                amount: safeInt(s.amount), paid: safeInt(s.paid),
                rem, tm, isUnusual
            };

            if (st.label === 'Mess Over') {
                if (pending > 0) messOverDuesList.push(item);
                else renewalNeedsList.push(item);
            } else {
                if (pending > 0) activeDuesList.push(item);
            }
        }
    });

    const sortByAmountOrName = (a, b) => currentDuesSort === 'amount_high' ? b.pending - a.pending : a.name.localeCompare(b.name);
    activeDuesList.sort(sortByAmountOrName);
    messOverDuesList.sort(sortByAmountOrName);
    renewalNeedsList.sort((a, b) => a.name.localeCompare(b.name));

    // Summary bar
    const allItems = [...messOverDuesList, ...activeDuesList, ...renewalNeedsList];
    const totalDue = allItems.reduce((a, s) => a + s.pending, 0);

    let bodyHtml = `
    <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; margin-bottom:12px; text-align:center;">
        <div style="background:var(--bg); padding:8px; border-radius:8px; border:1px solid var(--border);">
            <div style="font-size:10px; color:var(--text3); text-transform:uppercase;">Dues</div>
            <div style="font-size:18px; font-weight:700; color:var(--red);">${messOverDuesList.length + activeDuesList.length}</div>
        </div>
        <div style="background:var(--bg); padding:8px; border-radius:8px; border:1px solid var(--border);">
            <div style="font-size:10px; color:var(--text3); text-transform:uppercase;">Renewals</div>
            <div style="font-size:18px; font-weight:700; color:var(--primary);">${renewalNeedsList.length}</div>
        </div>
        <div style="background:var(--bg); padding:8px; border-radius:8px; border:1px solid var(--border);">
            <div style="font-size:10px; color:var(--text3); text-transform:uppercase;">Total Due</div>
            <div style="font-size:18px; font-weight:700; color:var(--red);">${fmtMoney(totalDue)}</div>
        </div>
    </div>
    <div style="display:flex; justify-content:flex-end; margin-bottom:8px;">
        <select class="search-bar" style="margin-bottom:0; width:auto; padding:0 10px; height:34px; font-size:12px;" onchange="currentDuesSort=this.value; document.getElementById('modal').innerHTML='<div class=\\'modal-handle\\'></div>' + renderDuesModalHtml('${type}');">
            <option value="amount_high" ${currentDuesSort === 'amount_high' ? 'selected' : ''}>Sort by Highest Dues</option>
            <option value="name" ${currentDuesSort === 'name' ? 'selected' : ''}>Sort Name A-Z</option>
        </select>
    </div>
    <div style="max-height: 55vh; overflow-y: auto; padding-right: 4px;">`;

    const renderSection = (title, list, badgeColor, badgeLabelPrefix) => {
        if (list.length === 0) return '';
        let sectionHtml = `<div style="font-size:13px; font-weight:700; color:var(--text2); text-transform:uppercase; letter-spacing:.5px; margin: 12px 0 8px 0;">${title} (${list.length})</div>`;

        list.forEach(s => {
            const waIcon = s.mobile ? `<svg data-action="wa" data-type="${type}" data-id="${s.id}" style="cursor:pointer; color:#25D366;" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.47 16.03l-2.09-1.04c-.38-.19-.83-.14-1.16.14l-1.09 1.09c-2.3-1.02-4.14-2.86-5.16-5.16l1.09-1.09c.28-.33.33-.78.14-1.16l-1.04-2.09A1 1 0 0 0 7.27 6H5.98a2 2 0 0 0-2 2.21A15.93 15.93 0 0 0 16 20.02a2 2 0 0 0 2.21-2.01v-1.29a1 1 0 0 0-.74-.98z"/></svg>` : '';

            const pct = (s.tm && s.tm > 0) ? Math.min(100, Math.round((s.rem / s.tm) * 100)) : 0;
            const pColor = pct > 40 ? 'var(--green)' : pct > 15 ? 'var(--orange)' : 'var(--red)';
            const dietLabel = (s.diet || '').toLowerCase().includes('non') ? 'NV' : 'V';
            const dietColor = dietLabel === 'NV' ? 'var(--orange)' : 'var(--green)';

            sectionHtml += `
            <div style="margin-bottom:8px; padding:12px; border:1px solid var(--border); border-radius:10px; background:var(--bg);">
                <!-- Header row -->
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
                    <div style="flex:1;">
                        <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                            <span style="font-weight:700; font-size:15px;">${escapeHtml(s.name)}</span>
                            <span style="font-size:11px; font-weight:600; color:${dietColor}; background:${dietColor}15; padding:1px 6px; border-radius:4px;">${dietLabel}</span>
                        </div>
                        <div style="font-size:12px; color:var(--text2); margin-top:2px;">
                            ${escapeHtml(s.plan)} · ${s.joiningDate ? fmtDate(s.joiningDate) : '—'}${s.endDate ? ' → ' + fmtDate(s.endDate) : ''}
                        </div>
                    </div>
                    <span class="badge" style="background:${badgeColor}15;color:${badgeColor}; font-size:10px; white-space:nowrap;">${s.stLabel}</span>
                </div>
                <!-- Money row -->
                <div style="display:flex; gap:10px; font-size:13px; padding:6px 8px; background:var(--surface2, var(--card)); border-radius:6px; margin-bottom:6px;">
                    <span>Amt ${fmtMoney(s.amount)}</span>
                    <span>Paid ${fmtMoney(s.paid)}</span>
                    <span style="color:${s.pending > 0 ? 'var(--red)' : 'var(--green)'}; font-weight:700;">Due ${fmtMoney(s.pending)}</span>
                </div>
                ${s.rem !== null ? `<div style="font-size:11px; color:var(--text3); margin-bottom:6px;">Meals: ${s.rem}/${s.tm} remaining</div>` : ''}
                <!-- Actions row -->
                <div style="display:flex; align-items:center; justify-content:space-between;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        ${s.mobile ? `<a href="tel:${s.mobile}" style="font-size:12px; color:var(--text2); text-decoration:none;">📞 ${s.mobile}</a>` : '<span style="font-size:11px;color:var(--text3)">No number</span>'}
                        ${waIcon}
                    </div>
                    <div style="display:flex; gap:6px;">
                        ${s.stLabel === 'Mess Over' && s.pending <= 0 ? `<button class="btn btn-secondary" style="padding:3px 10px; font-size:11px; color:var(--primary); border-color:var(--primary);" data-action="renew" data-type="${type}" data-id="${s.id}">Renew</button>` : ''}
                        <button class="btn btn-secondary" style="padding:3px 10px; font-size:11px;" data-action="edit" data-type="${type}" data-id="${s.id}">Edit</button>
                    </div>
                </div>
            </div>`;
        });
        return sectionHtml;
    };

    bodyHtml += renderSection('🚨 Mess Over & Dues Pending', messOverDuesList, 'var(--red)', 'Mess Over');
    bodyHtml += renderSection('🟠 Active & Dues Pending', activeDuesList, 'var(--orange)', 'Active');
    bodyHtml += renderSection('🔄 Needs Renewal', renewalNeedsList, 'var(--primary)', 'Mess Over');

    if (activeDuesList.length === 0 && messOverDuesList.length === 0 && renewalNeedsList.length === 0) {
        bodyHtml += `<div class="empty-state">Nothing to follow up on! 🎉</div>`;
    }

    bodyHtml += `</div>
    <div style="margin-top:16px; text-align:right;">
        <button class="btn btn-secondary" onclick="closeModal()">Close</button>
    </div>`;

    return `<h2>Action Needed (${type === 'boys' ? 'Boys' : 'Girls'})</h2>` + bodyHtml;
}

function openDuesModal(type) {
    currentDuesSort = 'amount_high';
    openModal(renderDuesModalHtml(type));
}

/* ===== FAB ===== */
function onFabClick() {
    if (currentTab === 'Boys') openStudentModal('boys');
    else if (currentTab === 'Girls') openStudentModal('girls');
    else if (currentTab === 'Holidays') openHolidayModal();
    else if (currentTab === 'Daily') openDailyModal();
}

/* ===== RENDER ROUTER ===== */
function render() {
    if (currentTab === 'Dashboard') renderDashboard();
    else if (currentTab === 'Boys') renderStudents('boys');
    else if (currentTab === 'Girls') renderStudents('girls');
    else if (currentTab === 'Holidays') renderHolidays();
    else if (currentTab === 'Daily') renderDaily();
    else if (currentTab === 'Logs') renderLogs();
}
