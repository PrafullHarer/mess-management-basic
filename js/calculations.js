/*
  calculations.js — Core Business Logic
  Plan detection, meal simulation, holiday parsing,
  student status determination.
*/

/* ===== KNOWN PLANS ===== */
const KNOWN_PLANS = [
    '1 Time Eve', '1 Time Aftr', '2 Time',
    '15 Days 1 Time Eve', '15 Days 1 Time Aftr', '15 Days 2 Time',
    '12 Time (W T F)'
];

// Regex to match custom N-day plan strings like "20 Days 1 Time Eve"
const CUSTOM_PLAN_REGEX = /^(\d+)\s*Days?\s+(1\s*Time\s*(Eve|Evg|Evening|Aftr|After|Afternoon)|2\s*Time)$/i;

function isCustomDayPlan(p) {
    if (!p) return false;
    return CUSTOM_PLAN_REGEX.test(p.trim());
}

function isUnusualPlan(p) {
    if (!p) return true;
    const plan = p.trim();
    if (KNOWN_PLANS.includes(plan)) return false;
    // Recognise custom N-day plans as valid
    if (isCustomDayPlan(plan)) return false;
    // Check regex/keyword matches if exact match fails
    if (isTwoTime(plan) || isEvening(plan) || isAfternoon(plan)) return false;
    if (/12\s*time/i.test(plan)) return false;
    return true;
}

/* ===== PLAN DETECTION ===== */
function isTwoTime(p) {
    if (!p) return false;
    const lc = p.toLowerCase().replace(/[\s-]+/g, '');
    return /(?<!\d)2time/i.test(lc) || lc.includes('twotime');
}

function isEvening(p) {
    if (!p) return false;
    const lc = p.toLowerCase();
    return (lc.includes('eve') || lc.includes('evg') || lc.includes('evening')) && !isTwoTime(p);
}

// Morning plans are treated as afternoon for holiday logic
function isAfternoon(p) {
    if (!p) return false;
    const lc = p.toLowerCase();
    return (lc.includes('aftr') || lc.includes('after') || lc.includes('afternoon') || lc.includes('morng') || lc.includes('morning')) && !isTwoTime(p);
}

function planDuration(p) {
    if (!p) return 28;
    // Match any "N Days" pattern (handles 15, 20, 10, etc.)
    const m = p.match(/(\d+)\s*days?/i);
    if (m) return parseInt(m[1], 10);
    return 28;
}

function totalMeals(p) {
    if (!p) return 28;
    if (/12\s*time/i.test(p)) return 12;
    const d = planDuration(p);
    return isTwoTime(p) ? d * 2 : d;
}

/* ===== MEAL SIMULATION ===== */
function simulatePlan(s, hols) {
    const tm = totalMeals(s.plan);
    const ms = /12\s*time/i.test(s.plan) || isUnusualPlan(s.plan);

    const sHols = [...(s.studentHolidays || [])];

    let consumedMeals = 0;
    let elapsedHols = 0;
    let remainingMeals = tm;
    let endD = new Date();

    if (!s.joiningDate || ms) {
        return { consumedMeals: 0, elapsedHols: 0, remainingMeals: tm, endDate: endD, history: [] };
    }

    const start = parseLocalDate(s.joiningDate);
    if (isNaN(start)) {
        return { consumedMeals: 0, elapsedHols: 0, remainingMeals: tm, endDate: endD, history: [] };
    }

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const mult = isTwoTime(s.plan) ? 2 : 1;
    const maxDays = 730;

    let currentD = new Date(start);
    let dayCount = 0;
    let pendingMealsToSimulate = tm;
    const history = [];

    while (pendingMealsToSimulate > 0 && dayCount < maxDays) {
        // Check which global holiday slots apply today
        const matchingGlobalHols = hols.filter(h => {
            const hd = parseLocalDate(h.date);
            return hd.getTime() === currentD.getTime() && holidayAffectsStudent(h, s.plan);
        });
        const isGlobalHol = matchingGlobalHols.length > 0;

        // For 2-time plans, determine if it's a full-day or partial-day global holiday
        let globalMealsSaved = 0;
        if (isGlobalHol && mult === 2) {
            const hasWholeDay = matchingGlobalHols.some(h => h.slot === 'Whole Day');
            if (hasWholeDay) {
                globalMealsSaved = 2; // whole day = skip both meals
            } else {
                // Count distinct slots affected
                const slots = new Set(matchingGlobalHols.map(h => h.slot));
                globalMealsSaved = Math.min(slots.size, 2);
            }
        } else if (isGlobalHol) {
            globalMealsSaved = mult; // 1-time plan: 1 meal saved
        }

        const dateNum = currentD.getDate();
        const isoStr = currentD.getFullYear() + '-' + String(currentD.getMonth() + 1).padStart(2, '0') + '-' + String(currentD.getDate()).padStart(2, '0');
        let personalIdx = sHols.indexOf(isoStr);
        if (personalIdx === -1) personalIdx = sHols.indexOf(dateNum);
        const isPersonalHol = personalIdx !== -1;

        if (isPersonalHol) {
            sHols.splice(personalIdx, 1);
        }

        const isHoliday = isGlobalHol || isPersonalHol;
        const isPast = currentD.getTime() < today.getTime();
        const isFirstDay = dayCount === 0;

        let mealsToday = Math.min(pendingMealsToSimulate, mult);
        // On first day, if joiningSlot is set and student is 2-time, count only remaining meals
        if (isFirstDay && mult === 2 && s.joiningSlot === 'Evening') {
            mealsToday = Math.min(pendingMealsToSimulate, 1);
        }

        const historyObj = {
            date: new Date(currentD),
            isHoliday, globalHol: isGlobalHol, personalHol: isPersonalHol,
            isEaten: false, isFuture: !isPast
        };

        if (isHoliday) {
            if (isPersonalHol) {
                // Personal holidays always skip all meals for the day
                historyObj.mealsConsumed = 0;
            } else {
                // Global: partial-day savings for 2-time plans
                const actualSaved = Math.min(globalMealsSaved, mealsToday);
                const consumed = mealsToday - actualSaved;
                historyObj.mealsConsumed = consumed;
                pendingMealsToSimulate -= consumed;
                if (isPast) {
                    historyObj.isEaten = consumed > 0;
                    consumedMeals += consumed;
                    remainingMeals -= consumed;
                }
            }
            if (isPast && isPersonalHol) elapsedHols++;
            else if (isPast && isGlobalHol && globalMealsSaved >= mult) elapsedHols++;
        } else {
            pendingMealsToSimulate -= mealsToday;
            historyObj.mealsConsumed = mealsToday;
            if (isPast) {
                historyObj.isEaten = true;
                consumedMeals += mealsToday;
                remainingMeals -= mealsToday;
            }
        }

        history.push(historyObj);
        currentD.setDate(currentD.getDate() + 1);
        dayCount++;
    }

    return {
        consumedMeals, elapsedHols,
        remainingMeals: Math.max(0, remainingMeals),
        endDate: currentD,
        history
    };
}

/* ===== HOLIDAY MATCHING ===== */
function holidayAffectsStudent(h, p) {
    if (!p) return h.slot === 'Whole Day';
    if (h.slot === 'Whole Day') return true;
    if (h.slot === 'Evening' && (isEvening(p) || isTwoTime(p))) return true;
    if (h.slot === 'Afternoon' && (isAfternoon(p) || isTwoTime(p))) return true;
    return false;
}

/* ===== PROXY FUNCTIONS ===== */
function totalHolidays(s, hols) {
    try {
        const sim = simulatePlan(s, hols);
        return sim.history.filter(h => h.isHoliday).length;
    } catch { return 0; }
}

function messEndDate(s, hols) {
    try {
        const sim = simulatePlan(s, hols);
        return sim.endDate;
    } catch { return new Date(); }
}

function remainingMeals(s, hols) {
    try {
        if (/12\s*time/i.test(s.plan)) return 12;
        const sim = simulatePlan(s, hols);
        return sim.remainingMeals;
    } catch { return 0; }
}

/* ===== STUDENT STATUS ===== */
function studentStatus(s, hols) {
    if (isUnusualPlan(s.plan)) {
        return { label: 'Unusual Plan', color: '#7c3aed', dot: '🟣' };
    }
    try {
        if (!s.joiningDate) return { label: 'No Date', color: '#6b7280', dot: '⚪' };
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const endD = messEndDate(s, hols);
        const pending = safeInt(s.amount) - safeInt(s.paid);
        const rem = remainingMeals(s, hols);
        const hasDues = safeInt(s.amount) > 0 && pending > 0;
        const isOver = today > endD;

        if (isOver && hasDues) return { label: 'Mess Over', color: '#dc2626', dot: '🔴', secondary: { label: `₹${pending} Due`, color: '#ca8a04' } };
        if (isOver) return { label: 'Mess Over', color: '#dc2626', dot: '🔴' };
        if (hasDues) return { label: 'Dues Pending', color: '#ca8a04', dot: '🟡' };

        const tmCheck = totalMeals(s.plan);
        const endingSoonThreshold = Math.max(3, Math.ceil(tmCheck * 0.18));
        if (rem <= endingSoonThreshold) return { label: 'Ending Soon', color: '#ea580c', dot: '🟠' };
        return { label: 'Active', color: '#16a34a', dot: '🟢' };
    } catch {
        return { label: 'Error', color: '#6b7280', dot: '⚪' };
    }
}

/* ===== HOLIDAY PARSING ===== */
function parseHolidays(str) {
    if (!str || !str.toString().trim()) return [];

    const raw = str.toString().split(',').map(s => s.trim()).filter(Boolean);
    const result = [];

    for (const p of raw) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(p)) {
            result.push(p);
        } else if (/^\d{1,2}-\d{1,2}$/.test(p)) {
            const [start, end] = p.split('-').map(Number);
            if (start >= 1 && start <= 31 && end >= 1 && end <= 31 && start <= end) {
                for (let i = start; i <= end; i++) result.push(i);
            }
        } else {
            const n = parseInt(p);
            if (!isNaN(n) && n >= 1 && n <= 31) {
                result.push(n);
            }
        }
    }

    return [...new Set(result)];
}

/* ===== BUSINESS INSIGHTS ===== */
function computeInsights() {
    const all = getUniqueStudents([...boys, ...girls]);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const currentMonth = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0');
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthStr = lastMonth.getFullYear() + '-' + String(lastMonth.getMonth() + 1).padStart(2, '0');

    // Revenue metrics
    const activeStudents = all.filter(s => studentStatus(s, holidays).label !== 'Mess Over');
    const totalAmount = activeStudents.reduce((a, s) => a + safeInt(s.amount), 0);
    const avgRevenuePerStudent = activeStudents.length > 0 ? Math.round(totalAmount / activeStudents.length) : 0;

    // Student lifecycle
    const newThisMonth = all.filter(s => s.joiningDate && s.joiningDate.startsWith(currentMonth)).length;
    const newLastMonth = all.filter(s => s.joiningDate && s.joiningDate.startsWith(lastMonthStr)).length;

    // Plan popularity
    const planCounts = {};
    all.forEach(s => {
        const p = s.plan || 'Unknown';
        planCounts[p] = (planCounts[p] || 0) + 1;
    });
    const planPopularity = Object.entries(planCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    // Diet split
    const vegCount = all.filter(s => !(s.diet || '').toLowerCase().includes('non')).length;
    const nonVegCount = all.length - vegCount;

    // Holiday stats
    const avgHolidays = all.length > 0
        ? (all.reduce((a, s) => a + (s.studentHolidays || []).length, 0) / all.length).toFixed(1)
        : '0';

    // Daily collection trend (last 7 entries)
    const sortedDates = [...new Set(dailyEntries.map(e => e.date))].sort().slice(-7);
    const dailyTrend = sortedDates.map(date => {
        const entries = dailyEntries.filter(e => e.date === date);
        const total = entries.reduce((a, e) => a + safeInt(e.online) + safeInt(e.cash), 0);
        return { date, total };
    });

    // Busiest slot
    const slotCounts = {};
    all.forEach(s => {
        if (isEvening(s.plan)) slotCounts['Evening'] = (slotCounts['Evening'] || 0) + 1;
        else if (isAfternoon(s.plan)) slotCounts['Afternoon'] = (slotCounts['Afternoon'] || 0) + 1;
        else if (isTwoTime(s.plan)) slotCounts['2 Time'] = (slotCounts['2 Time'] || 0) + 1;
        else slotCounts['Other'] = (slotCounts['Other'] || 0) + 1;
    });
    const busiestSlot = Object.entries(slotCounts).sort((a, b) => b[1] - a[1])[0];

    return {
        avgRevenuePerStudent,
        newThisMonth, newLastMonth,
        planPopularity, vegCount, nonVegCount,
        avgHolidays, dailyTrend, busiestSlot
    };
}
