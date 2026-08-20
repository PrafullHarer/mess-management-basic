/*
  helpers.js — Utility Functions
  Toast notifications, date formatting, HTML escaping,
  config storage, search, and theme management.
*/

/* ===== TOAST ===== */
function showToast(msg, type = 'success') {
    const c = document.getElementById('toastContainer');
    while (c.children.length >= 5) c.removeChild(c.firstChild);
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    const icons = { success: '✓', error: '✕', warning: '!' };
    t.innerHTML = `<strong>${icons[type] || '·'}</strong> ${escapeHtml(msg)}`;
    c.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 300); }, 3000);
}

/* ===== LOADING ===== */
function showLoading() { document.getElementById('loadingOverlay').classList.remove('hidden'); }
function hideLoading() { document.getElementById('loadingOverlay').classList.add('hidden'); }

/* ===== SAFE INT ===== */
function safeInt(v) { const n = parseInt(v); return isNaN(n) ? 0 : n; }

/* ===== HTML ESCAPE ===== */
function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* ===== DATE HELPERS ===== */
// Parse date strings as local midnight to avoid UTC timezone mismatch
function parseLocalDate(dateStr) {
    if (!dateStr) return new Date(NaN);
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return new Date(+parts[0], +parts[1] - 1, +parts[2]);
    }
    return new Date(dateStr);
}

function fmtDate(d) {
    try {
        const dt = typeof d === 'string' ? parseLocalDate(d) : d;
        if (!dt || isNaN(dt.getTime())) return '—';
        const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return dt.getDate() + ' ' + m[dt.getMonth()] + ' ' + dt.getFullYear();
    } catch { return '—'; }
}

function fmtMoney(v) {
    return '₹' + safeInt(v).toLocaleString('en-IN');
}

function getLocalTodayStr() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

/* ===== CONFIG (localStorage) ===== */
const CONFIG_KEY = 'messConfig';

const DEFAULT_WELCOME_TEMPLATE = `Welcome to {mess_name} 🙏🍽️

📅 Joining Date: {joining_date}
⏰ Mess Type: {plan}
💰 Total Amount: ₹{amount}
✅ Paid: ₹{paid}
⏳ Pending: ₹{pending}

Thank you for joining {mess_name}. We're happy to serve you 😊

Please save this number so you can click the link below to join our WhatsApp group for updates:
{group_link}

For any help, feel free to contact us 📞`;

const DEFAULT_PAYMENT_TEMPLATE = `Hi {name}, this is a gentle reminder that your mess payment is pending.

Joining Date: {joining_date}
Holidays: {holidays}
Amount Paid: ₹{paid}
Amount Pending: ₹{pending}

Please save this number first and then click on the link below to do the payment and share the screenshot on the same number:
{upi_link}

Or pay directly to this UPI ID (for iOS users):
{upi_id}

Thank you`;

const DEFAULT_RENEWAL_TEMPLATE = `Hey {name}, your mess has been over, kindly renew the mess by making the payment and sharing confirmation with us. Here are your records:

Previous joining date: {prev_joining_date}
Holidays: {holidays} (global+personal)
Mess end date: {end_date}
New joining date: {new_joining_date}
Amount: {amount}
Paid: {paid}
Pending: ₹{pending}

{upi_link}`;

function getConfig() {
    const defaults = {
        messName: 'Sagar Mess',
        upiId: 'gpay-12196572109@okbizaxis',
        boysGroupLink: 'https://chat.whatsapp.com/JhszVYSiUyP7IHUrC1scwY?mode=gi_t',
        girlsGroupLink: 'https://chat.whatsapp.com/IGRFOwVvwXf4e17WKmltUZ?mode=gi_t',
        welcomeTemplate: DEFAULT_WELCOME_TEMPLATE,
        paymentTemplate: DEFAULT_PAYMENT_TEMPLATE,
        renewalTemplate: DEFAULT_RENEWAL_TEMPLATE
    };
    try {
        const stored = JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}');

        const OLD_WELCOME_TEMPLATE = `Welcome to {mess_name} 🙏🍽️

📅 Joining Date: {joining_date}
⏰ Mess Type: {plan}
💰 Total Amount: ₹{amount}
✅ Paid: ₹{paid}
⏳ Pending: ₹{pending}

Thank you for joining {mess_name}. We're happy to serve you 😊
For any help, feel free to contact us 📞`;

        if (stored.welcomeTemplate === OLD_WELCOME_TEMPLATE) {
            stored.welcomeTemplate = DEFAULT_WELCOME_TEMPLATE;
            localStorage.setItem(CONFIG_KEY, JSON.stringify(stored));
        }
        const OLD_RENEWAL_TEMPLATE = `Hi {name}, your mess subscription has been renewed! 🎉

📅 Previous Joining Date: {prev_joining_date}
📅 New Joining Date: {joining_date}
🏖️ Holidays Taken: {holidays}
📆 Mess End Date: {end_date}
⏰ Plan: {plan}
💰 Amount: ₹{amount}
✅ Paid: ₹{paid}
⏳ Pending: ₹{pending}

Thank you for continuing with {mess_name}! 😊`;

        if (stored.renewalTemplate === OLD_RENEWAL_TEMPLATE || stored.renewalTemplate === OLD_RENEWAL_TEMPLATE.replace('📆', '⏳')) {
            stored.renewalTemplate = DEFAULT_RENEWAL_TEMPLATE;
            localStorage.setItem(CONFIG_KEY, JSON.stringify(stored));
        }

        return { ...defaults, ...stored };
    } catch {
        return defaults;
    }
}
function saveConfig(cfg) {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
    closeModal();
    showToast('Settings saved');
}

function fillTemplate(template, vars) {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
        return vars[key] !== undefined ? vars[key] : match;
    });
}

/* ===== DEDUPLICATION ===== */
// Return only the latest subscription per unique student (by normalized name)
function getUniqueStudents(arr) {
    const map = {};
    arr.forEach(s => {
        const key = (s.name || '').toLowerCase().replace(/\s+/g, '');
        if (!key) return;
        if (!map[key] || new Date(s.joiningDate || 0) > new Date(map[key].joiningDate || 0)) {
            map[key] = s;
        }
    });
    return Object.values(map);
}

/* ===== SEARCH ===== */
let searchDebounceTimer = null;
function onSearchInput(field, value) {
    if (field === 'boys') boysSearch = value;
    else girlsSearch = value;
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => render(), 180);
}

let dailySummaryCollapsed = false;

/* ===== THEME ===== */
function toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? '' : 'dark');
    document.getElementById('themeSun').style.display = isDark ? 'none' : 'block';
    document.getElementById('themeMoon').style.display = isDark ? 'block' : 'none';
    localStorage.setItem('messTheme', isDark ? 'light' : 'dark');
}
(function () {
    const t = localStorage.getItem('messTheme');
    if (t === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.getElementById('themeSun').style.display = 'block';
        document.getElementById('themeMoon').style.display = 'none';
    }
})();

/* ===== ONLINE/OFFLINE ===== */
window.addEventListener('online', () => showToast('Back online', 'success'));
window.addEventListener('offline', () => showToast('You are offline — changes will not save', 'warning'));
